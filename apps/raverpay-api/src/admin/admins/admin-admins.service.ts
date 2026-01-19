import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, UserStatus, AdminIpWhitelist } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  CreateAdminDto,
  UpdateAdminDto,
  ProvisionAdminDto,
} from '../dto/admin.dto';
import { EmailService } from '../../services/email/email.service';
import { AdminSecurityService } from '../security/admin-security.service';
import { AuthService } from '../../auth/auth.service';
import { AuditService } from '../../common/services/audit.service';
import {
  AuditAction,
  AuditStatus,
  AuditSeverity,
} from '../../common/types/audit-log.types';
import { adminWelcomeEmailTemplate } from '../../services/email/templates/admin-welcome.template';
import { adminProvisioningEmailTemplate } from '../../services/email/templates/admin-provisioning.template';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminAdminsService {
  private readonly logger = new Logger(AdminAdminsService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private adminSecurityService: AdminSecurityService,
    private authService: AuthService,
    private auditService: AuditService,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'noreply@raverpay.com';
    this.fromName =
      this.configService.get<string>('RESEND_FROM_NAME') || 'RaverPay';

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('✅ Resend client initialized for admin welcome emails');
    } else {
      this.resend = null;
      this.logger.warn(
        '⚠️ RESEND_API_KEY not found - Cannot send admin welcome emails',
      );
    }
  }

  /**
   * Get all admin users (ADMIN, SUPPORT, SUPER_ADMIN)
   */
  async getAdmins(
    page: number = 1,
    limit: number = 20,
    role?: UserRole,
    status?: UserStatus,
    search?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      role: {
        in: [UserRole.ADMIN, UserRole.SUPPORT, UserRole.SUPER_ADMIN],
      },
    };

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [admins, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: admins,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get admin statistics
   */
  async getStats() {
    const [total, byRole, byStatus] = await Promise.all([
      this.prisma.user.count({
        where: {
          role: {
            in: [UserRole.ADMIN, UserRole.SUPPORT, UserRole.SUPER_ADMIN],
          },
        },
      }),
      this.prisma.user.groupBy({
        by: ['role'],
        where: {
          role: {
            in: [UserRole.ADMIN, UserRole.SUPPORT, UserRole.SUPER_ADMIN],
          },
        },
        _count: true,
      }),
      this.prisma.user.groupBy({
        by: ['status'],
        where: {
          role: {
            in: [UserRole.ADMIN, UserRole.SUPPORT, UserRole.SUPER_ADMIN],
          },
        },
        _count: true,
      }),
    ]);

    return {
      total,
      byRole: byRole.map((item) => ({
        role: item.role,
        count: item._count,
      })),
      byStatus: byStatus.map((item) => ({
        status: item.status,
        count: item._count,
      })),
    };
  }

  /**
   * Get single admin by ID
   */
  async getAdminById(adminId: string) {
    const admin = await this.prisma.user.findFirst({
      where: {
        id: adminId,
        role: {
          in: [UserRole.ADMIN, UserRole.SUPPORT, UserRole.SUPER_ADMIN],
        },
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    return admin;
  }

  /**
   * Create new admin user
   * Only SUPER_ADMIN can create other admins
   * Handles IP whitelist, email sending, and MFA setup
   */
  async createAdmin(requesterId: string, dto: CreateAdminDto) {
    // Check if requester is SUPER_ADMIN
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
    });

    if (!requester || requester.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can create admin users');
    }

    // Check if email already exists
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    // Check if personal email already exists (if provided)
    if (dto.personalEmail) {
      const existingPersonalEmail = await this.prisma.user.findUnique({
        where: { personalEmail: dto.personalEmail },
      });

      if (existingPersonalEmail) {
        throw new ConflictException('Personal email already exists');
      }
    }

    // Check if phone already exists
    const existingPhone = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (existingPhone) {
      throw new ConflictException('Phone number already exists');
    }

    // Validate role
    const validRoles: Array<'ADMIN' | 'SUPPORT' | 'SUPER_ADMIN'> = [
      'ADMIN',
      'SUPPORT',
      'SUPER_ADMIN',
    ];
    if (!validRoles.includes(dto.role)) {
      throw new ForbiddenException('Invalid role for admin user');
    }

    // Hash password
    const hashedPassword = await argon2.hash(dto.password);

    // Set grace period if skipIpWhitelist is true (24 hours from now)
    const gracePeriodUntil = dto.skipIpWhitelist
      ? new Date(Date.now() + 24 * 60 * 60 * 1000)
      : null;

    // Create admin user
    const admin = await this.prisma.user.create({
      data: {
        email: dto.email,
        personalEmail: dto.personalEmail || null,
        phone: dto.phone,
        firstName: dto.firstName,
        lastName: dto.lastName,
        password: hashedPassword,
        role: dto.role,
        status: UserStatus.ACTIVE,
        emailVerified: true, // Admin accounts are pre-verified
        phoneVerified: true,
        mustChangePassword: true, // Require password change on first login
        passwordChangedAt: null, // No password change yet
        ipWhitelistGracePeriodUntil: gracePeriodUntil, // Grace period for IP whitelist
      },
      select: {
        id: true,
        email: true,
        personalEmail: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // Handle IP whitelist
    let ipWhitelistStatus = 'Not configured - Contact IT to whitelist your IP';
    let ipWhitelistEntry: AdminIpWhitelist | null = null;

    if (dto.initialIpAddress) {
      try {
        // Calculate expiry date (24 hours from now if skipIpWhitelist is true)
        const expiresAt = dto.skipIpWhitelist
          ? new Date(Date.now() + 24 * 60 * 60 * 1000)
          : null;

        const whitelistResult = await this.adminSecurityService.addIpWhitelist(
          {
            ipAddress: dto.initialIpAddress,
            description: `Initial IP for ${admin.firstName} ${admin.lastName} (${admin.email})`,
            userId: admin.id,
            isActive: true,
          },
          requesterId,
        );

        // Extract AdminIpWhitelist from result (which includes creator relation)
        ipWhitelistEntry = {
          id: whitelistResult.id,
          ipAddress: whitelistResult.ipAddress,
          description: whitelistResult.description,
          userId: whitelistResult.userId,
          isActive: whitelistResult.isActive,
          expiresAt: whitelistResult.expiresAt,
          createdBy: whitelistResult.createdBy,
          createdAt: whitelistResult.createdAt,
          updatedAt: whitelistResult.updatedAt,
          lastUsedAt: whitelistResult.lastUsedAt,
          usageCount: whitelistResult.usageCount,
        };

        // Update expiresAt if it's a temporary entry
        if (expiresAt && ipWhitelistEntry) {
          ipWhitelistEntry = await this.prisma.adminIpWhitelist.update({
            where: { id: ipWhitelistEntry.id },
            data: { expiresAt },
          });
        }

        ipWhitelistStatus = dto.skipIpWhitelist
          ? `${dto.initialIpAddress} (Temporary - expires in 24 hours)`
          : `${dto.initialIpAddress} (Permanent)`;

        await this.auditService.log({
          userId: requesterId,
          action: AuditAction.IP_WHITELIST_ADDED,
          resource: 'SECURITY',
          resourceId: ipWhitelistEntry.id,
          status: AuditStatus.SUCCESS,
          severity: AuditSeverity.MEDIUM,
          metadata: {
            ipAddress: dto.initialIpAddress,
            userId: admin.id,
            isTemporary: dto.skipIpWhitelist,
            expiresAt: expiresAt?.toISOString(),
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to create IP whitelist entry for ${admin.email}:`,
          error,
        );
        // Don't fail admin creation if IP whitelist fails
        ipWhitelistStatus = `Failed to whitelist ${dto.initialIpAddress} - Contact IT`;
      }
    }

    // Handle MFA setup if requested
    let mfaQrCode: string | null = null;
    let mfaBackupCodes: string[] = [];
    let mfaStatus = 'Set up on first login';

    if (dto.sendMfaSetup) {
      try {
        const mfaSetup = await this.authService.setupMfa(admin.id);
        mfaQrCode = mfaSetup.qrCode;
        mfaBackupCodes = mfaSetup.backupCodes || [];

        mfaStatus = 'QR code attached to email - Scan with authenticator app';

        await this.auditService.log({
          userId: requesterId,
          action: AuditAction.MFA_ENABLED,
          resource: 'AUTH',
          resourceId: admin.id,
          status: AuditStatus.SUCCESS,
          severity: AuditSeverity.HIGH,
          metadata: {
            adminEmail: admin.email,
            setupBy: requester.email,
            viaEmail: true,
          },
        });
      } catch (error) {
        this.logger.error(`Failed to setup MFA for ${admin.email}:`, error);
        // Don't fail admin creation if MFA setup fails
        mfaStatus = 'Failed to generate MFA - Set up on first login';
      }
    }

    // Send welcome email if requested
    const sendCredentials = dto.sendCredentials !== false; // Default to true
    let emailSent = false;

    if (sendCredentials) {
      try {
        const recipientEmail = dto.personalEmail || dto.email;
        const { html, subject } = adminWelcomeEmailTemplate({
          firstName: admin.firstName,
          email: admin.email,
          password: dto.password, // Send plain password in email
          loginUrl:
            this.configService.get<string>('ADMIN_LOGIN_URL') ||
            'https://myadmin.raverpay.com/login',
          ipWhitelistStatus,
          mfaStatus,
          hasMfaQrCode: !!mfaQrCode,
          backupCodes: mfaBackupCodes.length > 0 ? mfaBackupCodes : undefined,
        });

        // Prepare attachments (MFA QR code if available)
        const attachments: Array<{
          filename: string;
          content: string;
        }> = [];

        if (mfaQrCode) {
          // Convert data URL to buffer
          const base64Data = mfaQrCode.replace(/^data:image\/png;base64,/, '');
          attachments.push({
            filename: 'mfa-qr-code.png',
            content: base64Data,
          });
        }

        if (this.resend) {
          const emailResult = await this.resend.emails.send({
            from: `${this.fromName} <${this.fromEmail}>`,
            to: [recipientEmail],
            subject,
            html,
            attachments:
              attachments.length > 0
                ? attachments.map((att) => ({
                    filename: att.filename,
                    content: att.content,
                  }))
                : undefined,
          });

          if (emailResult.error) {
            throw new Error(emailResult.error.message);
          }

          emailSent = true;
          this.logger.log(
            `✅ Admin welcome email sent to ${recipientEmail} (ID: ${emailResult.data?.id})`,
          );

          await this.auditService.log({
            userId: requesterId,
            action: AuditAction.EMAIL_SENT,
            resource: 'ADMIN',
            resourceId: admin.id,
            status: AuditStatus.SUCCESS,
            severity: AuditSeverity.LOW,
            metadata: {
              recipientEmail,
              emailType: 'admin_welcome',
              hasMfaQrCode: !!mfaQrCode,
              hasIpWhitelist: !!ipWhitelistEntry,
            },
          });
        } else {
          this.logger.warn(
            `⚠️ Resend client not initialized - Skipping email to ${recipientEmail}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to send welcome email to ${admin.email}:`,
          error,
        );
        // Don't fail admin creation if email fails
      }
    }

    // Create audit log
    await this.auditService.log({
      userId: requesterId,
      action: AuditAction.CREATE_ADMIN,
      resource: 'User',
      resourceId: admin.id,
      status: AuditStatus.SUCCESS,
      severity: AuditSeverity.HIGH,
      metadata: {
        adminEmail: admin.email,
        adminRole: admin.role,
        personalEmail: dto.personalEmail,
        ipWhitelisted: !!ipWhitelistEntry,
        mfaSetup: dto.sendMfaSetup,
        emailSent,
      },
    });

    this.logger.log(
      `Admin created: ${admin.email} (${admin.role}) by ${requester.email}`,
    );

    return {
      ...admin,
      ipWhitelistStatus,
      mfaStatus,
      emailSent,
      ipWhitelistEntry: ipWhitelistEntry
        ? {
            id: ipWhitelistEntry.id,
            ipAddress: ipWhitelistEntry.ipAddress,
            expiresAt: ipWhitelistEntry.expiresAt,
          }
        : null,
    };
  }

  /**
   * Update admin user
   * Handles IP whitelist updates and MFA status changes
   */
  async updateAdmin(requesterId: string, adminId: string, dto: UpdateAdminDto) {
    // Check if requester is SUPER_ADMIN
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
    });

    if (!requester || requester.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can update admin users');
    }

    // Check if admin exists
    const existingAdmin = await this.prisma.user.findFirst({
      where: {
        id: adminId,
        role: {
          in: [UserRole.ADMIN, UserRole.SUPPORT, UserRole.SUPER_ADMIN],
        },
      },
      include: {
        // Include IP whitelist entries for this user
        assignedIpWhitelists: {
          where: { userId: adminId },
        },
      },
    });

    if (!existingAdmin) {
      throw new NotFoundException('Admin not found');
    }

    // Prevent self-demotion
    if (
      adminId === requesterId &&
      dto.role &&
      dto.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Cannot demote yourself');
    }

    // Prevent self-deactivation
    if (
      adminId === requesterId &&
      dto.status &&
      dto.status !== UserStatus.ACTIVE
    ) {
      throw new ForbiddenException('Cannot deactivate yourself');
    }

    // Handle MFA status change
    const mfaEnabled = dto.mfaEnabled ?? dto.twoFactorEnabled;
    if (mfaEnabled !== undefined) {
      if (mfaEnabled === false) {
        // Disable MFA - clear secret and backup codes
        await this.prisma.user.update({
          where: { id: adminId },
          data: {
            twoFactorEnabled: false,
            twoFactorSecret: null,
            mfaBackupCodes: [],
            mfaFailedAttempts: 0,
            lastMfaFailure: null,
          },
        });

        await this.auditService.log({
          userId: requesterId,
          action: AuditAction.MFA_DISABLED,
          resource: 'AUTH',
          resourceId: adminId,
          status: AuditStatus.SUCCESS,
          severity: AuditSeverity.HIGH,
          metadata: {
            adminEmail: existingAdmin.email,
            disabledBy: requester.email,
            reason: 'admin_edit',
          },
        });

        this.logger.log(
          `MFA disabled for admin ${existingAdmin.email} by ${requester.email}`,
        );
      } else {
        // Enable MFA - but only if already set up
        if (!existingAdmin.twoFactorSecret) {
          throw new BadRequestException(
            'Cannot enable MFA - admin must set up MFA first',
          );
        }

        await this.prisma.user.update({
          where: { id: adminId },
          data: {
            twoFactorEnabled: true,
          },
        });

        await this.auditService.log({
          userId: requesterId,
          action: AuditAction.MFA_ENABLED,
          resource: 'AUTH',
          resourceId: adminId,
          status: AuditStatus.SUCCESS,
          severity: AuditSeverity.HIGH,
          metadata: {
            adminEmail: existingAdmin.email,
            enabledBy: requester.email,
            reason: 'admin_edit',
          },
        });

        this.logger.log(
          `MFA enabled for admin ${existingAdmin.email} by ${requester.email}`,
        );
      }
    }

    // Handle IP whitelist updates
    if (dto.ipAddresses !== undefined) {
      const existingIps = existingAdmin.assignedIpWhitelists.map(
        (entry) => entry.ipAddress,
      );
      const newIps = dto.ipAddresses || [];

      // Remove IPs that are no longer in the list
      const ipsToRemove = existingIps.filter((ip) => !newIps.includes(ip));
      for (const ip of ipsToRemove) {
        const entry = existingAdmin.assignedIpWhitelists.find(
          (e) => e.ipAddress === ip,
        );
        if (entry) {
          // removeIpWhitelist already logs the action, but we'll add additional context
          await this.adminSecurityService.removeIpWhitelist(entry.id);
          // Log additional context for admin edit
          await this.auditService.log({
            userId: requesterId,
            action: AuditAction.IP_WHITELIST_REMOVED,
            resource: 'SECURITY',
            resourceId: entry.id,
            status: AuditStatus.SUCCESS,
            severity: AuditSeverity.MEDIUM,
            metadata: {
              ipAddress: ip,
              userId: adminId,
              adminEmail: existingAdmin.email,
              reason: 'admin_edit',
              removedBy: requester.email,
            },
          });
        }
      }

      // Add new IPs that aren't already whitelisted
      const ipsToAdd = newIps.filter((ip) => !existingIps.includes(ip));
      for (const ip of ipsToAdd) {
        try {
          const entry = await this.adminSecurityService.addIpWhitelist(
            {
              ipAddress: ip,
              description: `IP whitelist for ${existingAdmin.firstName} ${existingAdmin.lastName} (${existingAdmin.email})`,
              userId: adminId,
              isActive: true,
            },
            requesterId,
          );

          await this.auditService.log({
            userId: requesterId,
            action: AuditAction.IP_WHITELIST_ADDED,
            resource: 'SECURITY',
            resourceId: entry.id,
            status: AuditStatus.SUCCESS,
            severity: AuditSeverity.MEDIUM,
            metadata: {
              ipAddress: ip,
              userId: adminId,
              adminEmail: existingAdmin.email,
              reason: 'admin_edit',
            },
          });
        } catch (error) {
          this.logger.error(
            `Failed to add IP ${ip} to whitelist for ${existingAdmin.email}:`,
            error,
          );
          // Continue with other IPs even if one fails
        }
      }
    }

    // Update basic admin fields
    const admin = await this.prisma.user.update({
      where: { id: adminId },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.phone && { phone: dto.phone }),
        ...(dto.role && { role: dto.role }),
        ...(dto.status && { status: dto.status }),
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Get updated IP whitelist entries
    const ipWhitelistEntries = await this.prisma.adminIpWhitelist.findMany({
      where: { userId: adminId },
      select: {
        id: true,
        ipAddress: true,
        description: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Create audit log
    await this.auditService.log({
      userId: requesterId,
      action: AuditAction.UPDATE_ADMIN,
      resource: 'User',
      resourceId: admin.id,
      status: AuditStatus.SUCCESS,
      severity: AuditSeverity.HIGH,
      metadata: {
        changes: JSON.parse(JSON.stringify(dto)),
        adminEmail: admin.email,
        ipWhitelistUpdated: dto.ipAddresses !== undefined,
        mfaStatusUpdated: mfaEnabled !== undefined,
      },
    });

    return {
      ...admin,
      ipWhitelistEntries,
    };
  }

  /**
   * Delete admin user (deactivate)
   */
  async deleteAdmin(requesterId: string, adminId: string) {
    // Check if requester is SUPER_ADMIN
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
    });

    if (!requester || requester.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can delete admin users');
    }

    // Prevent self-deletion
    if (adminId === requesterId) {
      throw new ForbiddenException('Cannot delete yourself');
    }

    // Check if admin exists
    const existingAdmin = await this.prisma.user.findFirst({
      where: {
        id: adminId,
        role: {
          in: [UserRole.ADMIN, UserRole.SUPPORT, UserRole.SUPER_ADMIN],
        },
      },
    });

    if (!existingAdmin) {
      throw new NotFoundException('Admin not found');
    }

    // Soft delete by setting status to BANNED
    await this.prisma.user.update({
      where: { id: adminId },
      data: { status: UserStatus.BANNED },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: requesterId,
        action: 'DELETE_ADMIN',
        resource: 'User',
        resourceId: adminId,
        metadata: {
          adminEmail: existingAdmin.email,
          adminRole: existingAdmin.role,
        },
      },
    });

    this.logger.log(
      `Admin deleted: ${existingAdmin.email} by ${requester.email}`,
    );

    return { success: true, message: 'Admin deactivated successfully' };
  }

  /**
   * Reset admin password
   */
  async resetPassword(
    requesterId: string,
    adminId: string,
    newPassword: string,
  ) {
    // Check if requester is SUPER_ADMIN
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
    });

    if (!requester || requester.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Only SUPER_ADMIN can reset admin passwords',
      );
    }

    // Check if admin exists
    const existingAdmin = await this.prisma.user.findFirst({
      where: {
        id: adminId,
        role: {
          in: [UserRole.ADMIN, UserRole.SUPPORT, UserRole.SUPER_ADMIN],
        },
      },
    });

    if (!existingAdmin) {
      throw new NotFoundException('Admin not found');
    }

    // Hash new password
    const hashedPassword = await argon2.hash(newPassword);

    await this.prisma.user.update({
      where: { id: adminId },
      data: { password: hashedPassword },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: requesterId,
        action: 'RESET_ADMIN_PASSWORD',
        resource: 'User',
        resourceId: adminId,
        metadata: {
          adminEmail: existingAdmin.email,
        },
      },
    });

    return { success: true, message: 'Password reset successfully' };
  }

  /**
   * Provision admin account
   * Adds IP to whitelist, optionally generates MFA setup, and sends provisioning email
   */
  async provisionAdmin(
    requesterId: string,
    adminId: string,
    dto: ProvisionAdminDto,
  ) {
    // Check if requester is SUPER_ADMIN
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
    });

    if (!requester || requester.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Only SUPER_ADMIN can provision admin accounts',
      );
    }

    // Check if admin exists
    const admin = await this.prisma.user.findFirst({
      where: {
        id: adminId,
        role: {
          in: [UserRole.ADMIN, UserRole.SUPPORT, UserRole.SUPER_ADMIN],
        },
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Add IP to whitelist
    let ipWhitelistEntry: AdminIpWhitelist | null = null;
    let ipWhitelistStatus = 'Failed to whitelist IP';

    try {
      const whitelistResult = await this.adminSecurityService.addIpWhitelist(
        {
          ipAddress: dto.ipAddress,
          description:
            dto.description ||
            `Provisioned IP for ${admin.firstName} ${admin.lastName} (${admin.email})`,
          userId: adminId,
          isActive: true,
        },
        requesterId,
      );

      // Extract the AdminIpWhitelist from the result (which includes creator relation)
      ipWhitelistEntry = {
        id: whitelistResult.id,
        ipAddress: whitelistResult.ipAddress,
        description: whitelistResult.description,
        userId: whitelistResult.userId,
        isActive: whitelistResult.isActive,
        expiresAt: whitelistResult.expiresAt,
        createdBy: whitelistResult.createdBy,
        createdAt: whitelistResult.createdAt,
        updatedAt: whitelistResult.updatedAt,
        lastUsedAt: whitelistResult.lastUsedAt,
        usageCount: whitelistResult.usageCount,
      };

      ipWhitelistStatus = `${dto.ipAddress} (Active)`;

      await this.auditService.log({
        userId: requesterId,
        action: AuditAction.IP_WHITELIST_ADDED,
        resource: 'SECURITY',
        resourceId: ipWhitelistEntry.id,
        status: AuditStatus.SUCCESS,
        severity: AuditSeverity.MEDIUM,
        metadata: {
          ipAddress: dto.ipAddress,
          userId: adminId,
          adminEmail: admin.email,
          reason: 'provisioning',
          provisionedBy: requester.email,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to add IP ${dto.ipAddress} to whitelist for ${admin.email}:`,
        error,
      );
      // Continue with MFA and email even if IP whitelist fails
    }

    // Handle MFA setup if requested
    let mfaQrCode: string | null = null;
    const mfaBackupCodes: string[] = [];
    let mfaStatus = 'MFA already enabled or not requested';

    if (dto.setupMfa) {
      // Check if MFA is already enabled
      if (admin.twoFactorEnabled && admin.twoFactorSecret) {
        mfaStatus = 'MFA is already enabled for this account';
      } else {
        try {
          const mfaSetup = await this.authService.setupMfa(adminId);
          mfaQrCode = mfaSetup.qrCode;

          mfaStatus =
            'QR code attached to email - Scan with authenticator app to enable';

          await this.auditService.log({
            userId: requesterId,
            action: AuditAction.MFA_ENABLED,
            resource: 'AUTH',
            resourceId: adminId,
            status: AuditStatus.SUCCESS,
            severity: AuditSeverity.HIGH,
            metadata: {
              adminEmail: admin.email,
              setupBy: requester.email,
              viaEmail: true,
              reason: 'provisioning',
            },
          });
        } catch (error) {
          this.logger.error(`Failed to setup MFA for ${admin.email}:`, error);
          mfaStatus = 'Failed to generate MFA - Admin can set up manually';
        }
      }
    }

    // Send provisioning email
    let emailSent = false;

    try {
      const recipientEmail = admin.personalEmail || admin.email;
      const { html, subject } = adminProvisioningEmailTemplate({
        firstName: admin.firstName,
        email: admin.email,
        loginUrl:
          this.configService.get<string>('ADMIN_LOGIN_URL') ||
          'https://myadmin.raverpay.com/login',
        ipAddress: dto.ipAddress,
        ipWhitelistStatus,
        mfaStatus,
        hasMfaQrCode: !!mfaQrCode,
        passwordResetUrl:
          this.configService.get<string>('ADMIN_PASSWORD_RESET_URL') ||
          undefined,
      });

      // Prepare attachments (MFA QR code if available)
      const attachments: Array<{
        filename: string;
        content: string;
      }> = [];

      if (mfaQrCode) {
        // Convert data URL to buffer
        const base64Data = mfaQrCode.replace(/^data:image\/png;base64,/, '');
        attachments.push({
          filename: 'mfa-qr-code.png',
          content: base64Data,
        });
      }

      if (this.resend) {
        const emailResult = await this.resend.emails.send({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: [recipientEmail],
          subject,
          html,
          attachments:
            attachments.length > 0
              ? attachments.map((att) => ({
                  filename: att.filename,
                  content: att.content,
                }))
              : undefined,
        });

        if (emailResult.error) {
          throw new Error(emailResult.error.message);
        }

        emailSent = true;
        this.logger.log(
          `✅ Admin provisioning email sent to ${recipientEmail} (ID: ${emailResult.data?.id})`,
        );

        await this.auditService.log({
          userId: requesterId,
          action: AuditAction.EMAIL_SENT,
          resource: 'ADMIN',
          resourceId: adminId,
          status: AuditStatus.SUCCESS,
          severity: AuditSeverity.LOW,
          metadata: {
            recipientEmail,
            emailType: 'admin_provisioning',
            hasMfaQrCode: !!mfaQrCode,
            hasIpWhitelist: !!ipWhitelistEntry,
          },
        });
      } else {
        this.logger.warn(
          `⚠️ Resend client not initialized - Skipping email to ${recipientEmail}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to send provisioning email to ${admin.email}:`,
        error,
      );
      // Don't fail provisioning if email fails
    }

    // Create audit log for provisioning
    await this.auditService.log({
      userId: requesterId,
      action: AuditAction.UPDATE_ADMIN,
      resource: 'User',
      resourceId: adminId,
      status: AuditStatus.SUCCESS,
      severity: AuditSeverity.HIGH,
      metadata: {
        adminEmail: admin.email,
        reason: 'provisioning',
        ipAddress: dto.ipAddress,
        ipWhitelisted: !!ipWhitelistEntry,
        mfaSetup: dto.setupMfa,
        emailSent,
      },
    });

    this.logger.log(
      `Admin provisioned: ${admin.email} by ${requester.email} (IP: ${dto.ipAddress}, MFA: ${dto.setupMfa})`,
    );

    return {
      success: true,
      message: 'Admin account provisioned successfully',
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
      },
      ipWhitelistEntry: ipWhitelistEntry
        ? {
            id: ipWhitelistEntry.id,
            ipAddress: ipWhitelistEntry.ipAddress,
            status: ipWhitelistStatus,
          }
        : null,
      mfaStatus,
      emailSent,
    };
  }
}
