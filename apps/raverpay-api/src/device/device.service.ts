import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IpGeolocationService } from '../common/services/ip-geolocation.service';
import { Device } from '@prisma/client';

export interface DeviceInfo {
  deviceId: string; // Unique fingerprint from frontend
  deviceName: string; // e.g., "iPhone 13 Pro"
  deviceType: 'ios' | 'android' | 'web';
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  ipAddress: string;
  location?: string;
  userAgent?: string;
}

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);

  constructor(
    private prisma: PrismaService,
    private ipGeolocationService: IpGeolocationService,
  ) {}

  /**
   * Check if device is authorized for this user
   * Returns the device if authorized, null if new device needs verification
   */
  async checkDeviceAuthorization(
    userId: string,
    deviceInfo: DeviceInfo,
  ): Promise<{ authorized: boolean; device?: Device; requiresOtp: boolean }> {
    this.logger.log(
      `[DeviceCheck] Checking device ${deviceInfo.deviceId} for user ${userId}`,
    );

    // Check if this device exists for this user
    const existingDevice = await this.prisma.device.findFirst({
      where: {
        userId,
        deviceId: deviceInfo.deviceId,
      },
    });

    if (existingDevice) {
      // Device exists
      if (existingDevice.isVerified) {
        // Device is verified, allow login without OTP
        // Reactivate the device since user is logging back in
        this.logger.log(
          `[DeviceCheck] Device ${deviceInfo.deviceId} is verified, reactivating`,
        );

        // Reactivate device and update last activity
        await this.prisma.device.update({
          where: { id: existingDevice.id },
          data: {
            isActive: true,
            lastLoginAt: new Date(),
            lastActivityAt: new Date(),
            lastIpAddress: deviceInfo.ipAddress,
          },
        });

        // Return updated device
        const updatedDevice = await this.prisma.device.findUnique({
          where: { id: existingDevice.id },
        });

        return {
          authorized: true,
          device: updatedDevice!,
          requiresOtp: false,
        };
      } else {
        // Device exists but not verified
        this.logger.warn(
          `[DeviceCheck] Device ${deviceInfo.deviceId} exists but not verified`,
        );
        return {
          authorized: false,
          device: existingDevice,
          requiresOtp: true,
        };
      }
    }

    // New device - requires OTP verification
    this.logger.log(
      `[DeviceCheck] New device ${deviceInfo.deviceId} detected for user ${userId}`,
    );
    return {
      authorized: false,
      requiresOtp: true,
    };
  }

  /**
   * Register new device (creates inactive, unverified device)
   * This is called BEFORE OTP verification
   */
  async registerNewDevice(
    userId: string,
    deviceInfo: DeviceInfo,
  ): Promise<Device> {
    this.logger.log(
      `[RegisterDevice] Registering new device ${deviceInfo.deviceId} for user ${userId}`,
    );

    // Check if device already exists
    const existing = await this.prisma.device.findFirst({
      where: {
        userId,
        deviceId: deviceInfo.deviceId,
      },
    });

    if (existing) {
      this.logger.log(`[RegisterDevice] Device already exists, returning it`);
      return existing;
    }

    // Deactivate all other devices for this user (single device policy)
    await this.deactivateAllUserDevices(userId);

    // Get location from IP address if not already provided
    let location = deviceInfo.location;
    if (!location && deviceInfo.ipAddress) {
      const cityFromIp = this.ipGeolocationService.getCityFromIp(
        deviceInfo.ipAddress,
      );
      if (cityFromIp) {
        location = cityFromIp;
        this.logger.log(
          `[RegisterDevice] Resolved location from IP: ${cityFromIp}`,
        );
      }
    }

    // Create new device (inactive and unverified)
    const device = await this.prisma.device.create({
      data: {
        userId,
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName,
        deviceType: deviceInfo.deviceType,
        deviceModel: deviceInfo.deviceModel,
        osVersion: deviceInfo.osVersion,
        appVersion: deviceInfo.appVersion,
        ipAddress: deviceInfo.ipAddress,
        lastIpAddress: deviceInfo.ipAddress,
        location: location,
        userAgent: deviceInfo.userAgent,
        isActive: false, // Not active until verified
        isVerified: false,
        isTrusted: false,
        firstLoginAt: new Date(),
        lastLoginAt: new Date(),
        lastActivityAt: new Date(),
      },
    });

    this.logger.log(
      `[RegisterDevice] Device ${device.id} registered, waiting for OTP verification`,
    );
    return device;
  }

  /**
   * Verify device after OTP confirmation
   * This activates the device and logs out other devices
   */
  async verifyDevice(deviceId: string): Promise<Device> {
    this.logger.log(`[VerifyDevice] Verifying device ${deviceId}`);

    const device = await this.prisma.device.findUnique({
      where: { deviceId },
    });

    if (!device) {
      throw new BadRequestException('Device not found');
    }

    // Deactivate all other devices for this user
    await this.deactivateAllUserDevices(device.userId, deviceId);

    // Activate and verify this device
    const updatedDevice = await this.prisma.device.update({
      where: { id: device.id },
      data: {
        isActive: true,
        isVerified: true,
        verifiedAt: new Date(),
        lastLoginAt: new Date(),
        lastActivityAt: new Date(),
      },
    });

    // Revoke all refresh tokens except for this device
    // (We'll handle this in the auth service)

    this.logger.log(`[VerifyDevice] Device ${deviceId} verified and activated`);
    return updatedDevice;
  }

  /**
   * Deactivate all devices for a user except the specified device
   */
  async deactivateAllUserDevices(
    userId: string,
    exceptDeviceId?: string,
  ): Promise<void> {
    this.logger.log(
      `[DeactivateDevices] Deactivating all devices for user ${userId}`,
    );

    await this.prisma.device.updateMany({
      where: {
        userId,
        ...(exceptDeviceId && { deviceId: { not: exceptDeviceId } }),
      },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
      },
    });

    // Also revoke all refresh tokens for this user
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });

    this.logger.log(`[DeactivateDevices] All other devices deactivated`);
  }

  /**
   * Update device activity timestamp
   */
  async updateDeviceActivity(
    deviceId: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        lastActivityAt: new Date(),
        lastLoginAt: new Date(),
        ...(ipAddress && { lastIpAddress: ipAddress }),
      },
    });
  }

  /**
   * Get active device for user
   */
  async getActiveDevice(userId: string): Promise<Device | null> {
    return this.prisma.device.findFirst({
      where: {
        userId,
        isActive: true,
        isVerified: true,
      },
      orderBy: {
        lastActivityAt: 'desc',
      },
    });
  }

  /**
   * Get all devices for user
   */
  async getUserDevices(userId: string): Promise<Device[]> {
    return this.prisma.device.findMany({
      where: { userId },
      orderBy: {
        lastActivityAt: 'desc',
      },
    });
  }

  /**
   * Logout (deactivate) a specific device
   * Note: This only deactivates the device but keeps isVerified=true
   * so the device doesn't require OTP verification on next login
   */
  async logoutDevice(userId: string, deviceId: string): Promise<void> {
    this.logger.log(`[LogoutDevice] Logging out device ${deviceId}`);

    await this.prisma.device.updateMany({
      where: {
        userId,
        deviceId,
      },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        // Keep isVerified: true so device doesn't need OTP on next login
      },
    });

    // Revoke refresh tokens
    // (This will be handled in auth service to find tokens by device)
  }

  /**
   * Trust a device (skip OTP on future logins)
   */
  async trustDevice(userId: string, deviceId: string): Promise<Device> {
    const device = await this.prisma.device.findFirst({
      where: {
        userId,
        deviceId,
      },
    });

    if (!device) {
      throw new BadRequestException('Device not found');
    }

    return this.prisma.device.update({
      where: { id: device.id },
      data: {
        isTrusted: true,
      },
    });
  }

  /**
   * Get location from IP address (placeholder for IP geolocation service)
   */
  async getLocationFromIp(ipAddress: string): Promise<string> {
    // TODO: Integrate with IP geolocation service (ipapi.co, ipinfo.io, etc.)
    // For now, return a placeholder
    if (ipAddress.startsWith('127.') || ipAddress === 'localhost') {
      return 'Local Development';
    }
    return 'Lagos, Nigeria'; // Default placeholder
  }
}
