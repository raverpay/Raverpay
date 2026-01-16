import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
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

    // Verify MFA code if MFA secret exists (regardless of enabled status)
    // This handles pre-provisioned MFA that needs to be verified during password change
    const hasMfaSecret = !!user.twoFactorSecret;
    const isMfaEnabled = user.twoFactorEnabled === true;
    const needsMfaVerification = hasMfaSecret; // Require MFA if secret exists (pre-provisioned or enabled)

    // Log MFA requirement check for debugging
    this.logger.warn(
      `[PASSWORD CHANGE MFA CHECK] user=${user.id}, email=${user.email}, hasMfaSecret=${hasMfaSecret}, isMfaEnabled=${isMfaEnabled}, needsMfaVerification=${needsMfaVerification}, twoFactorSecretExists=${!!user.twoFactorSecret}`,
    );

    if (needsMfaVerification) {
      // CRITICAL: Check for missing, empty, or whitespace-only MFA code
      if (
        !dto.mfaCode ||
        typeof dto.mfaCode !== 'string' ||
        dto.mfaCode.trim().length === 0
      ) {
        this.logger.error(
          `[MFA CODE MISSING] user=${user.id}, email=${user.email}, mfaCodeProvided=${!!dto.mfaCode}, mfaCodeType=${typeof dto.mfaCode}, mfaCodeValue=${dto.mfaCode}`,
        );
        throw new BadRequestException(
          'MFA code is required. Please enter the code from your authenticator app or use a backup code.',
        );
      }

      // Check if account is locked due to MFA failures
      if (user.lockedUntil && new Date() < user.lockedUntil) {
        const minutesRemaining = Math.ceil(
          (user.lockedUntil.getTime() - Date.now()) / (1000 * 60),
        );
        throw new UnauthorizedException(
          `Account temporarily locked due to multiple failed MFA attempts. Please try again in ${minutesRemaining} minute(s) or contact support.`,
        );
      }

      // Trim whitespace from MFA code
      const trimmedMfaCode = dto.mfaCode.trim();

      // Validate MFA code format: must be 6 digits (TOTP) or 8 digits (backup code)
      const mfaCodeRegex = /^\d{6}$|^\d{8}$/;
      if (!mfaCodeRegex.test(trimmedMfaCode)) {
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
            context: 'PASSWORD_CHANGE',
          },
        });

        throw new BadRequestException(
          'MFA code must be 6 digits (TOTP) or 8 digits (backup code)',
        );
      }

      // Determine if secret is encrypted (MFA enabled) or temporary (pre-provisioned)
      // We already checked hasMfaSecret above, so twoFactorSecret is guaranteed to be non-null here
      if (!user.twoFactorSecret) {
        throw new BadRequestException('MFA secret not found');
      }

      let secret: string;
      let isTemporarySecret = false;

      if (isMfaEnabled) {
        // MFA is enabled - secret is encrypted
        secret = this.mfaEncryption.decryptSecret(user.twoFactorSecret);
      } else {
        // MFA is pre-provisioned but not enabled - secret is temporary (base32, not encrypted)
        secret = user.twoFactorSecret;
        isTemporarySecret = true;
      }

      // Try TOTP code first (6 digits)
      let isValidTotp = false;
      if (trimmedMfaCode.length === 6) {
        try {
          // CRITICAL: Verify TOTP code - must return exactly true to be valid
          const verifyResult = speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token: trimmedMfaCode,
            window: 1, // Allow 30 seconds clock drift
          });

          // speakeasy.totp.verify returns true/false/null/undefined
          // ONLY accept explicit true - anything else is invalid
          isValidTotp = verifyResult === true;

          // Log verification attempt for debugging (use warn level so it's visible)
          this.logger.warn(
            `[MFA VERIFICATION] user=${user.id}, email=${user.email}, code=${trimmedMfaCode}, secretLength=${secret.length}, verifyResult=${verifyResult}, isValidTotp=${isValidTotp}, isTemporarySecret=${isTemporarySecret}`,
          );

          // Additional safety check: if verifyResult is not explicitly true, ensure isValidTotp is false
          if (verifyResult !== true) {
            isValidTotp = false;
            this.logger.warn(
              `[MFA VERIFICATION FAILED] verifyResult was not true: ${verifyResult} (type: ${typeof verifyResult})`,
            );
          }
        } catch (error) {
          // If verification throws an error (e.g., invalid secret format), treat as invalid
          this.logger.error(
            `[MFA VERIFICATION ERROR] user=${user.id}, error=${error instanceof Error ? error.message : String(error)}, stack=${error instanceof Error ? error.stack : 'N/A'}`,
          );
          isValidTotp = false;
        }
      } else {
        // Code is not 6 digits, so TOTP verification won't be attempted
        isValidTotp = false;
        this.logger.warn(
          `[MFA VERIFICATION] Code length is ${trimmedMfaCode.length}, not 6 digits. Skipping TOTP verification.`,
        );
      }

      // If TOTP fails or code is 8 digits, try backup code
      let isValidBackup = false;
      let matchedBackupIndex = -1;
      if (!isValidTotp && trimmedMfaCode.length === 8) {
        const backupCodes = user.mfaBackupCodes || [];
        this.logger.warn(
          `[MFA BACKUP CODE CHECK] user=${user.id}, email=${user.email}, backupCodesCount=${backupCodes.length}`,
        );
        for (let i = 0; i < backupCodes.length; i++) {
          try {
            isValidBackup = await argon2.verify(backupCodes[i], trimmedMfaCode);
            if (isValidBackup) {
              matchedBackupIndex = i;
              this.logger.warn(
                `[MFA BACKUP CODE MATCH] user=${user.id}, email=${user.email}, matchedIndex=${i}`,
              );
              break;
            }
          } catch (error) {
            this.logger.warn(
              `[MFA BACKUP CODE VERIFY ERROR] user=${user.id}, index=${i}, error=${error instanceof Error ? error.message : String(error)}`,
            );
            continue;
          }
        }
      }

      // CRITICAL: Always check if MFA verification passed before allowing password change
      // CRITICAL CHECK: Ensure verification actually passed
      if (!isValidTotp && !isValidBackup) {
        // MFA verification failed - DO NOT allow password change
        this.logger.error(
          `[MFA VERIFICATION FAILED - PASSWORD CHANGE BLOCKED] user=${user.id}, email=${user.email}, code=${trimmedMfaCode}, codeLength=${trimmedMfaCode.length}, isValidTotp=${isValidTotp}, isValidBackup=${isValidBackup}, isTemporarySecret=${isTemporarySecret}, secretExists=${!!secret}, hasMfaSecret=${hasMfaSecret}`,
        );

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
          metadata: {
            reason: 'PASSWORD_CHANGE_MFA_FAILED',
            ipAddress,
            codeLength: trimmedMfaCode.length,
            codeProvided: trimmedMfaCode.substring(0, 2) + '****', // Log partial code for debugging (first 2 chars only)
            attemptCount: updatedUser.mfaFailedAttempts,
            isPreProvisioned: isTemporarySecret,
            isValidTotp,
            isValidBackup,
          },
        });

        // Lock account after 5 failed attempts (30 minutes lockout)
        if (updatedUser.mfaFailedAttempts >= 5) {
          const lockoutUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
          await this.prisma.user.update({
            where: { id: user.id },
            data: {
              lockedUntil: lockoutUntil,
            },
          });

          this.logger.warn(
            `Account locked due to MFA failures during password change: ${user.email} (IP: ${ipAddress})`,
          );

          throw new UnauthorizedException(
            'Account temporarily locked due to multiple failed MFA attempts. Please try again in 30 minutes or contact support.',
          );
        }

        const attemptsRemaining = 5 - updatedUser.mfaFailedAttempts;
        throw new UnauthorizedException(
          `Invalid MFA code. ${attemptsRemaining} attempt(s) remaining.`,
        );
      }

      // MFA verification passed - log success
      // CRITICAL: Double-check that verification actually passed
      if (!isValidTotp && !isValidBackup) {
        // This should never happen if the code above is correct, but add defensive check
        this.logger.error(
          `[CRITICAL ERROR] MFA verification check passed but both isValidTotp and isValidBackup are false! user=${user.id}, email=${user.email}, code=${trimmedMfaCode}`,
        );
        throw new UnauthorizedException('MFA verification failed');
      }

      // Additional safety: Explicitly verify the boolean values
      const verificationPassed = isValidTotp === true || isValidBackup === true;
      if (!verificationPassed) {
        this.logger.error(
          `[CRITICAL ERROR] MFA verification did not pass! isValidTotp=${isValidTotp} (type: ${typeof isValidTotp}), isValidBackup=${isValidBackup} (type: ${typeof isValidBackup})`,
        );
        throw new UnauthorizedException('MFA verification failed');
      }

      this.logger.warn(
        `[MFA VERIFICATION SUCCESS] user=${user.id}, email=${user.email}, method=${isValidTotp ? 'TOTP' : 'BACKUP'}, isValidTotp=${isValidTotp}, isValidBackup=${isValidBackup}, codeLength=${trimmedMfaCode.length}`,
      );

      // MFA verification successful!
      // If this was a pre-provisioned MFA (temporary secret), enable it now
      if (isTemporarySecret && isValidTotp) {
        // Encrypt the secret and enable MFA
        const encryptedSecret = this.mfaEncryption.encryptSecret(secret);
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            twoFactorSecret: encryptedSecret,
            twoFactorEnabled: true,
            mfaEnabledAt: new Date(),
            mfaFailedAttempts: 0, // Reset failed attempts
            lastMfaSuccess: new Date(),
          },
        });

        this.logger.log(
          `MFA enabled during password change for user: ${user.email} (pre-provisioned)`,
        );

        await this.auditService.log({
          userId: user.id,
          action: AuditAction.MFA_ENABLED,
          resource: 'AUTH',
          status: AuditStatus.SUCCESS,
          severity: AuditSeverity.HIGH,
          metadata: {
            method: 'PASSWORD_CHANGE_VERIFICATION',
            ipAddress,
            enabledAt: new Date().toISOString(),
          },
        });
      } else if (isValidBackup && matchedBackupIndex >= 0) {
        // Backup code used - remove it
        const backupCodes = user.mfaBackupCodes || [];
        const updatedBackupCodes = backupCodes.filter(
          (_code, index) => index !== matchedBackupIndex,
        );

        // If MFA was pre-provisioned, enable it now
        const updateData: any = {
          mfaBackupCodes: updatedBackupCodes,
          mfaFailedAttempts: 0,
          lastMfaSuccess: new Date(),
        };

        if (isTemporarySecret) {
          const encryptedSecret = this.mfaEncryption.encryptSecret(secret);
          updateData.twoFactorSecret = encryptedSecret;
          updateData.twoFactorEnabled = true;
          updateData.mfaEnabledAt = new Date();

          await this.auditService.log({
            userId: user.id,
            action: AuditAction.MFA_ENABLED,
            resource: 'AUTH',
            status: AuditStatus.SUCCESS,
            severity: AuditSeverity.HIGH,
            metadata: {
              method: 'PASSWORD_CHANGE_BACKUP_CODE',
              ipAddress,
              enabledAt: new Date().toISOString(),
            },
          });
        }

        await this.prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      } else if (isValidTotp && !isTemporarySecret) {
        // MFA already enabled and verified with TOTP
        // Note: mfaEnabledAt should already be set (when MFA was first enabled)
        // We only update lastMfaSuccess (when it was last verified), not mfaEnabledAt
        // If mfaEnabledAt is null (data inconsistency), set it now as a safety measure
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            mfaFailedAttempts: 0,
            lastMfaSuccess: new Date(), // Update last successful verification
            // Only set mfaEnabledAt if it's null (data inconsistency fix)
            // Otherwise, preserve the original mfaEnabledAt timestamp (when MFA was first enabled)
            ...(user.mfaEnabledAt ? {} : { mfaEnabledAt: new Date() }),
          },
        });
      } else if (isValidBackup && !isTemporarySecret) {
        // MFA already enabled and verified with backup code
        // Same logic: update lastMfaSuccess, preserve mfaEnabledAt
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            mfaFailedAttempts: 0,
            lastMfaSuccess: new Date(), // Update last successful verification
            // Only set mfaEnabledAt if it's null (data inconsistency fix)
            ...(user.mfaEnabledAt ? {} : { mfaEnabledAt: new Date() }),
          },
        });
      } else {
        // MFA already enabled, reset failed attempts
        // This shouldn't happen if verification passed, but add as fallback
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            mfaFailedAttempts: 0,
            lastMfaSuccess: new Date(),
          },
        });
      }
    }

    // Hash new password
    const hashedNewPassword = await argon2.hash(dto.newPassword);

    // Update password and clear mustChangePassword flag
    // Note: mfaFailedAttempts is reset in MFA verification section above if MFA was verified
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        lastPasswordChange: new Date(),
        // Don't reset mfaFailedAttempts here - it's handled in MFA verification section
        // Only reset if MFA was not required (no secret exists)
        ...(needsMfaVerification ? {} : { mfaFailedAttempts: 0 }), // Reset if no MFA was required
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

    // Fetch updated user from database to ensure we return the latest data
    // (password change and MFA status updates)
    const updatedUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!updatedUser) {
      throw new NotFoundException('User not found after password change');
    }

    // Generate access and refresh tokens
    const tokens = await this.generateTokens(
      updatedUser,
      deviceInfo,
      ipAddress,
    );

    // Generate re-auth token for admin users
    const reAuthToken = this.jwtService.sign(
      {
        sub: updatedUser.id,
        purpose: 'reauth',
      },
      { expiresIn: '15m' },
    );

    // Update last login
    await this.prisma.user.update({
      where: { id: updatedUser.id },
      data: {
        lastLoginAt: new Date(),
        lastSuccessfulLoginIp: ipAddress,
      },
    });

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = updatedUser;

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
