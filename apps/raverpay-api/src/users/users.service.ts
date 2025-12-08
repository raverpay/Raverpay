import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KYCTier } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  UpdateProfileDto,
  VerifyBvnDto,
  VerifyNinDto,
  ChangePasswordDto,
  RequestAccountDeletionDto,
} from './dto';
import { EmailService } from '../services/email/email.service';
import { SmsService } from '../services/sms/sms.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { BVNEncryptionService } from '../utils/bvn-encryption.service';
import { randomInt } from 'crypto';

/**
 * User profile response type with wallet
 */
export interface UserProfileResponse {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  kycTier: string;
  avatar: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  bvn: string | null;
  bvnVerified: boolean;
  nin: string | null;
  ninVerified: boolean;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  phoneVerified: boolean;
  phoneVerifiedAt: Date | null;
  twoFactorEnabled: boolean;
  tag: string | null;
  tagSetAt: Date | null;
  tagChangedCount: number;
  createdAt: Date;
  updatedAt: Date;
  wallet: {
    id: string;
    balance: string;
    currency: string;
    dailySpent: string;
    monthlySpent: string;
    isLocked: boolean;
  } | null;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    @Inject(forwardRef(() => CloudinaryService))
    private readonly cloudinaryService: CloudinaryService,
    private readonly bvnEncryptionService: BVNEncryptionService,
  ) {}

  /**
   * Get user profile by ID
   * @param userId - User ID
   * @returns User profile with wallet information
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        kycTier: true,
        avatar: true,
        dateOfBirth: true,
        gender: true,
        address: true,
        city: true,
        state: true,
        country: true,
        bvn: true,
        bvnVerified: true,
        nin: true,
        ninVerified: true,
        emailVerified: true,
        emailVerifiedAt: true,
        phoneVerified: true,
        phoneVerifiedAt: true,
        twoFactorEnabled: true,
        tag: true,
        tagSetAt: true,
        tagChangedCount: true,
        createdAt: true,
        updatedAt: true,
        wallets: {
          where: {
            type: 'NAIRA',
          },
          select: {
            id: true,
            balance: true,
            currency: true,
            dailySpent: true,
            monthlySpent: true,
            isLocked: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Build response with Decimal fields converted to strings
    const response: UserProfileResponse = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      kycTier: user.kycTier,
      avatar: user.avatar,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      address: user.address,
      city: user.city,
      state: user.state,
      country: user.country,
      bvn: user.bvn,
      bvnVerified: user.bvnVerified,
      nin: user.nin,
      ninVerified: user.ninVerified,
      emailVerified: user.emailVerified,
      emailVerifiedAt: user.emailVerifiedAt,
      phoneVerified: user.phoneVerified,
      phoneVerifiedAt: user.phoneVerifiedAt,
      twoFactorEnabled: user.twoFactorEnabled,
      tag: user.tag,
      tagSetAt: user.tagSetAt,
      tagChangedCount: user.tagChangedCount,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      wallet:
        user.wallets && user.wallets.length > 0
          ? {
              id: user.wallets[0].id,
              balance: user.wallets[0].balance.toString(),
              currency: user.wallets[0].currency,
              dailySpent: user.wallets[0].dailySpent.toString(),
              monthlySpent: user.wallets[0].monthlySpent.toString(),
              isLocked: user.wallets[0].isLocked,
            }
          : null,
    };

    return response;
  }

  /**
   * Update user profile
   * @param userId - User ID
   * @param updateProfileDto - Profile data to update
   * @returns Updated user profile
   */
  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if profile has already been edited (one-time edit enforcement)
    if (user.profileEditedOnce) {
      throw new ForbiddenException(
        'Profile can only be edited once. Please contact support if you need to make changes.',
      );
    }

    // Convert dateOfBirth to Date object if provided
    const updateData: Record<string, any> = { ...updateProfileDto };
    if (updateProfileDto.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateProfileDto.dateOfBirth);
    }

    // Mark profile as edited
    updateData.profileEditedOnce = true;
    updateData.profileEditedAt = new Date();

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        address: true,
        city: true,
        state: true,
        country: true,
        avatar: true,
        role: true,
        status: true,
        kycTier: true,
        bvnVerified: true,
        ninVerified: true,
        emailVerified: true,
        phoneVerified: true,
        profileEditedOnce: true,
        profileEditedAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Change user password
   * @param userId - User ID
   * @param changePasswordDto - Current and new password
   * @returns Success message
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await argon2.verify(
      user.password,
      changePasswordDto.currentPassword,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Check if new password is same as current
    const isSamePassword = await argon2.verify(
      user.password,
      changePasswordDto.newPassword,
    );

    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    // Hash new password
    const hashedPassword = await argon2.hash(changePasswordDto.newPassword);

    // Update password and timestamp
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        lastPasswordChange: new Date(),
      },
    });

    return {
      message: 'Password changed successfully',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Verify BVN (Bank Verification Number)
   * @param userId - User ID
   * @param verifyBvnDto - BVN and date of birth
   * @returns Verification result
   */
  async verifyBvn(userId: string, verifyBvnDto: VerifyBvnDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.bvnVerified) {
      throw new ConflictException('BVN already verified');
    }

    // TODO: Integrate with actual BVN verification API (e.g., Mono, Paystack Identity)
    // For now, we'll simulate the verification
    const isValidBvn = await this.simulateBvnVerification(verifyBvnDto.bvn);

    if (!isValidBvn) {
      throw new BadRequestException(
        'BVN verification failed. Please check your details and try again.',
      );
    }

    // Encrypt BVN before storing in database
    const encryptedBvn = this.bvnEncryptionService.encrypt(verifyBvnDto.bvn);

    this.logger.log(
      `BVN verified for user ${userId} - BVN: ${this.bvnEncryptionService.maskForLogging(verifyBvnDto.bvn)}`,
    );

    // Update user with encrypted BVN
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        bvn: encryptedBvn,
        bvnVerified: true,
        dateOfBirth: new Date(verifyBvnDto.dateOfBirth),
        kycTier: 'TIER_2', // Upgrade to Tier 2 after BVN verification
        status:
          user.emailVerified && user.phoneVerified ? 'ACTIVE' : user.status,
      },
      select: {
        id: true,
        bvnVerified: true,
        kycTier: true,
        status: true,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'BVN_VERIFIED',
        resource: 'USER',
        resourceId: userId,
        ipAddress: '0.0.0.0', // TODO: Get from request
        userAgent: 'API',
        metadata: {
          kycTier: updatedUser.kycTier,
        },
      },
    });

    return {
      message: 'BVN verified successfully',
      kycTier: updatedUser.kycTier,
      status: updatedUser.status,
      bvnVerified: updatedUser.bvnVerified,
    };
  }

  /**
   * Verify NIN (National Identification Number)
   * @param userId - User ID
   * @param verifyNinDto - NIN and date of birth
   * @returns Verification result
   */
  async verifyNin(userId: string, verifyNinDto: VerifyNinDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.ninVerified) {
      throw new ConflictException('NIN already verified');
    }

    // TODO: Integrate with actual NIN verification API (NIMC)
    // For now, we'll simulate the verification
    const isValidNin = await this.simulateNinVerification(verifyNinDto.nin);

    if (!isValidNin) {
      throw new BadRequestException(
        'NIN verification failed. Please check your details and try again.',
      );
    }

    // Determine new KYC tier
    let newKycTier: KYCTier = user.kycTier;
    if (user.bvnVerified && !user.ninVerified) {
      newKycTier = KYCTier.TIER_3; // Both BVN and NIN verified = Tier 3
    } else if (!user.bvnVerified) {
      newKycTier = KYCTier.TIER_2; // Only NIN verified = Tier 2
    }

    // Update user with verified NIN
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        nin: verifyNinDto.nin,
        ninVerified: true,
        dateOfBirth: new Date(verifyNinDto.dateOfBirth),
        kycTier: newKycTier,
        status:
          user.emailVerified && user.phoneVerified ? 'ACTIVE' : user.status,
      },
      select: {
        id: true,
        ninVerified: true,
        kycTier: true,
        status: true,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'NIN_VERIFIED',
        resource: 'USER',
        resourceId: userId,
        ipAddress: '0.0.0.0', // TODO: Get from request
        userAgent: 'API',
        metadata: {
          kycTier: updatedUser.kycTier,
        },
      },
    });

    return {
      message: 'NIN verified successfully',
      kycTier: updatedUser.kycTier,
      status: updatedUser.status,
      ninVerified: updatedUser.ninVerified,
    };
  }

  /**
   * Send email verification code
   * @param userId - User ID
   * @returns Success message
   */
  async sendEmailVerification(userId: string) {
    this.logger.log(
      `[EmailVerify] Start sendEmailVerification userId=${userId}`,
    );
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new ConflictException('Email already verified');
    }

    const now = new Date();
    const existingConfigKey = `email_verification_${userId}`;

    // Check if valid OTP already exists
    const existingConfig = await this.prisma.systemConfig.findUnique({
      where: { key: existingConfigKey },
    });

    if (existingConfig) {
      const existingData = JSON.parse(existingConfig.value as string);
      const expiresAt = new Date(existingData.expiresAt);

      // If OTP still valid, check rate limiting
      if (expiresAt > now) {
        const lastSentAt = existingData.lastSentAt
          ? new Date(existingData.lastSentAt)
          : new Date(0);

        const timeSinceLastSend = (now.getTime() - lastSentAt.getTime()) / 1000;

        // Rate limit: Must wait 120 seconds (2 minutes) between sends
        if (timeSinceLastSend < 120) {
          const waitTime = Math.ceil(120 - timeSinceLastSend);
          this.logger.warn(
            `[EmailVerify] Rate limit hit for ${user.email}. Wait ${waitTime}s`,
          );
          throw new BadRequestException(
            `Please wait ${waitTime} seconds before requesting a new code`,
          );
        }

        // Rate limit: Max 3 sends per OTP lifecycle
        const sendCount = existingData.sendCount || 1;
        if (sendCount >= 3) {
          this.logger.warn(
            `[EmailVerify] Max resend attempts (3) reached for ${user.email}`,
          );
          throw new BadRequestException(
            'Maximum resend attempts reached. Please try again later.',
          );
        }

        // Reuse existing code, just resend it
        this.logger.log(
          `[EmailVerify] Reusing existing code for ${user.email}. Send count: ${sendCount + 1}/3`,
        );

        const emailSent = await this.emailService.sendVerificationCode(
          user.email,
          existingData.code,
          user.firstName,
        );

        if (!emailSent) {
          this.logger.warn(
            `Failed to resend verification email to ${user.email}`,
          );
        }

        // Update lastSentAt and increment sendCount
        await this.prisma.systemConfig.update({
          where: { key: existingConfigKey },
          data: {
            value: JSON.stringify({
              ...existingData,
              lastSentAt: now.toISOString(),
              sendCount: sendCount + 1,
            }),
          },
        });

        const canResendAt = new Date(now.getTime() + 120000); // 2 minutes from now

        return {
          message: 'Verification code sent to your email',
          expiresIn: '10 minutes',
          canResendAt: canResendAt.toISOString(),
          sendsRemaining: 3 - (sendCount + 1),
        };
      }
    }

    // Generate new code using crypto for security
    const verificationCode = randomInt(100000, 999999).toString();

    // Send email with verification code
    this.logger.log(
      `[EmailVerify] Generated NEW code for ${user.email}. Attempting email send...`,
    );
    const emailSent = await this.emailService.sendVerificationCode(
      user.email,
      verificationCode,
      user.firstName,
    );

    if (!emailSent) {
      this.logger.warn(
        `Failed to send verification email to ${user.email}, but code is stored`,
      );
    } else {
      this.logger.log(
        `[EmailVerify] Email send reported success for ${user.email}`,
      );
    }

    // Store verification code with expiry and tracking metadata
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry
    const canResendAt = new Date(now.getTime() + 120000); // 2 minutes from now

    await this.prisma.systemConfig.upsert({
      where: { key: existingConfigKey },
      create: {
        key: existingConfigKey,
        value: JSON.stringify({
          code: verificationCode,
          expiresAt: expiresAt.toISOString(),
          attempts: 0,
          sendCount: 1,
          lastSentAt: now.toISOString(),
          createdAt: now.toISOString(),
        }),
      },
      update: {
        value: JSON.stringify({
          code: verificationCode,
          expiresAt: expiresAt.toISOString(),
          attempts: 0,
          sendCount: 1,
          lastSentAt: now.toISOString(),
          createdAt: now.toISOString(),
        }),
      },
    });

    return {
      message: 'Verification code sent to your email',
      expiresIn: '10 minutes',
      canResendAt: canResendAt.toISOString(),
      sendsRemaining: 2,
    };
  }

  /**
   * Verify email with code
   * @param userId - User ID
   * @param code - 6-digit verification code
   * @returns Success message
   */
  async verifyEmail(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new ConflictException('Email already verified');
    }

    // Get stored verification code
    const storedData = await this.prisma.systemConfig.findUnique({
      where: { key: `email_verification_${userId}` },
    });

    if (!storedData) {
      throw new BadRequestException(
        'No verification code found. Please request a new one.',
      );
    }

    // Parse stored data
    let verificationData: {
      code: string;
      expiresAt: string;
      attempts: number;
    };

    try {
      verificationData = JSON.parse(storedData.value as string) as {
        code: string;
        expiresAt: string;
        attempts: number;
      };
    } catch {
      // Fallback for old format (plain string)
      verificationData = {
        code: storedData.value as string,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        attempts: 0,
      };
    }

    // Check expiration
    if (new Date() > new Date(verificationData.expiresAt)) {
      await this.prisma.systemConfig.delete({
        where: { key: `email_verification_${userId}` },
      });
      throw new BadRequestException(
        'Verification code has expired. Please request a new one.',
      );
    }

    // Check attempts (max 5)
    if (verificationData.attempts >= 5) {
      await this.prisma.systemConfig.delete({
        where: { key: `email_verification_${userId}` },
      });
      throw new BadRequestException(
        'Too many failed attempts. Please request a new code.',
      );
    }

    // Verify code
    if (verificationData.code !== code) {
      // Increment attempts
      verificationData.attempts++;
      await this.prisma.systemConfig.update({
        where: { key: `email_verification_${userId}` },
        data: {
          value: JSON.stringify(verificationData),
        },
      });

      throw new BadRequestException(
        `Invalid verification code. ${5 - verificationData.attempts} attempts remaining.`,
      );
    }

    // Determine KYC tier upgrade
    let newKycTier: KYCTier = user.kycTier;
    if (user.phoneVerified && user.kycTier === KYCTier.TIER_0) {
      // Both email and phone verified = TIER_1
      newKycTier = KYCTier.TIER_1;
    }

    // Update user
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        kycTier: newKycTier,
        status:
          user.phoneVerified &&
          (user.bvnVerified || user.ninVerified || user.kycTier === 'TIER_0')
            ? 'ACTIVE'
            : 'PENDING_VERIFICATION',
      },
    });

    // Delete verification code
    await this.prisma.systemConfig.delete({
      where: { key: `email_verification_${userId}` },
    });

    // Send welcome email
    await this.emailService.sendWelcomeEmail(user.email, user.firstName);

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'EMAIL_VERIFIED',
        resource: 'USER',
        resourceId: userId,
        ipAddress: '0.0.0.0',
        userAgent: 'API',
      },
    });

    return {
      message: 'Email verified successfully',
      emailVerified: true,
      kycTier: newKycTier,
    };
  }

  /**
   * Send phone verification code
   * @param userId - User ID
   * @returns Success message
   */
  async sendPhoneVerification(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.phoneVerified) {
      throw new ConflictException('Phone number already verified');
    }

    const now = new Date();
    const existingConfigKey = `phone_verification_${userId}`;

    // Check if valid OTP already exists
    const existingConfig = await this.prisma.systemConfig.findUnique({
      where: { key: existingConfigKey },
    });

    if (existingConfig) {
      const existingData = JSON.parse(existingConfig.value as string);
      const expiresAt = new Date(existingData.expiresAt);

      // If OTP still valid, check rate limiting
      if (expiresAt > now) {
        const lastSentAt = existingData.lastSentAt
          ? new Date(existingData.lastSentAt)
          : new Date(0);

        const timeSinceLastSend = (now.getTime() - lastSentAt.getTime()) / 1000;

        // Rate limit: Must wait 120 seconds (2 minutes) between sends
        if (timeSinceLastSend < 120) {
          const waitTime = Math.ceil(120 - timeSinceLastSend);
          this.logger.warn(
            `[PhoneVerify] Rate limit hit for ${user.phone}. Wait ${waitTime}s`,
          );
          throw new BadRequestException(
            `Please wait ${waitTime} seconds before requesting a new code`,
          );
        }

        // Rate limit: Max 3 sends per OTP lifecycle
        const sendCount = existingData.sendCount || 1;
        if (sendCount >= 3) {
          this.logger.warn(
            `[PhoneVerify] Max resend attempts (3) reached for ${user.phone}`,
          );
          throw new BadRequestException(
            'Maximum resend attempts reached. Please try again later.',
          );
        }

        // Reuse existing code, just resend it
        this.logger.log(
          `[PhoneVerify] Reusing existing code for ${user.phone}. Send count: ${sendCount + 1}/3`,
        );

        // DISABLED: SMS provider has poor delivery rates
        // Phone verification will be re-enabled when a reliable SMS provider is configured
        // const smsSent = await this.smsService.sendVerificationCode(
        //   user.phone,
        //   existingData.code,
        //   user.firstName,
        // );
        const smsSent = false; // Simulating SMS not sent

        if (!smsSent) {
          this.logger.warn(
            `Phone verification SMS disabled - SMS provider has poor delivery rates`,
          );
        }

        // Update lastSentAt and increment sendCount
        await this.prisma.systemConfig.update({
          where: { key: existingConfigKey },
          data: {
            value: JSON.stringify({
              ...existingData,
              lastSentAt: now.toISOString(),
              sendCount: sendCount + 1,
            }),
          },
        });

        const canResendAt = new Date(now.getTime() + 120000); // 2 minutes from now

        return {
          message:
            'Phone verification is temporarily disabled. Please contact support.',
          expiresIn: '10 minutes',
          canResendAt: canResendAt.toISOString(),
          sendsRemaining: 3 - (sendCount + 1),
        };
      }
    }

    // Generate new code using crypto for security
    const verificationCode = randomInt(100000, 999999).toString();

    // DISABLED: SMS provider has poor delivery rates
    // Phone verification will be re-enabled when a reliable SMS provider is configured
    // Send SMS with verification code
    const smsSent = await this.smsService.sendVerificationCode(
      user.phone,
      verificationCode,
      user.firstName,
    );
    // const smsSent = false; // Simulating SMS not sent

    if (!smsSent) {
      this.logger.warn(
        `Phone verification SMS disabled - SMS provider has poor delivery rates`,
      );
    }

    // Store verification code with expiry and tracking metadata
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry
    const canResendAt = new Date(now.getTime() + 120000); // 2 minutes from now

    await this.prisma.systemConfig.upsert({
      where: { key: existingConfigKey },
      create: {
        key: existingConfigKey,
        value: JSON.stringify({
          code: verificationCode,
          expiresAt: expiresAt.toISOString(),
          attempts: 0,
          sendCount: 1,
          lastSentAt: now.toISOString(),
          createdAt: now.toISOString(),
        }),
      },
      update: {
        value: JSON.stringify({
          code: verificationCode,
          expiresAt: expiresAt.toISOString(),
          attempts: 0,
          sendCount: 1,
          lastSentAt: now.toISOString(),
          createdAt: now.toISOString(),
        }),
      },
    });

    return {
      message: 'Phone verification SMS Sent. Please check your messages.',
      expiresIn: '10 minutes',
      canResendAt: canResendAt.toISOString(),
      sendsRemaining: 2,
    };
  }

  /**
   * Verify phone with code
   * @param userId - User ID
   * @param code - 6-digit verification code
   * @returns Success message
   */
  async verifyPhone(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.phoneVerified) {
      throw new ConflictException('Phone number already verified');
    }

    // Get stored verification code
    const storedData = await this.prisma.systemConfig.findUnique({
      where: { key: `phone_verification_${userId}` },
    });

    if (!storedData) {
      throw new BadRequestException(
        'No verification code found. Please request a new one.',
      );
    }

    // Parse stored data
    let verificationData: {
      code: string;
      expiresAt: string;
      attempts: number;
    };

    try {
      verificationData = JSON.parse(storedData.value as string) as {
        code: string;
        expiresAt: string;
        attempts: number;
      };
    } catch {
      // Fallback for old format (plain string)
      verificationData = {
        code: storedData.value as string,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        attempts: 0,
      };
    }

    // Check expiration
    if (new Date() > new Date(verificationData.expiresAt)) {
      await this.prisma.systemConfig.delete({
        where: { key: `phone_verification_${userId}` },
      });
      throw new BadRequestException(
        'Verification code has expired. Please request a new one.',
      );
    }

    // Check attempts (max 5)
    if (verificationData.attempts >= 5) {
      await this.prisma.systemConfig.delete({
        where: { key: `phone_verification_${userId}` },
      });
      throw new BadRequestException(
        'Too many failed attempts. Please request a new code.',
      );
    }

    // Verify code
    if (verificationData.code !== code) {
      // Increment attempts
      verificationData.attempts++;
      await this.prisma.systemConfig.update({
        where: { key: `phone_verification_${userId}` },
        data: {
          value: JSON.stringify(verificationData),
        },
      });

      throw new BadRequestException(
        `Invalid verification code. ${5 - verificationData.attempts} attempts remaining.`,
      );
    }

    // Determine KYC tier upgrade
    // After phone verification, upgrade to TIER_2
    let newKycTier: KYCTier = KYCTier.TIER_2;

    // Update user
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        phoneVerified: true,
        phoneVerifiedAt: new Date(),
        kycTier: newKycTier,
        status: 'ACTIVE',
      },
    });

    // Delete verification code
    await this.prisma.systemConfig.delete({
      where: { key: `phone_verification_${userId}` },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'PHONE_VERIFIED',
        resource: 'USER',
        resourceId: userId,
        ipAddress: '0.0.0.0',
        userAgent: 'API',
        metadata: {
          previousTier: user.kycTier,
          newTier: newKycTier,
        },
      },
    });

    this.logger.log(
      `Phone verified for user ${userId}. KYC tier upgraded: ${user.kycTier} → ${newKycTier}`,
    );

    return {
      message: 'Phone number verified successfully',
      phoneVerified: true,
      kycTier: newKycTier,
    };
  }

  /**
   * Simulate BVN verification (replace with actual API in production)
   * @private
   */
  private async simulateBvnVerification(bvn: string): Promise<boolean> {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // For testing: Accept any 11-digit BVN
    // In production, integrate with Mono, Paystack Identity, or similar service
    return bvn.length === 11 && /^\d+$/.test(bvn);
  }

  /**
   * Simulate NIN verification (replace with actual API in production)
   * @private
   */
  private async simulateNinVerification(nin: string): Promise<boolean> {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // For testing: Accept any 11-digit NIN
    // In production, integrate with NIMC API
    return nin.length === 11 && /^\d+$/.test(nin);
  }

  /**
   * Set transaction PIN (first time)
   * @param userId - User ID
   * @param pin - 4-digit PIN
   * @param confirmPin - Confirmation PIN
   * @returns Success message
   */
  async setPin(userId: string, pin: string, confirmPin: string) {
    // Check if PIN already exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pin: true },
    });

    if (user?.pin) {
      throw new BadRequestException(
        'PIN already set. Use change-pin endpoint instead',
      );
    }

    // Validate PINs match
    if (pin !== confirmPin) {
      throw new BadRequestException('PIN and confirmation do not match');
    }

    // Check for weak PINs
    const weakPins = [
      '0000',
      '1111',
      '2222',
      '3333',
      '4444',
      '5555',
      '6666',
      '7777',
      '8888',
      '9999',
      '1234',
      '4321',
    ];
    if (weakPins.includes(pin)) {
      throw new BadRequestException(
        'PIN is too weak. Please choose a more secure PIN',
      );
    }

    // Hash PIN
    const hashedPin = await argon2.hash(pin);

    // Save PIN
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        pin: hashedPin,
        pinSetAt: new Date(),
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'PIN_SET',
        resource: 'USER',
        resourceId: userId,
      },
    });

    this.logger.log(`Transaction PIN set for user ${userId}`);

    return {
      success: true,
      message: 'Transaction PIN set successfully',
      pinSetAt: new Date().toISOString(),
    };
  }

  /**
   * Verify transaction PIN
   * @param userId - User ID
   * @param pin - 4-digit PIN
   * @returns Boolean indicating if PIN is valid
   */
  async verifyPin(userId: string, pin: string): Promise<boolean> {
    // Get user's PIN
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, pin: true },
    });

    if (!user?.pin) {
      throw new BadRequestException('PIN not set. Please set a PIN first');
    }

    // Check rate limiting (prevent brute force)
    const attemptKey = `pin_attempts_${userId}`;
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: attemptKey },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const attempts = config
      ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        JSON.parse(config.value as string).attempts || 0
      : 0;

    if (attempts >= 5) {
      throw new BadRequestException(
        'Too many failed attempts. Try again in 30 minutes',
      );
    }

    // Verify PIN
    const isValid = await argon2.verify(user.pin, pin);

    if (!isValid) {
      // Increment failed attempts
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 min lockout

      await this.prisma.systemConfig.upsert({
        where: { key: attemptKey },
        create: {
          key: attemptKey,
          value: JSON.stringify({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            attempts: attempts + 1,
            expiresAt: expiresAt.toISOString(),
          }),
        },
        update: {
          value: JSON.stringify({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            attempts: attempts + 1,
            expiresAt: expiresAt.toISOString(),
          }),
        },
      });

      // Audit log
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'PIN_VERIFICATION_FAILED',
          resource: 'USER',
          resourceId: userId,
        },
      });

      throw new BadRequestException(
        `Invalid PIN. ${5 - (attempts + 1)} attempts remaining`,
      );
    }

    // Reset attempts on success
    if (config) {
      await this.prisma.systemConfig.delete({
        where: { key: attemptKey },
      });
    }

    return true;
  }

  /**
   * Change transaction PIN
   * @param userId - User ID
   * @param currentPin - Current PIN
   * @param newPin - New PIN
   * @param confirmNewPin - Confirmation of new PIN
   * @returns Success message
   */
  async changePin(
    userId: string,
    currentPin: string,
    newPin: string,
    confirmNewPin: string,
  ) {
    // Verify current PIN
    await this.verifyPin(userId, currentPin);

    // Validate new PIN and confirmation match
    if (newPin !== confirmNewPin) {
      throw new BadRequestException('New PIN and confirmation do not match');
    }

    // Check if new PIN is same as current
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pin: true },
    });

    if (!user || !user.pin) {
      throw new BadRequestException('User or PIN not found');
    }

    const isSamePin = await argon2.verify(user.pin, newPin);
    if (isSamePin) {
      throw new BadRequestException(
        'New PIN must be different from current PIN',
      );
    }

    // Check for weak PINs
    const weakPins = [
      '0000',
      '1111',
      '2222',
      '3333',
      '4444',
      '5555',
      '6666',
      '7777',
      '8888',
      '9999',
      '1234',
      '4321',
    ];
    if (weakPins.includes(newPin)) {
      throw new BadRequestException(
        'PIN is too weak. Please choose a more secure PIN',
      );
    }

    // Hash new PIN
    const hashedPin = await argon2.hash(newPin);

    // Update PIN
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        pin: hashedPin,
        pinSetAt: new Date(),
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'PIN_CHANGED',
        resource: 'USER',
        resourceId: userId,
      },
    });

    this.logger.log(`Transaction PIN changed for user ${userId}`);

    return {
      success: true,
      message: 'PIN changed successfully',
    };
  }

  /**
   * Upload user avatar
   * @param userId - User ID
   * @param file - Image file
   * @returns Avatar URL
   */
  async uploadAvatar(userId: string, file: Express.Multer.File) {
    // Validate file type
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only image files are allowed (JPEG, JPG, PNG, WebP)',
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must not exceed 5MB');
    }

    // Get current user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete old avatar if exists
    if (user.avatar) {
      const publicId = this.cloudinaryService.extractPublicId(user.avatar);
      if (publicId) {
        try {
          await this.cloudinaryService.deleteImage(publicId);
        } catch (error) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          this.logger.warn(`Failed to delete old avatar: ${error.message}`);
        }
      }
    }

    // Upload new avatar to Cloudinary
    const avatarUrl = await this.cloudinaryService.uploadImage(file, 'avatars');

    // Update user
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'AVATAR_UPLOADED',
        resource: 'USER',
        resourceId: userId,
      },
    });

    this.logger.log(`Avatar uploaded for user ${userId}`);

    return {
      success: true,
      avatarUrl,
    };
  }

  /**
   * Delete user avatar
   * @param userId - User ID
   * @returns Success message
   */
  async deleteAvatar(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.avatar) {
      throw new BadRequestException('No avatar to delete');
    }

    // Delete from Cloudinary
    const publicId = this.cloudinaryService.extractPublicId(user.avatar);
    if (publicId) {
      try {
        await this.cloudinaryService.deleteImage(publicId);
      } catch (error) {
        this.logger.warn(
          `Failed to delete avatar from Cloudinary: ${error.message}`, // eslint-disable-line @typescript-eslint/no-unsafe-member-access
        );
      }
    }

    // Remove from database
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: null },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'AVATAR_DELETED',
        resource: 'USER',
        resourceId: userId,
      },
    });

    this.logger.log(`Avatar deleted for user ${userId}`);

    return {
      success: true,
      message: 'Avatar deleted successfully',
    };
  }

  /**
   * Send password reset email
   * @param userId - User ID
   * @param resetCode - 6-digit reset code
   * @returns Success indicator
   */
  async sendPasswordResetEmail(userId: string, resetCode: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.logger.log(
      `Sending password reset email to ${user.email} with code ${resetCode}`,
    );

    // Send email via email service
    const emailSent = await this.emailService.sendPasswordResetEmail(
      user.email,
      user.firstName,
      resetCode,
    );

    if (!emailSent) {
      this.logger.warn(
        `Failed to send password reset email to ${user.email}, but code is stored`,
      );
    }

    return emailSent;
  }

  /**
   * Request account deletion
   * @param userId - User ID
   * @param requestAccountDeletionDto - Deletion request details
   * @returns Success message
   */
  async requestAccountDeletion(
    userId: string,
    requestAccountDeletionDto: RequestAccountDeletionDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallets: {
          where: {
            type: 'NAIRA',
          },
          select: {
            balance: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has a pending deletion request
    if (user.deletionRequested) {
      throw new ConflictException(
        'Account deletion request already submitted. Please contact support.',
      );
    }

    // Verify password
    const isPasswordValid = await argon2.verify(
      user.password,
      requestAccountDeletionDto.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Incorrect password');
    }

    // Check if wallet balance is zero
    const nairaWallet =
      user.wallets && user.wallets.length > 0 ? user.wallets[0] : null;
    if (nairaWallet && parseFloat(nairaWallet.balance.toString()) > 0) {
      throw new BadRequestException(
        'Please withdraw all funds before requesting account deletion. Current balance: ₦' +
          nairaWallet.balance.toString(),
      );
    }

    // Validate custom reason if reason is 'other'
    if (
      requestAccountDeletionDto.reason === 'other' &&
      !requestAccountDeletionDto.customReason?.trim()
    ) {
      throw new BadRequestException(
        'Please provide a reason for account deletion',
      );
    }

    // Create account deletion request
    const deletionRequest = await this.prisma.accountDeletionRequest.create({
      data: {
        userId,
        reason: requestAccountDeletionDto.reason,
        customReason: requestAccountDeletionDto.customReason,
        passwordVerified: true,
        status: 'PENDING',
      },
    });

    // Update user status to PENDING_DELETION and set deletionRequested flag
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'PENDING_DELETION',
        deletionRequested: true,
        deletionRequestedAt: new Date(),
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'ACCOUNT_DELETION_REQUESTED',
        resource: 'USER',
        resourceId: userId,
        metadata: {
          reason: requestAccountDeletionDto.reason,
          customReason: requestAccountDeletionDto.customReason,
          deletionRequestId: deletionRequest.id,
        },
      },
    });

    this.logger.log(
      `Account deletion requested for user ${userId} - Reason: ${requestAccountDeletionDto.reason}`,
    );

    // TODO: Send notification to admin about deletion request
    // TODO: Send confirmation email to user

    return {
      success: true,
      message:
        'Account deletion request submitted successfully. You will be logged out now. An admin will review your request.',
      deletionRequestId: deletionRequest.id,
      requestedAt: deletionRequest.requestedAt,
    };
  }

  /**
   * Update user's Expo push token
   *
   * @param userId - User ID
   * @param pushToken - Expo push token
   * @returns Success status
   */
  async updatePushToken(userId: string, pushToken: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        expoPushToken: pushToken,
        lastPushTokenUpdate: new Date(),
      },
    });

    this.logger.log(`Updated Expo push token for user ${userId}`);

    return {
      success: true,
      message: 'Push token updated successfully',
    };
  }
}
