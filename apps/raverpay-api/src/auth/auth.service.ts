/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { VirtualAccountsService } from '../virtual-accounts/virtual-accounts.service';
import { RegisterDto, LoginDto } from './dto';
import * as argon2 from 'argon2';
import { randomUUID, randomInt } from 'crypto';
import { User, UserStatus } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { DeviceService, DeviceInfo } from '../device/device.service';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
import { IpGeolocationService } from '../common/services/ip-geolocation.service';
import { PostHogService } from '../common/analytics/posthog.service';
import { AuditService } from '../common/services/audit.service';
import {
  AuditAction,
  AuditStatus,
  AuditSeverity,
} from '../common/types/audit-log.types';
import { MfaEncryptionUtil } from '../utils/mfa-encryption.util';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { UserRole } from '@prisma/client';
import { isIPv4, isIPv6 } from 'net';
import { Address4, Address6 } from 'ip-address';

/**
 * Authentication Service
 *
 * Handles user registration, login, and token management
 * Uses Argon2 for password hashing (more secure than bcrypt)
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly virtualAccountsService: VirtualAccountsService,
    private readonly usersService: UsersService,
    private readonly deviceService: DeviceService,
    private readonly notificationDispatcher: NotificationDispatcherService,
    private readonly ipGeolocationService: IpGeolocationService,
    private readonly posthogService: PostHogService,
    private readonly auditService: AuditService,
    private readonly mfaEncryption: MfaEncryptionUtil,
  ) {}

  /**
   * Register a new user
   *
   * @param dto - Registration data (email, phone, password, name)
   * @returns User object and auth tokens
   */
  async register(dto: RegisterDto) {
    // Check if email already exists
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Check if phone already exists
    const existingPhone = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (existingPhone) {
      throw new ConflictException('Phone number already registered');
    }

    // Hash password with Argon2
    const hashedPassword = await this.hashPassword(dto.password);

    try {
      // Create user and wallet in a transaction (atomic operation)
      const user = await this.prisma.$transaction(async (tx) => {
        // Create user
        const newUser = await tx.user.create({
          data: {
            email: dto.email,
            phone: dto.phone,
            password: hashedPassword,
            firstName: dto.firstName,
            lastName: dto.lastName,
            status: UserStatus.PENDING_VERIFICATION,
          },
        });

        // Create NAIRA wallet for the user
        await tx.wallet.create({
          data: {
            userId: newUser.id,
            type: 'NAIRA',
            balance: 0,
            ledgerBalance: 0,
          },
        });

        return newUser;
      });

      this.logger.log(`New user registered: ${user.email}`);

      // Log registration audit
      await this.auditService.logAuth(AuditAction.USER_REGISTERED, user.id, {
        email: user.email,
        phoneNumber: user.phone,
        registrationMethod: 'EMAIL',
        firstName: user.firstName,
        lastName: user.lastName,
      });

      // Note: Email verification will be sent when user visits verification screen
      // This prevents duplicate sends and allows frontend to control timing

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        ...tokens,
      };
    } catch (error) {
      this.logger.error('Registration failed:', error);
      throw new BadRequestException('Registration failed. Please try again.');
    }
  }

  /**
   * Login user with device verification and account locking
   *
   * @param dto - Login credentials (email/phone and password)
   * @param deviceInfo - Device information for fingerprinting
   * @param ipAddress - IP address of the login request
   * @returns User object and auth tokens, or device verification required
   */
  async login(dto: LoginDto, deviceInfo?: DeviceInfo, ipAddress?: string) {
    // Find user by email or phone
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.identifier }, { phone: dto.identifier }],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is deleted
    if (user.deletedAt || user.status === UserStatus.DELETED) {
      throw new UnauthorizedException('This account does not exist.');
    }

    // Check if account is banned or suspended
    if (user.status === UserStatus.BANNED) {
      throw new UnauthorizedException(
        'Your account has been banned. Contact support.',
      );
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException(
        'Your account is suspended. Contact support.',
      );
    }
    if (user.status === UserStatus.PENDING_DELETION) {
      throw new UnauthorizedException(
        'Your account deletion request is being processed. You cannot login at this time.',
      );
    }

    // NEW: Check if account is locked
    if (user.status === UserStatus.LOCKED || user.lockedUntil) {
      const now = new Date();

      if (user.lockedUntil && user.lockedUntil > now) {
        const remainingMinutes = Math.ceil(
          (user.lockedUntil.getTime() - now.getTime()) / 60000,
        );

        throw new UnauthorizedException(
          `Your account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s) or reset your password.`,
        );
      } else if (user.lockedUntil && user.lockedUntil <= now) {
        // Lock expired, unlock the account
        await this.unlockAccount(user.id);
      }
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(
      user.password,
      dto.password,
    );

    if (!isPasswordValid) {
      // NEW: Handle failed login attempt
      await this.handleFailedLogin(user.id, ipAddress);

      // Log failed login attempt
      await this.auditService.logAuth(
        AuditAction.LOGIN_FAILED,
        user.id,
        {
          identifier: dto.identifier,
          reason: 'INVALID_PASSWORD',
          attemptCount: user.failedLoginAttempts + 1,
        },
        undefined,
        AuditStatus.FAILURE,
      );

      // Check if this was the 3rd failed attempt
      const updatedUser = await this.prisma.user.findUnique({
        where: { id: user.id },
      });

      if (updatedUser?.status === UserStatus.LOCKED) {
        throw new UnauthorizedException(
          'Your account has been locked due to multiple failed login attempts. Please try again in 30 minutes or reset your password.',
        );
      }

      throw new UnauthorizedException('Invalid credentials');
    }

    // Password is valid - reset failed attempts
    await this.resetFailedLoginAttempts(user.id);

    // Check if MFA is enabled for admin users
    const isAdmin =
      user.role === UserRole.ADMIN ||
      user.role === UserRole.SUPPORT ||
      user.role === UserRole.SUPER_ADMIN;

    // Check IP whitelist for admin users BEFORE MFA verification
    if (isAdmin) {
      if (!ipAddress || ipAddress === 'unknown') {
        this.logger.warn(
          `⚠️ IP address not detected for admin login: ${user.email}. This may indicate a proxy/load balancer configuration issue.`,
        );
        // Still allow login but log warning - IP whitelist check will be skipped
      } else {
        const isIpWhitelisted = await this.checkIpWhitelist(ipAddress, user.id);
        if (!isIpWhitelisted) {
          this.logger.warn(
            `🚫 Blocked admin login from non-whitelisted IP: ${ipAddress} for user: ${user.email}`,
          );

          await this.auditService.log({
            userId: user.id,
            action: AuditAction.IP_BLOCKED,
            resource: 'AUTH',
            status: AuditStatus.FAILURE,
            severity: AuditSeverity.HIGH,
            metadata: {
              blockedIp: ipAddress,
              attemptedRoute: '/auth/login',
              reason: 'IP_NOT_WHITELISTED',
              userEmail: user.email,
            },
          });

          throw new ForbiddenException(
            'Access denied: Your IP address is not whitelisted for admin access. Please contact support.',
          );
        } else {
          this.logger.log(
            `✅ IP whitelist check passed for admin: ${user.email} from IP: ${ipAddress}`,
          );
        }
      }
    }

    if (isAdmin && user.twoFactorEnabled && user.twoFactorSecret) {
      // MFA is enabled - generate temporary token for MFA verification
      // Include IP address in token for consistency check during MFA verification
      const tempToken = this.jwtService.sign(
        {
          sub: user.id,
          purpose: 'mfa-verification',
          email: user.email,
          ipAddress: ipAddress || 'unknown', // Include IP for consistency check
        },
        { expiresIn: '5m' }, // 5 minute expiry
      );

      // Log MFA required event
      await this.auditService.log({
        userId: user.id,
        action: AuditAction.MFA_REQUIRED,
        resource: 'AUTH',
        status: AuditStatus.SUCCESS,
        metadata: { ipAddress, deviceId: deviceInfo?.deviceId },
      });

      // Return MFA required response
      return {
        mfaRequired: true,
        tempToken,
        message: 'MFA verification required',
      };
    }

    // NEW: Device verification (if deviceInfo provided)
    let deviceId: string | undefined;

    if (deviceInfo) {
      const deviceCheck = await this.deviceService.checkDeviceAuthorization(
        user.id,
        deviceInfo,
      );

      // if (!deviceCheck.authorized) {
      //   // New device detected, register it
      //   const device = await this.deviceService.registerNewDevice(
      //     user.id,
      //     deviceInfo,
      //   );
      //   deviceId = device.deviceId;

      //   this.logger.log(
      //     `[Login] New device detected for ${user.email}, OTP verification required`,
      //   );

      //   // Generate device verification code
      //   const verificationCode = randomInt(100000, 999999).toString();

      //   // Store verification code with expiry
      //   const expiresAt = new Date();
      //   expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

      //   await this.prisma.systemConfig.upsert({
      //     where: { key: `device_verification_${user.id}_${device.deviceId}` },
      //     create: {
      //       key: `device_verification_${user.id}_${device.deviceId}`,
      //       value: JSON.stringify({
      //         code: verificationCode,
      //         expiresAt: expiresAt.toISOString(),
      //         attempts: 0,
      //         deviceId: device.deviceId,
      //         createdAt: new Date().toISOString(),
      //       }),
      //     },
      //     update: {
      //       value: JSON.stringify({
      //         code: verificationCode,
      //         expiresAt: expiresAt.toISOString(),
      //         attempts: 0,
      //         deviceId: device.deviceId,
      //         createdAt: new Date().toISOString(),
      //       }),
      //     },
      //   });

      //   // Send OTP notification via email and SMS
      //   this.notificationDispatcher
      //     .sendNotification({
      //       userId: user.id,
      //       eventType: 'device_verification_required',
      //       category: 'SECURITY',
      //       channels: ['EMAIL'],
      //       title: 'Device Verification Required',
      //       message: `Your verification code is ${verificationCode}. This code will expire in 10 minutes.`,
      //       data: {
      //         code: verificationCode,
      //         deviceName: deviceInfo.deviceName,
      //         deviceType: deviceInfo.deviceType,
      //         deviceModel: deviceInfo.deviceModel,
      //         osVersion: deviceInfo.osVersion,
      //         expiresIn: '10 minutes',
      //       },
      //     })
      //     .catch((error) => {
      //       this.logger.error(
      //         'Failed to send device verification notification',
      //         error,
      //       );
      //       // Don't fail the login flow if notification fails
      //     });

      //   // Return special response indicating OTP verification needed
      //   return {
      //     requiresDeviceVerification: true,
      //     deviceId: device.deviceId,
      //     message:
      //       'New device detected. Please verify with OTP sent to your email/phone.',
      //     user: {
      //       id: user.id,
      //       email: user.email,
      //       phone: user.phone,
      //       firstName: user.firstName,
      //       lastName: user.lastName,
      //     },
      //   };
      // }

      deviceId = deviceCheck.device?.deviceId;
    }

    // Update last login and IP address
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastSuccessfulLoginIp: ipAddress,
      },
    });

    this.logger.log(`User logged in: ${user.email}`);

    // Check if password change is required (for admin users without MFA)
    // This check happens BEFORE generating tokens
    if (isAdmin && user.mustChangePassword) {
      // Generate password-change token (15 minute expiry)
      const passwordChangeToken = this.jwtService.sign(
        {
          sub: user.id,
          purpose: 'password-change',
          email: user.email,
        },
        { expiresIn: '15m' },
      );

      // Remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = user;

      this.logger.log(
        `Password change required for admin user: ${user.email} (IP: ${ipAddress})`,
      );

      // Log password change required event
      await this.auditService.log({
        userId: user.id,
        action: AuditAction.PASSWORD_CHANGE_REQUIRED,
        resource: 'AUTH',
        status: AuditStatus.SUCCESS,
        severity: AuditSeverity.MEDIUM,
        metadata: {
          reason: 'FIRST_LOGIN',
          ipAddress,
        },
      });

      return {
        mustChangePassword: true,
        passwordChangeToken,
        message: 'Password change required on first login',
        user: userWithoutPassword,
        // DO NOT return tokens - user must change password first
      };
    }

    // Log successful login
    await this.auditService.logAuth(AuditAction.USER_LOGIN, user.id, {
      identifier: dto.identifier,
      loginMethod: user.twoFactorEnabled ? '2FA' : 'PASSWORD',
      deviceId: deviceId,
      deviceInfo: deviceInfo
        ? {
            deviceName: deviceInfo.deviceName,
            deviceType: deviceInfo.deviceType,
            deviceModel: deviceInfo.deviceModel,
          }
        : undefined,
    });

    // Generate tokens (only if password change is not required)
    const tokens = await this.generateTokens(user, deviceInfo, ipAddress);

    // Identify user in PostHog
    this.posthogService.identify(user.id, {
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      kycTier: user.kycTier,
      status: user.status,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      createdAt: user.createdAt.toISOString(),
    });

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;

    // Always get device info from database if deviceId is available (most reliable source)
    let finalDeviceInfo = deviceInfo;
    if (deviceId) {
      const device = await this.prisma.device.findUnique({
        where: { deviceId },
        select: {
          deviceId: true,
          deviceName: true,
          deviceType: true,
          deviceModel: true,
          osVersion: true,
          appVersion: true,
          ipAddress: true,
          lastIpAddress: true,
          location: true,
          userAgent: true,
        },
      });

      if (device) {
        // If device doesn't have location, try to resolve it from current IP
        let location = device.location;
        if (!location && ipAddress && this.ipGeolocationService.isAvailable()) {
          const cityFromIp = this.ipGeolocationService.getCityFromIp(ipAddress);
          if (cityFromIp) {
            location = cityFromIp;
            // Update device record with location for future use
            await this.prisma.device
              .update({
                where: { deviceId },
                data: { location: cityFromIp },
              })
              .catch((error) => {
                this.logger.warn(
                  `Failed to update device location: ${error instanceof Error ? error.message : 'Unknown error'}`,
                );
              });
            this.logger.log(
              `[Login] Resolved and stored location for device: ${cityFromIp}`,
            );
          }
        }

        // Use database device info as primary source (most up-to-date)
        finalDeviceInfo = {
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          deviceType: device.deviceType as 'ios' | 'android' | 'web',
          deviceModel: device.deviceModel || undefined,
          osVersion: device.osVersion || undefined,
          appVersion: device.appVersion || undefined,
          ipAddress:
            device.lastIpAddress || device.ipAddress || ipAddress || 'Unknown',
          location: location || undefined,
          userAgent: device.userAgent || undefined,
        };
      } else if (deviceInfo) {
        // Fallback to deviceInfo from request if device not found in database
        // Try to resolve location if not provided
        if (
          !deviceInfo.location &&
          ipAddress &&
          this.ipGeolocationService.isAvailable()
        ) {
          const cityFromIp = this.ipGeolocationService.getCityFromIp(ipAddress);
          if (cityFromIp) {
            finalDeviceInfo = {
              ...deviceInfo,
              location: cityFromIp,
            };
          } else {
            finalDeviceInfo = deviceInfo;
          }
        } else {
          finalDeviceInfo = deviceInfo;
        }
      }
    }

    // Send login notification email
    this.sendLoginNotification(user, finalDeviceInfo, ipAddress).catch(
      (error) => {
        this.logger.error('Failed to send login notification', error);
        // Don't fail the login flow if notification fails
      },
    );

    return {
      user: userWithoutPassword,
      deviceId,
      ...tokens,
    };
  }

  /**
   * Handle failed login attempt
   * Increments failed attempts and locks account after 3 failures
   */
  private async handleFailedLogin(
    userId: string,
    _ipAddress?: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return;

    const failedAttempts = user.failedLoginAttempts + 1;
    const now = new Date();

    if (failedAttempts >= 3) {
      // Lock account for 30 minutes
      const lockUntil = new Date(now.getTime() + 30 * 60 * 1000);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: failedAttempts,
          lastFailedLoginAt: now,
          status: UserStatus.LOCKED,
          lockedUntil: lockUntil,
        },
      });

      this.logger.warn(
        `[AccountLock] User ${user.email} locked after 3 failed attempts until ${lockUntil.toISOString()}`,
      );

      // Log account locked event
      await this.auditService.logSecurity(
        AuditAction.ACCOUNT_LOCKED,
        userId,
        {
          reason: 'MULTIPLE_FAILED_LOGINS',
          failedAttempts,
          lockDuration: '30 minutes',
          lockUntil: lockUntil.toISOString(),
        },
        undefined,
        'Account locked due to multiple failed login attempts',
      );

      // TODO: Send account locked email notification
    } else {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: failedAttempts,
          lastFailedLoginAt: now,
        },
      });

      this.logger.warn(
        `[FailedLogin] User ${user.email} failed login attempt ${failedAttempts}/3`,
      );
    }
  }

  /**
   * Reset failed login attempts after successful login
   */
  private async resetFailedLoginAttempts(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
      },
    });
  }

  /**
   * Unlock account after lock period expires
   */
  private async unlockAccount(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.ACTIVE,
        lockedUntil: null,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
      },
    });

    this.logger.log(`[AccountUnlock] Account ${userId} automatically unlocked`);

    // Log account unlock event
    await this.auditService.logAuth(AuditAction.ACCOUNT_UNLOCKED, userId, {
      reason: 'LOCK_PERIOD_EXPIRED',
      unlockedBy: 'SYSTEM',
    });
  }

  /**
   * Verify device with OTP after new device detected during login
   *
   * @param userId - User ID
   * @param deviceId - Device fingerprint ID
   * @param code - OTP code (from email or phone)
   * @returns Auth tokens after successful verification
   */
  async verifyDeviceLogin(
    userId: string,
    deviceId: string,
    code: string,
  ): Promise<any> {
    this.logger.log(
      `[DeviceVerify] Verifying device ${deviceId} for user ${userId}`,
    );

    // Get stored device verification code
    const storedData = await this.prisma.systemConfig.findUnique({
      where: { key: `device_verification_${userId}_${deviceId}` },
    });

    if (!storedData) {
      throw new BadRequestException(
        'No verification code found. Please try logging in again.',
      );
    }

    // Parse stored data
    let verificationData: {
      code: string;
      expiresAt: string;
      attempts: number;
      deviceId: string;
    };

    try {
      verificationData = JSON.parse(storedData.value as string) as {
        code: string;
        expiresAt: string;
        attempts: number;
        deviceId: string;
      };
    } catch {
      throw new BadRequestException('Invalid verification data');
    }

    // Check expiration
    if (new Date() > new Date(verificationData.expiresAt)) {
      // Delete expired code
      await this.prisma.systemConfig.delete({
        where: { key: `device_verification_${userId}_${deviceId}` },
      });
      throw new BadRequestException(
        'Verification code has expired. Please try logging in again.',
      );
    }

    // Check attempts (max 5 attempts)
    if (verificationData.attempts >= 5) {
      throw new BadRequestException(
        'Too many failed attempts. Please try logging in again to get a new code.',
      );
    }

    // Verify code
    if (verificationData.code !== code) {
      // Increment attempts
      await this.prisma.systemConfig.update({
        where: { key: `device_verification_${userId}_${deviceId}` },
        data: {
          value: JSON.stringify({
            ...verificationData,
            attempts: verificationData.attempts + 1,
          }),
        },
      });

      throw new UnauthorizedException('Invalid verification code');
    }

    // Code verified - delete the verification code
    await this.prisma.systemConfig.delete({
      where: { key: `device_verification_${userId}_${deviceId}` },
    });

    this.logger.log(
      `[DeviceVerify] Device verification code verified successfully`,
    );

    // OTP verified, now activate the device
    const device = await this.deviceService.verifyDevice(deviceId);

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;

    this.logger.log(`[DeviceVerify] Device ${deviceId} verified and activated`);

    // Send login notification email with device info
    const deviceInfoForNotification: DeviceInfo = {
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      deviceType: device.deviceType as 'ios' | 'android' | 'web',
      deviceModel: device.deviceModel || undefined,
      osVersion: device.osVersion || undefined,
      appVersion: device.appVersion || undefined,
      ipAddress: device.lastIpAddress || device.ipAddress,
      location: device.location || undefined,
      userAgent: device.userAgent || undefined,
    };

    this.sendLoginNotification(
      user,
      deviceInfoForNotification,
      device.lastIpAddress || device.ipAddress,
    ).catch((error) => {
      this.logger.error(
        'Failed to send login notification after device verification',
        error,
      );
      // Don't fail the login flow if notification fails
    });

    return {
      user: userWithoutPassword,
      deviceId: device.deviceId,
      ...tokens,
    };
  }

  /**
   * Refresh access token using refresh token
   *
   * @param refreshToken - Valid refresh token
   * @returns New access token and refresh token
   */
  async refreshTokens(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify<{ sub: string }>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      // Check if token exists and is not revoked
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (!storedToken || storedToken.isRevoked) {
        throw new UnauthorizedException('Refresh token revoked');
      }

      // Check if token is expired
      if (storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token expired');
      }

      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Revoke old refresh token
      await this.prisma.refreshToken.update({
        where: { token: refreshToken },
        data: { isRevoked: true },
      });

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Validate user by ID (used by JWT strategy)
   *
   * @param userId - User ID from JWT payload
   * @returns User object without password
   */
  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check account status
    if (
      user.deletedAt ||
      user.status === UserStatus.DELETED ||
      user.status === UserStatus.BANNED ||
      user.status === UserStatus.SUSPENDED ||
      user.status === UserStatus.PENDING_DELETION
    ) {
      throw new UnauthorizedException('Account is not active');
    }

    // Remove password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Generate JWT access and refresh tokens
   *
   * @param user - User object
   * @returns Access token and refresh token
   */
  private async generateTokens(
    user: User,
    deviceInfo?: DeviceInfo,
    ipAddress?: string,
  ) {
    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      // Access token (30 minutes)
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: '30m',
      }),
      // Refresh token (7 days) - includes unique jti to prevent duplicate token conflicts
      this.jwtService.signAsync(
        { ...payload, jti: randomUUID() },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: '7d',
        },
      ),
    ]);

    // Get location from IP if available
    let location: string | undefined;
    if (ipAddress && this.ipGeolocationService.isAvailable()) {
      location =
        this.ipGeolocationService.getCityFromIp(ipAddress) || undefined;
    }

    // Check for concurrent session limits for admins
    const isAdmin =
      user.role === UserRole.ADMIN ||
      user.role === UserRole.SUPPORT ||
      user.role === UserRole.SUPER_ADMIN;

    if (isAdmin) {
      // Check active sessions count
      const activeSessions = await this.prisma.refreshToken.count({
        where: {
          userId: user.id,
          isRevoked: false,
          expiresAt: { gt: new Date() },
        },
      });

      // Max 3 concurrent sessions for admins
      if (activeSessions >= 3) {
        // Revoke oldest session
        const oldestSession = await this.prisma.refreshToken.findFirst({
          where: {
            userId: user.id,
            isRevoked: false,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: 'asc' },
        });

        if (oldestSession) {
          await this.prisma.refreshToken.update({
            where: { id: oldestSession.id },
            data: { isRevoked: true },
          });

          await this.auditService.log({
            userId: user.id,
            action: AuditAction.TOKEN_REFRESHED,
            resource: 'SESSION',
            metadata: { revokedSessionId: oldestSession.id },
          });
        }
      }
    }

    // Store refresh token in database with session info
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        deviceId: deviceInfo?.deviceId,
        ipAddress,
        location,
        userAgent: deviceInfo?.userAgent,
        lastUsedAt: new Date(),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 1800, // 30 minutes in seconds
    };
  }

  /**
   * Get all active sessions for a user
   *
   * @param userId - User ID
   * @returns Array of active sessions
   */
  async getSessions(userId: string) {
    const sessions = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        deviceId: true,
        ipAddress: true,
        location: true,
        userAgent: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return sessions;
  }

  /**
   * Revoke a specific session
   *
   * @param userId - User ID
   * @param sessionId - Session ID
   * @returns Success message
   */
  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.refreshToken.findFirst({
      where: {
        id: sessionId,
        userId,
        isRevoked: false,
      },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    await this.prisma.refreshToken.update({
      where: { id: sessionId },
      data: { isRevoked: true },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.USER_LOGOUT,
      resource: 'SESSION',
      resourceId: sessionId,
      status: AuditStatus.SUCCESS,
    });

    return { success: true, message: 'Session revoked successfully' };
  }

  /**
   * Revoke all sessions except current one
   *
   * @param userId - User ID
   * @param currentToken - Current refresh token to keep
   * @returns Success message
   */
  async revokeAllSessions(userId: string, currentToken?: string) {
    const whereClause: any = {
      userId,
      isRevoked: false,
    };

    if (currentToken) {
      const currentSession = await this.prisma.refreshToken.findUnique({
        where: { token: currentToken },
      });

      if (currentSession && currentSession.userId === userId) {
        whereClause.id = { not: currentSession.id };
      }
    }

    await this.prisma.refreshToken.updateMany({
      where: whereClause,
      data: { isRevoked: true },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.USER_LOGOUT,
      resource: 'SESSION',
      status: AuditStatus.SUCCESS,
      metadata: { logoutType: 'ALL_SESSIONS' },
    });

    return { success: true, message: 'All sessions revoked successfully' };
  }

  /**
   * Hash password using Argon2
   *
   * @param password - Plain text password
   * @returns Hashed password
   */
  private async hashPassword(password: string): Promise<string> {
    return argon2.hash(password);
  }

  /**
   * Verify password against hash
   *
   * @param hash - Hashed password from database
   * @param password - Plain text password to verify
   * @returns True if password matches
   */
  /**
   * Check if IP address is whitelisted for admin user
   * Used during login to prevent unauthorized access
   * Checks grace period first, then whitelist entries
   */
  private async checkIpWhitelist(
    clientIp: string,
    userId: string,
  ): Promise<boolean> {
    // Check grace period first (for new admins)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ipWhitelistGracePeriodUntil: true },
    });

    if (
      user?.ipWhitelistGracePeriodUntil &&
      new Date() < user.ipWhitelistGracePeriodUntil
    ) {
      // Still within grace period - allow access
      return true;
    }

    // Check expired entries (expiresAt < now) and exclude them
    const now = new Date();
    const whitelistEntries = await this.prisma.adminIpWhitelist.findMany({
      where: {
        AND: [
          { isActive: true },
          {
            OR: [{ userId: null }, { userId: userId }], // Global whitelist or user-specific
          },
          {
            OR: [
              { expiresAt: null }, // Permanent entries
              { expiresAt: { gt: now } }, // Not expired yet
            ],
          },
        ],
      },
    });

    // Check each entry
    for (const entry of whitelistEntries) {
      if (this.matchesIpOrCidr(clientIp, entry.ipAddress)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if client IP matches whitelist entry (supports CIDR)
   */
  private matchesIpOrCidr(clientIp: string, whitelistEntry: string): boolean {
    // Check if exact match
    if (clientIp === whitelistEntry) {
      return true;
    }

    // Check if CIDR notation
    if (whitelistEntry.includes('/')) {
      try {
        // IPv4 CIDR check
        if (isIPv4(clientIp)) {
          const networkAddress = new Address4(whitelistEntry);
          const clientAddress = new Address4(clientIp);
          return clientAddress.isInSubnet(networkAddress);
        }

        // IPv6 CIDR check
        if (isIPv6(clientIp)) {
          const networkAddress = new Address6(whitelistEntry);
          const clientAddress = new Address6(clientIp);
          return clientAddress.isInSubnet(networkAddress);
        }
      } catch (error) {
        this.logger.error(`Invalid CIDR notation: ${whitelistEntry}`, error);
        return false;
      }
    }

    return false;
  }

  private async verifyPassword(
    hash: string,
    password: string,
  ): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /**
   * Initiate password reset process
   *
   * @param email - User's email address
   * @returns Success message
   */
  async forgotPassword(email: string) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Don't reveal if user exists (security best practice)
    if (!user) {
      return {
        success: true,
        message:
          'If an account exists with this email, a reset code has been sent',
      };
    }

    // Generate 6-digit code
    const resetCode = randomInt(100000, 999999).toString();

    // Store in SystemConfig (same pattern as email verification)
    await this.prisma.systemConfig.upsert({
      where: { key: `password_reset_${user.id}` },
      create: {
        key: `password_reset_${user.id}`,
        value: {
          code: resetCode,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          attempts: 0,
        },
      },
      update: {
        value: {
          code: resetCode,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          attempts: 0,
        },
      },
    });

    // Send email via users service
    this.usersService
      .sendPasswordResetEmail(user.id, resetCode)
      .catch((error) => {
        this.logger.error(
          `Failed to send password reset email for ${user.email}`,
          error,
        );
      });

    this.logger.log(`Password reset requested for: ${user.email}`);

    return {
      success: true,
      message:
        'If an account exists with this email, a reset code has been sent',
    };
  }

  /**
   * Verify password reset code
   *
   * @param email - User's email address
   * @param code - 6-digit verification code
   * @returns Reset token (JWT valid for 15 minutes)
   */
  async verifyResetCode(email: string, code: string) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    // Get stored code
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: `password_reset_${user.id}` },
    });

    if (!config) {
      throw new BadRequestException('No reset request found');
    }

    const storedData = config.value as any;

    // Check expiry
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    if (new Date(storedData.expiresAt) < new Date()) {
      await this.prisma.systemConfig.delete({
        where: { key: `password_reset_${user.id}` },
      });
      throw new BadRequestException('Reset code expired');
    }

    // Check attempts
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (storedData.attempts >= 5) {
      throw new BadRequestException('Too many failed attempts');
    }

    // Verify code
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (storedData.code !== code) {
      // Increment attempts
      await this.prisma.systemConfig.update({
        where: { key: `password_reset_${user.id}` },
        data: {
          value: {
            ...storedData,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            attempts: storedData.attempts + 1,
          },
        },
      });
      throw new BadRequestException('Invalid reset code');
    }

    // Generate reset token (short-lived JWT)
    const resetToken = await this.jwtService.signAsync(
      { sub: user.id, type: 'password_reset' },
      { secret: process.env.JWT_SECRET, expiresIn: '15m' },
    );

    // Delete code (single use)
    await this.prisma.systemConfig.delete({
      where: { key: `password_reset_${user.id}` },
    });

    this.logger.log(`Password reset code verified for: ${user.email}`);

    return { success: true, resetToken };
  }

  /**
   * Reset password using reset token
   *
   * @param resetToken - JWT token from verifyResetCode
   * @param newPassword - New password
   * @returns Success message
   */
  async resetPassword(resetToken: string, newPassword: string) {
    // Verify reset token
    let payload: any;
    try {
      payload = this.jwtService.verify(resetToken, {
        secret: process.env.JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Check token type
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (payload.type !== 'password_reset') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Validate new password (same rules as registration)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      throw new BadRequestException(
        'Password must be at least 8 characters with uppercase, lowercase, and number/special character',
      );
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update password and timestamp

    await this.prisma.user.update({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      where: { id: payload.sub },
      data: {
        password: hashedPassword,
        passwordResetAt: new Date(),
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    this.logger.log(`Password reset completed for user: ${payload.sub}`);

    // Log password reset completion
    await this.auditService.logAuth(
      AuditAction.PASSWORD_RESET_COMPLETED,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      payload.sub as string,
      {
        resetMethod: 'TOKEN',
      },
    );

    return { success: true, message: 'Password reset successfully' };
  }

  /**
   * Send login notification email to user
   * Rate limited to once per 24 hours
   *
   * @param user - User object
   * @param deviceInfo - Device information (optional)
   * @param ipAddress - IP address of the login
   */
  private async sendLoginNotification(
    user: User,
    deviceInfo?: DeviceInfo,
    ipAddress?: string,
  ): Promise<void> {
    const now = new Date();

    // Check rate limit: only send if last email was sent more than 24 hours ago
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const lastEmailSentAt = (user as any).lastLoginEmailSentAt as
      | Date
      | null
      | undefined;
    if (lastEmailSentAt) {
      const hoursSinceLastEmail =
        (now.getTime() - lastEmailSentAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastEmail < 24) {
        this.logger.log(
          `[LoginNotification] Skipping email for ${user.email} - last sent ${hoursSinceLastEmail.toFixed(1)} hours ago`,
        );
        return;
      }
    }

    // Format date separately
    const date = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(now);

    // Format time separately
    const time = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    }).format(now);

    // Build device information string
    let deviceDetails = 'Unknown device';
    if (deviceInfo) {
      const parts: string[] = [];
      if (deviceInfo.deviceName) parts.push(deviceInfo.deviceName);
      if (
        deviceInfo.deviceModel &&
        deviceInfo.deviceModel !== deviceInfo.deviceName
      ) {
        parts.push(`(${deviceInfo.deviceModel})`);
      }
      if (deviceInfo.osVersion) parts.push(`- ${deviceInfo.osVersion}`);
      if (deviceInfo.deviceType) {
        const deviceTypeLabel = deviceInfo.deviceType.toUpperCase();
        parts.push(`(${deviceTypeLabel})`);
      }
      deviceDetails = parts.length > 0 ? parts.join(' ') : 'Unknown device';
    }

    // Build simple message without repeating details
    const message =
      `You successfully logged into Raverpay.\n\n` +
      `If you did not make this login attempt, please contact our support team immediately and change your password.`;

    // Send notification
    await this.notificationDispatcher.sendNotification({
      userId: user.id,
      eventType: 'login_successful',
      category: 'SECURITY',
      channels: ['EMAIL', 'IN_APP'],
      title: 'Successful Login to Raverpay',
      message,
      data: {
        date,
        time,
        device: deviceDetails,
        ipAddress: ipAddress || 'Unknown',
        location: deviceInfo?.location || null,
      },
    });

    // Update lastLoginEmailSentAt timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginEmailSentAt: now } as any,
    });

    this.logger.log(
      `[LoginNotification] Email sent to ${user.email} and timestamp updated`,
    );
  }

  /**
   * Logout user by revoking their refresh token and deactivating devices
   *
   * @param userId - User ID from JWT
   * @param refreshToken - Refresh token to revoke (optional - revokes all if not provided)
   * @returns Success message
   */
  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      // Revoke specific refresh token
      const token = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (token && token.userId === userId) {
        await this.prisma.refreshToken.update({
          where: { token: refreshToken },
          data: { isRevoked: true },
        });
        this.logger.log(`User logged out: ${userId} (single session)`);
      }
    } else {
      // Revoke all active refresh tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          isRevoked: false,
        },
        data: { isRevoked: true },
      });
      this.logger.log(`User logged out: ${userId} (all sessions)`);

      // Log logout event
      await this.auditService.logAuth(AuditAction.USER_LOGOUT, userId, {
        logoutType: refreshToken ? 'SINGLE_SESSION' : 'ALL_SESSIONS',
      });
    }

    // Deactivate all user devices but keep them verified
    // This ensures devices don't need OTP verification on next login
    await this.prisma.device.updateMany({
      where: { userId },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        // isVerified stays true so no OTP needed on next login
      },
    });

    return { success: true, message: 'Logged out successfully' };
  }

  /**
   * Setup MFA for admin user
   * Generates secret, QR code, and backup codes
   *
   * @param userId - User ID
   * @returns QR code data URL and backup codes
   */
  async setupMfa(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if user is admin
    const isAdmin =
      user.role === UserRole.ADMIN ||
      user.role === UserRole.SUPPORT ||
      user.role === UserRole.SUPER_ADMIN;

    if (!isAdmin) {
      throw new UnauthorizedException('MFA is only available for admin users');
    }

    // Check if MFA is already enabled
    if (user.twoFactorEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `RaverPay:${user.email}`,
      issuer: 'RaverPay',
      length: 32,
    });

    // Generate backup codes (10 codes, 8 characters each)
    const backupCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = randomInt(10000000, 99999999).toString();
      backupCodes.push(code);
    }

    // Hash backup codes with argon2
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => argon2.hash(code)),
    );

    // Store temporary secret and backup codes in user record (will be saved after verification)
    // For now, we'll store them temporarily - in production, consider using Redis with expiry
    const tempSecret = secret.base32;

    // Generate QR code
    if (!secret.base32) {
      throw new Error('Failed to generate MFA secret');
    }

    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: user.email,
      issuer: 'RaverPay',
      encoding: 'base32',
    });

    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    // Store temporary secret in user record (we'll clear it if verification fails)
    // In a production system, you might want to use Redis for this with 30min expiry
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: tempSecret, // Store temporarily, will encrypt after verification
        mfaBackupCodes: hashedBackupCodes,
      },
    });

    return {
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
      manualEntryKey: secret.base32,
      backupCodes, // Return plain codes - user must save these
    };
  }

  /**
   * Setup MFA for admin user without authentication
   * Requires temporary setup token OR account created < 24 hours ago + email verified
   *
   * @param email - Admin email address
   * @param setupToken - Optional temporary setup token (sent via email when admin is created)
   * @returns QR code data URL and backup codes
   */
  async setupMfaUnauthenticated(
    email: string,
    setupToken?: string,
  ): Promise<{
    secret: string;
    qrCode: string;
    manualEntryKey: string;
    backupCodes: string[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is admin
    const isAdmin =
      user.role === UserRole.ADMIN ||
      user.role === UserRole.SUPPORT ||
      user.role === UserRole.SUPER_ADMIN;

    if (!isAdmin) {
      throw new ForbiddenException(
        'Unauthenticated MFA setup is only available for admin users',
      );
    }

    // Check if MFA is already enabled
    if (user.twoFactorEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    // Verify eligibility: either setupToken OR account created < 24 hours ago + email verified
    let isEligible = false;

    if (setupToken) {
      // Verify setup token
      try {
        const payload = this.jwtService.verify<{
          sub: string;
          purpose: string;
          email: string;
        }>(setupToken);

        if (
          payload.purpose === 'mfa-setup' &&
          payload.email === email &&
          payload.sub === user.id
        ) {
          isEligible = true;
        }
      } catch (error) {
        // Token invalid or expired
        this.logger.warn(`Invalid or expired setup token for ${email}:`, error);
      }
    } else {
      // Check if account created < 24 hours ago and email verified
      const accountAge = Date.now() - user.createdAt.getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (accountAge < twentyFourHours && user.emailVerified) {
        isEligible = true;
      }
    }

    if (!isEligible) {
      throw new ForbiddenException(
        'Not eligible for unauthenticated MFA setup. Please provide a valid setup token or ensure your account was created within the last 24 hours and email is verified.',
      );
    }

    // Generate secret (same logic as authenticated setup)
    const secret = speakeasy.generateSecret({
      name: `RaverPay:${user.email}`,
      issuer: 'RaverPay',
      length: 32,
    });

    // Generate backup codes (10 codes, 8 characters each)
    const backupCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = randomInt(10000000, 99999999).toString();
      backupCodes.push(code);
    }

    // Hash backup codes with argon2
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => argon2.hash(code)),
    );

    // Store temporary secret and backup codes in user record (will be saved after verification)
    const tempSecret = secret.base32;

    // Generate QR code
    if (!secret.base32) {
      throw new Error('Failed to generate MFA secret');
    }

    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: user.email,
      issuer: 'RaverPay',
      encoding: 'base32',
    });

    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    // Store temporary secret in user record (we'll clear it if verification fails)
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: tempSecret, // Store temporarily, will encrypt after verification
        mfaBackupCodes: hashedBackupCodes,
      },
    });

    // Log unauthenticated MFA setup attempt
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.MFA_REQUIRED,
      resource: 'AUTH',
      status: AuditStatus.SUCCESS,
      severity: AuditSeverity.MEDIUM,
      metadata: {
        adminEmail: user.email,
        setupType: 'unauthenticated',
        hasSetupToken: !!setupToken,
      },
    });

    this.logger.log(
      `Unauthenticated MFA setup initiated for ${user.email} (hasToken: ${!!setupToken})`,
    );

    return {
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
      manualEntryKey: secret.base32,
      backupCodes, // Return plain codes - user must save these
    };
  }

  /**
   * Verify MFA setup and enable MFA
   *
   * @param userId - User ID
   * @param code - 6-digit TOTP code
   * @returns Success message
   */
  async verifyMfaSetup(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('MFA setup not initiated');
    }

    // Verify the code
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1, // Allow 30 seconds clock drift
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Encrypt and store the secret
    const encryptedSecret = this.mfaEncryption.encryptSecret(
      user.twoFactorSecret,
    );

    // Enable MFA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: encryptedSecret,
        mfaEnabledAt: new Date(),
        mfaFailedAttempts: 0,
      },
    });

    // Log MFA enabled
    await this.auditService.log({
      userId,
      action: AuditAction.MFA_ENABLED,
      resource: 'AUTH',
      status: AuditStatus.SUCCESS,
    });

    // Send notification email
    await this.notificationDispatcher
      .sendNotification({
        userId: user.id,
        eventType: 'mfa_enabled',
        category: 'SECURITY',
        channels: ['EMAIL'],
        title: 'MFA Enabled on Your Account',
        message:
          'Multi-factor authentication has been enabled on your account.',
        data: {
          userName: user.firstName,
          timestamp: new Date().toISOString(),
        },
      })
      .catch((error) => {
        this.logger.error('Failed to send MFA enabled email', error);
      });

    return { success: true, message: 'MFA has been enabled successfully' };
  }

  /**
   * Verify MFA code during login
   *
   * @param tempToken - Temporary token from login
   * @param mfaCode - 6-digit TOTP code
   * @param deviceInfo - Device information
   * @param ipAddress - IP address
   * @returns User object and auth tokens
   */
  async verifyMfaCode(
    tempToken: string,
    mfaCode: string,
    deviceInfo?: DeviceInfo,
    ipAddress?: string,
  ) {
    // Decode and validate tempToken
    interface MfaTokenPayload {
      sub: string;
      purpose: string;
      email: string;
      ipAddress?: string;
    }

    let payload: MfaTokenPayload;
    try {
      payload = this.jwtService.verify<MfaTokenPayload>(tempToken);
    } catch {
      throw new UnauthorizedException('MFA verification session expired');
    }

    if (payload.purpose !== 'mfa-verification') {
      throw new UnauthorizedException('Invalid token purpose');
    }

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.twoFactorSecret || !user.twoFactorEnabled) {
      throw new UnauthorizedException('MFA not configured');
    }

    // CRITICAL SECURITY: Check IP whitelist for admin users during MFA verification
    const isAdmin =
      user.role === UserRole.ADMIN ||
      user.role === UserRole.SUPPORT ||
      user.role === UserRole.SUPER_ADMIN;

    if (isAdmin && ipAddress && ipAddress !== 'unknown') {
      const isIpWhitelisted = await this.checkIpWhitelist(ipAddress, user.id);
      if (!isIpWhitelisted) {
        this.logger.warn(
          `Blocked MFA verification from non-whitelisted IP: ${ipAddress} for user: ${user.email}`,
        );

        await this.auditService.log({
          userId: user.id,
          action: AuditAction.IP_BLOCKED,
          resource: 'AUTH',
          status: AuditStatus.FAILURE,
          severity: AuditSeverity.HIGH,
          metadata: {
            blockedIp: ipAddress,
            attemptedRoute: '/auth/mfa/verify',
            reason: 'IP_NOT_WHITELISTED_DURING_MFA',
          },
        });

        throw new ForbiddenException(
          'Access denied: Your IP address is not whitelisted for admin access.',
        );
      }

      // CRITICAL SECURITY: Check IP consistency - IP must match the one used during login
      const loginIp = payload.ipAddress || 'unknown';
      if (loginIp !== 'unknown' && ipAddress !== loginIp) {
        this.logger.warn(
          `IP mismatch during MFA verification for user: ${user.email}. Login IP: ${loginIp}, Current IP: ${ipAddress}`,
        );

        await this.auditService.log({
          userId: user.id,
          action: AuditAction.MFA_IP_MISMATCH,
          resource: 'AUTH',
          status: AuditStatus.FAILURE,
          severity: AuditSeverity.HIGH,
          metadata: {
            loginIp,
            currentIp: ipAddress,
            attemptedRoute: '/auth/mfa/verify',
            reason: 'IP_CHANGED_DURING_MFA_FLOW',
          },
        });

        throw new ForbiddenException(
          'Security violation: IP address changed during authentication. Please restart the login process.',
        );
      }
    }

    // Decrypt the stored secret
    const secret = this.mfaEncryption.decryptSecret(user.twoFactorSecret);

    // Verify the TOTP code
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: mfaCode,
      window: 1, // Allow 30 seconds clock drift
    });

    if (!isValid) {
      // Increment failed attempts
      const updatedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          mfaFailedAttempts: { increment: 1 },
          lastMfaFailure: new Date(),
        },
      });

      // Log failed attempt
      await this.auditService.log({
        userId: user.id,
        action: AuditAction.MFA_VERIFICATION_FAILED,
        resource: 'AUTH',
        status: AuditStatus.FAILURE,
        severity: AuditSeverity.MEDIUM,
        metadata: { ipAddress, deviceId: deviceInfo?.deviceId },
      });

      // Lock account after 5 failed attempts
      if (updatedUser.mfaFailedAttempts >= 5) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            lockedUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
          },
        });

        // Send security alert email
        await this.notificationDispatcher
          .sendNotification({
            userId: user.id,
            eventType: 'account_locked_mfa',
            category: 'SECURITY',
            channels: ['EMAIL'],
            title: 'Account Locked Due to Failed MFA Attempts',
            message:
              'Your account has been temporarily locked due to multiple failed MFA attempts.',
            data: { userName: user.firstName },
          })
          .catch((error) => {
            this.logger.error('Failed to send account locked email', error);
          });

        throw new UnauthorizedException(
          'Account locked due to multiple failed MFA attempts',
        );
      }

      throw new UnauthorizedException(
        `Invalid MFA code. ${5 - updatedUser.mfaFailedAttempts} attempts remaining.`,
      );
    }

    // MFA verification successful!

    // Reset failed attempts
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        mfaFailedAttempts: 0,
        lastMfaSuccess: new Date(),
      },
    });

    // Log successful MFA
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.MFA_VERIFICATION_SUCCESS,
      resource: 'AUTH',
      status: AuditStatus.SUCCESS,
      metadata: { ipAddress, deviceId: deviceInfo?.deviceId },
    });

    // Check if password change is required (for admin users)
    if (isAdmin && user.mustChangePassword) {
      // Generate password-change token (15 minute expiry)
      const passwordChangeToken = this.jwtService.sign(
        {
          sub: user.id,
          purpose: 'password-change',
          email: user.email,
        },
        { expiresIn: '15m' },
      );

      // Remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = user;

      return {
        mustChangePassword: true,
        passwordChangeToken,
        message: 'Password change required on first login',
        user: userWithoutPassword,
      };
    }

    // Register/update device (using existing DeviceService)
    let deviceId: string | undefined;
    if (deviceInfo) {
      // Check if device exists
      const deviceCheck = await this.deviceService.checkDeviceAuthorization(
        user.id,
        deviceInfo,
      );

      if (!deviceCheck.authorized || !deviceCheck.device) {
        // Register new device
        await this.deviceService.registerNewDevice(user.id, deviceInfo);
      } else {
        // Update device activity
        await this.deviceService.updateDeviceActivity(
          deviceCheck.device.deviceId,
          ipAddress,
        );
      }
      deviceId = deviceInfo.deviceId;
    }

    // Generate actual access and refresh tokens
    const tokens = await this.generateTokens(user, deviceInfo, ipAddress);

    // Generate re-auth token for admin users (for sensitive operations)
    // This token can be used with ReAuthGuard for critical operations
    let reAuthToken: string | undefined;
    if (isAdmin) {
      reAuthToken = this.jwtService.sign(
        {
          sub: user.id,
          purpose: 'reauth',
        },
        { expiresIn: '15m' }, // 15 minute expiry
      );
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastSuccessfulLoginIp: ipAddress,
      },
    });

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      deviceId,
      ...tokens,
      ...(reAuthToken && { reAuthToken }), // Include re-auth token if generated
    };
  }

  /**
   * Verify backup code during login
   *
   * @param tempToken - Temporary token from login
   * @param backupCode - Backup code
   * @param deviceInfo - Device information
   * @param ipAddress - IP address
   * @returns User object and auth tokens
   */
  async verifyBackupCode(
    tempToken: string,
    backupCode: string,
    deviceInfo?: DeviceInfo,
    ipAddress?: string,
  ) {
    // Decode and validate tempToken
    interface MfaTokenPayload {
      sub: string;
      purpose: string;
      email: string;
      ipAddress?: string;
    }

    let payload: MfaTokenPayload;
    try {
      payload = this.jwtService.verify<MfaTokenPayload>(tempToken);
    } catch {
      throw new UnauthorizedException('MFA verification session expired');
    }

    if (payload.purpose !== 'mfa-verification') {
      throw new UnauthorizedException('Invalid token purpose');
    }

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.twoFactorEnabled) {
      throw new UnauthorizedException('MFA not configured');
    }

    // CRITICAL SECURITY: Check IP whitelist for admin users during backup code verification
    const isAdmin =
      user.role === UserRole.ADMIN ||
      user.role === UserRole.SUPPORT ||
      user.role === UserRole.SUPER_ADMIN;

    if (isAdmin && ipAddress && ipAddress !== 'unknown') {
      const isIpWhitelisted = await this.checkIpWhitelist(ipAddress, user.id);
      if (!isIpWhitelisted) {
        this.logger.warn(
          `Blocked backup code verification from non-whitelisted IP: ${ipAddress} for user: ${user.email}`,
        );

        await this.auditService.log({
          userId: user.id,
          action: AuditAction.IP_BLOCKED,
          resource: 'AUTH',
          status: AuditStatus.FAILURE,
          severity: AuditSeverity.HIGH,
          metadata: {
            blockedIp: ipAddress,
            attemptedRoute: '/auth/mfa/verify-backup',
            reason: 'IP_NOT_WHITELISTED_DURING_MFA',
          },
        });

        throw new ForbiddenException(
          'Access denied: Your IP address is not whitelisted for admin access.',
        );
      }

      // CRITICAL SECURITY: Check IP consistency - IP must match the one used during login
      const loginIp = payload.ipAddress || 'unknown';
      if (loginIp !== 'unknown' && ipAddress !== loginIp) {
        this.logger.warn(
          `IP mismatch during backup code verification for user: ${user.email}. Login IP: ${loginIp}, Current IP: ${ipAddress}`,
        );

        await this.auditService.log({
          userId: user.id,
          action: AuditAction.MFA_IP_MISMATCH,
          resource: 'AUTH',
          status: AuditStatus.FAILURE,
          severity: AuditSeverity.HIGH,
          metadata: {
            loginIp,
            currentIp: ipAddress,
            attemptedRoute: '/auth/mfa/verify-backup',
            reason: 'IP_CHANGED_DURING_MFA_FLOW',
          },
        });

        throw new ForbiddenException(
          'Security violation: IP address changed during authentication. Please restart the login process.',
        );
      }
    }

    // Verify backup code
    const backupCodes = user.mfaBackupCodes || [];
    let matchedIndex = -1;

    for (let i = 0; i < backupCodes.length; i++) {
      try {
        const isValid = await argon2.verify(backupCodes[i], backupCode);
        if (isValid) {
          matchedIndex = i;
          break;
        }
      } catch {
        // Continue checking other codes
        continue;
      }
    }

    if (matchedIndex === -1) {
      // Invalid backup code - treat as failed MFA attempt
      const updatedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          mfaFailedAttempts: { increment: 1 },
          lastMfaFailure: new Date(),
        },
      });

      await this.auditService.log({
        userId: user.id,
        action: AuditAction.MFA_VERIFICATION_FAILED,
        resource: 'AUTH',
        status: AuditStatus.FAILURE,
        severity: AuditSeverity.MEDIUM,
        metadata: {
          ipAddress,
          deviceId: deviceInfo?.deviceId,
          usedBackupCode: true,
        },
      });

      if (updatedUser.mfaFailedAttempts >= 5) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
          },
        });

        throw new UnauthorizedException(
          'Account locked due to multiple failed MFA attempts',
        );
      }

      throw new UnauthorizedException('Invalid backup code');
    }

    // Valid backup code - remove it (single-use)
    const updatedBackupCodes = [...backupCodes];
    updatedBackupCodes.splice(matchedIndex, 1);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        mfaBackupCodes: updatedBackupCodes,
        mfaFailedAttempts: 0,
        lastMfaSuccess: new Date(),
      },
    });

    // Log backup code usage
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.MFA_BACKUP_CODE_USED,
      resource: 'AUTH',
      status: AuditStatus.SUCCESS,
      severity: AuditSeverity.MEDIUM,
      metadata: { ipAddress, deviceId: deviceInfo?.deviceId },
    });

    // Send security alert email
    await this.notificationDispatcher
      .sendNotification({
        userId: user.id,
        eventType: 'mfa_backup_code_used',
        category: 'SECURITY',
        channels: ['EMAIL'],
        title: 'Backup Code Used to Access Your Account',
        message:
          'A backup code was used to access your account. If this was not you, please secure your account immediately.',
        data: {
          userName: user.firstName,
          remainingCodes: updatedBackupCodes.length,
          timestamp: new Date().toISOString(),
        },
      })
      .catch((error) => {
        this.logger.error('Failed to send backup code used email', error);
      });

    // Warn if only 2 backup codes remain
    if (updatedBackupCodes.length <= 2) {
      await this.notificationDispatcher
        .sendNotification({
          userId: user.id,
          eventType: 'mfa_low_backup_codes',
          category: 'SECURITY',
          channels: ['EMAIL'],
          title: 'Low Backup Codes Remaining',
          message:
            'You have few backup codes remaining. Please regenerate them to ensure account access.',
          data: {
            userName: user.firstName,
            remainingCodes: updatedBackupCodes.length,
          },
        })
        .catch((error) => {
          this.logger.error('Failed to send low backup codes email', error);
        });
    }

    // Check if password change is required (for admin users)
    if (isAdmin && user.mustChangePassword) {
      // Generate password-change token (15 minute expiry)
      const passwordChangeToken = this.jwtService.sign(
        {
          sub: user.id,
          purpose: 'password-change',
          email: user.email,
        },
        { expiresIn: '15m' },
      );

      // Remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = user;

      return {
        mustChangePassword: true,
        passwordChangeToken,
        message: 'Password change required on first login',
        user: userWithoutPassword,
      };
    }

    // Register/update device
    let deviceId: string | undefined;
    if (deviceInfo) {
      // Check if device exists
      const deviceCheck = await this.deviceService.checkDeviceAuthorization(
        user.id,
        deviceInfo,
      );

      if (!deviceCheck.authorized || !deviceCheck.device) {
        // Register new device
        await this.deviceService.registerNewDevice(user.id, deviceInfo);
      } else {
        // Update device activity
        await this.deviceService.updateDeviceActivity(
          deviceCheck.device.deviceId,
          ipAddress,
        );
      }
      deviceId = deviceInfo.deviceId;
    }

    // Generate tokens
    const tokens = await this.generateTokens(user, deviceInfo, ipAddress);

    // Generate re-auth token for admin users (for sensitive operations)
    // This token can be used with ReAuthGuard for critical operations
    let reAuthToken: string | undefined;
    if (isAdmin) {
      reAuthToken = this.jwtService.sign(
        {
          sub: user.id,
          purpose: 'reauth',
        },
        { expiresIn: '15m' }, // 15 minute expiry
      );
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastSuccessfulLoginIp: ipAddress,
      },
    });

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      deviceId,
      ...tokens,
      ...(reAuthToken && { reAuthToken }), // Include re-auth token if generated
    };
  }

  /**
   * Disable MFA (requires password verification)
   *
   * @param userId - User ID
   * @param password - User password
   * @returns Success message
   */
  async disableMfa(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('MFA is not enabled');
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(user.password, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Disable MFA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        mfaBackupCodes: [],
        mfaFailedAttempts: 0,
      },
    });

    // Log MFA disabled
    await this.auditService.log({
      userId,
      action: AuditAction.MFA_DISABLED,
      resource: 'AUTH',
      status: AuditStatus.SUCCESS,
      severity: AuditSeverity.MEDIUM,
    });

    // Send security alert email
    await this.notificationDispatcher
      .sendNotification({
        userId: user.id,
        eventType: 'mfa_disabled',
        category: 'SECURITY',
        channels: ['EMAIL'],
        title: 'MFA Disabled on Your Account',
        message:
          'Multi-factor authentication has been disabled on your account.',
        data: {
          userName: user.firstName,
          timestamp: new Date().toISOString(),
        },
      })
      .catch((error) => {
        this.logger.error('Failed to send MFA disabled email', error);
      });

    return { success: true, message: 'MFA has been disabled successfully' };
  }

  /**
   * Regenerate backup codes
   *
   * @param userId - User ID
   * @returns New backup codes
   */
  async regenerateBackupCodes(userId: string, mfaCode: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorEnabled) {
      throw new BadRequestException('MFA is not enabled');
    }

    // Verify MFA code before regenerating
    if (!user.twoFactorSecret) {
      throw new BadRequestException('MFA secret not found');
    }

    const secret = this.mfaEncryption.decryptSecret(user.twoFactorSecret);
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: mfaCode,
      window: 2, // Allow 2 time steps (60 seconds) of tolerance
    });

    if (!isValid) {
      // Increment failed attempts
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          mfaFailedAttempts: { increment: 1 },
          lastMfaFailure: new Date(),
        },
      });

      throw new UnauthorizedException('Invalid MFA code');
    }

    // Reset failed attempts on success
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        mfaFailedAttempts: 0,
        lastMfaSuccess: new Date(),
      },
    });

    // Generate new backup codes
    const backupCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = randomInt(10000000, 99999999).toString();
      backupCodes.push(code);
    }

    // Hash backup codes
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => argon2.hash(code)),
    );

    // Update user
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaBackupCodes: hashedBackupCodes,
      },
    });

    // Log backup codes regenerated
    await this.auditService.log({
      userId,
      action: AuditAction.MFA_BACKUP_CODES_REGENERATED,
      resource: 'AUTH',
      status: AuditStatus.SUCCESS,
    });

    return {
      backupCodes, // Return plain codes - user must save these
      message: 'Backup codes regenerated successfully',
    };
  }

  /**
   * Get MFA status
   *
   * @param userId - User ID
   * @returns MFA status information
   */
  async getMfaStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        mfaEnabledAt: true,
        mfaBackupCodes: true,
        lastMfaSuccess: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      mfaEnabled: user.twoFactorEnabled,
      mfaEnabledAt: user.mfaEnabledAt,
      backupCodesRemaining: user.mfaBackupCodes?.length || 0,
      lastMfaSuccess: user.lastMfaSuccess,
    };
  }

  /**
   * Verify password for re-authentication
   * Returns short-lived token for sensitive operations
   *
   * @param userId - User ID
   * @param password - User password
   * @returns Re-authentication token
   */
  async verifyPasswordReauth(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(user.password, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Generate short-lived re-auth token (15 minutes)
    const reAuthToken = this.jwtService.sign(
      {
        sub: user.id,
        purpose: 'reauth',
      },
      { expiresIn: '15m' },
    );

    // Log re-authentication
    await this.auditService.log({
      userId,
      action: AuditAction.PASSWORD_CHANGED, // Using existing action, could add REAUTH_VERIFIED
      resource: 'AUTH',
      status: AuditStatus.SUCCESS,
      metadata: { purpose: 'reauthentication' },
    });

    return {
      reAuthToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  /**
   * Verify MFA code for re-authentication
   * Returns short-lived token for sensitive operations
   *
   * @param userId - User ID
   * @param mfaCode - MFA code (TOTP or backup code)
   * @returns Re-authentication token
   */
  async verifyMfaReauth(userId: string, mfaCode: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if user has MFA enabled
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('MFA is not enabled for this user');
    }

    // Verify MFA code (TOTP or backup code)
    let isMfaValid = false;
    const secret = this.mfaEncryption.decryptSecret(user.twoFactorSecret);
    isMfaValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: mfaCode,
      window: 1,
    });

    if (!isMfaValid) {
      // Check backup codes if TOTP failed
      const backupCodes = user.mfaBackupCodes || [];
      let matchedIndex = -1;
      for (let i = 0; i < backupCodes.length; i++) {
        try {
          const isValid = await argon2.verify(backupCodes[i], mfaCode);
          if (isValid) {
            matchedIndex = i;
            break;
          }
        } catch {
          continue;
        }
      }

      if (matchedIndex !== -1) {
        isMfaValid = true;
        // Remove used backup code
        const updatedBackupCodes = [...backupCodes];
        updatedBackupCodes.splice(matchedIndex, 1);
        await this.prisma.user.update({
          where: { id: user.id },
          data: { mfaBackupCodes: updatedBackupCodes },
        });
        await this.auditService.log({
          userId: user.id,
          action: AuditAction.MFA_BACKUP_CODE_USED,
          resource: 'AUTH',
          status: AuditStatus.SUCCESS,
          severity: AuditSeverity.MEDIUM,
          metadata: { purpose: 'reauthentication' },
        });
      }
    }

    if (!isMfaValid) {
      throw new UnauthorizedException('Invalid MFA code or backup code');
    }

    // Generate short-lived re-auth token (15 minutes)
    const reAuthToken = this.jwtService.sign(
      {
        sub: user.id,
        purpose: 'reauth',
      },
      { expiresIn: '15m' },
    );

    // Log re-authentication
    await this.auditService.log({
      userId,
      action: AuditAction.MFA_VERIFICATION_SUCCESS,
      resource: 'AUTH',
      status: AuditStatus.SUCCESS,
      severity: AuditSeverity.MEDIUM,
      metadata: { purpose: 'reauthentication' },
    });

    return {
      reAuthToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }
}
