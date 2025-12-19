/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
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
      await this.handleFailedLogin(user.id);

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

    // Generate tokens
    const tokens = await this.generateTokens(user);

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
  private async handleFailedLogin(userId: string): Promise<void> {
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
  private async generateTokens(user: User) {
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

    // Store refresh token in database
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 1800, // 30 minutes in seconds
    };
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
}
