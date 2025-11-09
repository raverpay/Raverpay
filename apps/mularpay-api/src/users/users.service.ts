import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import {
  UpdateProfileDto,
  VerifyBvnDto,
  VerifyNinDto,
  ChangePasswordDto,
} from './dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
        createdAt: true,
        updatedAt: true,
        wallet: {
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
    const response: any = {
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
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      wallet: user.wallet
        ? {
            id: user.wallet.id,
            balance: user.wallet.balance.toString(),
            currency: user.wallet.currency,
            dailySpent: user.wallet.dailySpent.toString(),
            monthlySpent: user.wallet.monthlySpent.toString(),
            isLocked: user.wallet.isLocked,
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

    // Convert dateOfBirth to Date object if provided
    const updateData: Record<string, any> = { ...updateProfileDto };
    if (updateProfileDto.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateProfileDto.dateOfBirth);
    }

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

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
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

    // Update user with verified BVN
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        bvn: verifyBvnDto.bvn,
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
    let newKycTier = user.kycTier;
    if (user.bvnVerified && !user.ninVerified) {
      newKycTier = 'TIER_3' as any; // Both BVN and NIN verified = Tier 3
    } else if (!user.bvnVerified) {
      newKycTier = 'TIER_2' as any; // Only NIN verified = Tier 2
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new ConflictException('Email already verified');
    }

    // Generate 6-digit code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    // TODO: Send email with verification code
    // For now, we'll log it (in production, use a service like SendGrid, AWS SES)
    console.log(
      `Email verification code for ${user.email}: ${verificationCode}`,
    );

    // Store verification code in database (expires in 10 minutes)
    // TODO: Create a VerificationCode model or use Redis for better performance
    // For now, we'll use SystemConfig as a temporary storage
    await this.prisma.systemConfig.upsert({
      where: { key: `email_verification_${userId}` },
      create: {
        key: `email_verification_${userId}`,
        value: verificationCode,
      },
      update: {
        value: verificationCode,
      },
    });

    return {
      message: 'Verification code sent to your email',
      expiresIn: '10 minutes',
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
    const storedCode = await this.prisma.systemConfig.findUnique({
      where: { key: `email_verification_${userId}` },
    });

    if (!storedCode || storedCode.value !== code) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    // Determine KYC tier upgrade
    let newKycTier = user.kycTier;
    if (user.phoneVerified && user.kycTier === 'TIER_0') {
      // Both email and phone verified = TIER_1
      newKycTier = 'TIER_1' as any;
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

    // Generate 6-digit code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    // TODO: Send SMS with verification code
    // For now, we'll log it (in production, use Twilio, Termii, or similar)
    console.log(
      `Phone verification code for ${user.phone}: ${verificationCode}`,
    );

    // Store verification code in database
    await this.prisma.systemConfig.upsert({
      where: { key: `phone_verification_${userId}` },
      create: {
        key: `phone_verification_${userId}`,
        value: verificationCode,
      },
      update: {
        value: verificationCode,
      },
    });

    return {
      message: 'Verification code sent to your phone',
      expiresIn: '10 minutes',
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
    const storedCode = await this.prisma.systemConfig.findUnique({
      where: { key: `phone_verification_${userId}` },
    });

    if (!storedCode || storedCode.value !== code) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    // Determine KYC tier upgrade
    let newKycTier = user.kycTier;
    if (user.emailVerified && user.kycTier === 'TIER_0') {
      // Both email and phone verified = TIER_1
      newKycTier = 'TIER_1' as any;
    }

    // Update user
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        phoneVerified: true,
        phoneVerifiedAt: new Date(),
        kycTier: newKycTier,
        status:
          user.emailVerified &&
          (user.bvnVerified || user.ninVerified || user.kycTier === 'TIER_0')
            ? 'ACTIVE'
            : 'PENDING_VERIFICATION',
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
      },
    });

    return {
      message: 'Phone number verified successfully',
      phoneVerified: true,
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
}
