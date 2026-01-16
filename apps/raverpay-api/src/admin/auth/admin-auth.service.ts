import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as argon2 from 'argon2';
import * as speakeasy from 'speakeasy';
import { ChangePasswordDto } from './dto/change-password.dto';
import { MfaEncryptionUtil } from '../../utils/mfa-encryption.util';
import { AuditService } from '../../common/services/audit.service';
import {
  AuditAction,
  AuditStatus,
  AuditSeverity,
} from '../../common/types/audit-log.types';
import { DeviceService, DeviceInfo } from '../../device/device.service';
import { randomUUID } from 'crypto';

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mfaEncryption: MfaEncryptionUtil,
    private readonly auditService: AuditService,
    private readonly deviceService: DeviceService,
  ) {}

  /**
   * Change password for admin user (first login or forced change)
   *
   * @param passwordChangeToken - Token from login response
   * @param dto - Password change data
   * @param deviceInfo - Device information
   * @param ipAddress - IP address
   * @returns User object and auth tokens
   */
  async changePassword(
    passwordChangeToken: string,
    dto: ChangePasswordDto,
    deviceInfo?: DeviceInfo,
    ipAddress?: string,
  ) {
    // Verify password-change token
    interface PasswordChangeTokenPayload {
      sub: string;
      purpose: string;
      email: string;
    }

    let payload: PasswordChangeTokenPayload;
    try {
      payload =
        this.jwtService.verify<PasswordChangeTokenPayload>(passwordChangeToken);
    } catch {
      throw new UnauthorizedException('Password change session expired');
    }

    if (payload.purpose !== 'password-change') {
      throw new UnauthorizedException('Invalid token purpose');
    }

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await argon2.verify(
      user.password,
      dto.currentPassword,
    );

    if (!isCurrentPasswordValid) {
      await this.auditService.log({
        userId: user.id,
        action: AuditAction.PASSWORD_CHANGED,
        resource: 'AUTH',
        status: AuditStatus.FAILURE,
        severity: AuditSeverity.HIGH,
        metadata: {
          reason: 'INVALID_CURRENT_PASSWORD',
          ipAddress,
        },
      });

      throw new UnauthorizedException('Current password is incorrect');
    }

    // Verify new password matches confirmation
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException(
        'New password and confirmation password do not match',
      );
    }

    // Verify new password is different from current password
    const isSamePassword = await argon2.verify(user.password, dto.newPassword);

    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    // Verify MFA code if MFA is enabled
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!dto.mfaCode) {
        throw new BadRequestException('MFA code is required');
      }

      // Validate MFA code format: must be 6 digits (TOTP) or 8 digits (backup code)
      const mfaCodeRegex = /^\d{6}$|^\d{8}$/;
      if (!mfaCodeRegex.test(dto.mfaCode)) {
        await this.auditService.log({
          userId: user.id,
          action: AuditAction.MFA_VERIFICATION_FAILED,
          resource: 'AUTH',
          status: AuditStatus.FAILURE,
          severity: AuditSeverity.MEDIUM,
          metadata: {
            reason: 'INVALID_MFA_CODE_FORMAT',
            ipAddress,
            codeLength: dto.mfaCode.length,
          },
        });

        throw new BadRequestException(
          'MFA code must be 6 digits (TOTP) or 8 digits (backup code)',
        );
      }

      // Try TOTP code first (6 digits)
      let isValidTotp = false;
      if (dto.mfaCode.length === 6) {
        const secret = this.mfaEncryption.decryptSecret(user.twoFactorSecret);
        isValidTotp = speakeasy.totp.verify({
          secret,
          encoding: 'base32',
          token: dto.mfaCode,
          window: 1,
        });
      }

      // If TOTP fails or code is 8 digits, try backup code
      let isValidBackup = false;
      if (!isValidTotp && dto.mfaCode.length === 8) {
        const backupCodes = user.mfaBackupCodes || [];
        for (const backupCode of backupCodes) {
          try {
            isValidBackup = await argon2.verify(backupCode, dto.mfaCode);
            if (isValidBackup) {
              // Remove used backup code
              const updatedBackupCodes = backupCodes.filter(
                (code) => code !== backupCode,
              );
              await this.prisma.user.update({
                where: { id: user.id },
                data: { mfaBackupCodes: updatedBackupCodes },
              });
              break;
            }
          } catch {
            continue;
          }
        }
      }

      if (!isValidTotp && !isValidBackup) {
        await this.auditService.log({
          userId: user.id,
          action: AuditAction.MFA_VERIFICATION_FAILED,
          resource: 'AUTH',
          status: AuditStatus.FAILURE,
          severity: AuditSeverity.MEDIUM,
          metadata: {
            reason: 'PASSWORD_CHANGE_MFA_FAILED',
            ipAddress,
            codeLength: dto.mfaCode.length,
          },
        });

        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    // Hash new password
    const hashedNewPassword = await argon2.hash(dto.newPassword);

    // Update password and clear mustChangePassword flag
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        lastPasswordChange: new Date(),
        mfaFailedAttempts: 0, // Reset MFA failed attempts
      },
    });

    // Log password change
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.PASSWORD_CHANGED,
      resource: 'AUTH',
      status: AuditStatus.SUCCESS,
      severity: AuditSeverity.HIGH,
      metadata: {
        ipAddress,
        deviceId: deviceInfo?.deviceId,
        reason: 'FIRST_LOGIN_PASSWORD_CHANGE',
      },
    });

    // Register/update device
    let deviceId: string | undefined;
    if (deviceInfo) {
      const deviceCheck = await this.deviceService.checkDeviceAuthorization(
        user.id,
        deviceInfo,
      );

      if (!deviceCheck.authorized || !deviceCheck.device) {
        await this.deviceService.registerNewDevice(user.id, deviceInfo);
      } else {
        await this.deviceService.updateDeviceActivity(
          deviceCheck.device.deviceId,
          ipAddress,
        );
      }
      deviceId = deviceInfo.deviceId;
    }

    // Generate access and refresh tokens
    const tokens = await this.generateTokens(user, deviceInfo, ipAddress);

    // Generate re-auth token for admin users
    const reAuthToken = this.jwtService.sign(
      {
        sub: user.id,
        purpose: 'reauth',
      },
      { expiresIn: '15m' },
    );

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
      reAuthToken,
    };
  }

  /**
   * Generate access and refresh tokens
   * (Reusing logic from AuthService)
   */
  private async generateTokens(
    user: any,
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
      this.jwtService.signAsync(payload, {
        expiresIn: '30m',
      }),
      this.jwtService.signAsync(
        { ...payload, jti: randomUUID() },
        {
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
        deviceId: deviceInfo?.deviceId,
        ipAddress,
        userAgent: deviceInfo?.userAgent,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 1800, // 30 minutes in seconds
    };
  }
}
