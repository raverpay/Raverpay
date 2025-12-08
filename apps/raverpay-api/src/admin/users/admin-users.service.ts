import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService } from '../../common/services/hierarchy.service';
import { AccountLockingService } from '../../common/services/account-locking.service';
import { NotificationDispatcherService } from '../../notifications/notification-dispatcher.service';
import {
  QueryUsersDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
  UpdateKYCTierDto,
  LockAccountDto,
  UnlockAccountDto,
} from '../dto';
import { UserRole, UserStatus, KYCTier, Prisma } from '@prisma/client';

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    private prisma: PrismaService,
    private hierarchyService: HierarchyService,
    private notificationDispatcher: NotificationDispatcherService,
    private accountLockingService: AccountLockingService,
  ) {}

  /**
   * Get paginated list of users with filters
   */
  async getUsers(query: QueryUsersDto) {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      status,
      kycTier,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) where.role = role;
    if (status) where.status = status;
    if (kycTier) where.kycTier = kycTier;

    // Get users and total count
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          kycTier: true,
          emailVerified: true,
          phoneVerified: true,
          createdAt: true,
          lastLoginAt: true,
          wallets: {
            where: {
              type: 'NAIRA',
            },
            select: {
              balance: true,
              isLocked: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user statistics
   */
  async getUserStats() {
    const [
      totalUsers,
      byRole,
      byStatus,
      byKYCTier,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
    ] = await Promise.all([
      // Total users
      this.prisma.user.count(),

      // By role
      this.prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),

      // By status
      this.prisma.user.groupBy({
        by: ['status'],
        _count: true,
      }),

      // By KYC tier
      this.prisma.user.groupBy({
        by: ['kycTier'],
        _count: true,
      }),

      // New users today
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),

      // New users this week
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7)),
          },
        },
      }),

      // New users this month
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30)),
          },
        },
      }),
    ]);

    return {
      totalUsers,
      byRole: byRole.reduce(
        (acc, item) => {
          acc[item.role] = item._count;
          return acc;
        },
        {} as Record<UserRole, number>,
      ),
      byStatus: byStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count;
          return acc;
        },
        {} as Record<UserStatus, number>,
      ),
      byKYCTier: byKYCTier.reduce(
        (acc, item) => {
          acc[item.kycTier] = item._count;
          return acc;
        },
        {} as Record<KYCTier, number>,
      ),
      newUsers: {
        today: newUsersToday,
        thisWeek: newUsersThisWeek,
        thisMonth: newUsersThisMonth,
      },
    };
  }

  /**
   * Get single user details
   */
  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallets: {
          where: {
            type: 'NAIRA',
          },
        },
        _count: {
          select: {
            transactions: true,
            vtuOrders: true,
            giftCardOrders: true,
            cryptoOrders: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove sensitive data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, pin, twoFactorSecret, ...userWithoutSensitiveData } =
      user;

    // Include lock-related fields for admin visibility
    return {
      ...userWithoutSensitiveData,
      lockedUntil: user.lockedUntil,
      failedLoginAttempts: user.failedLoginAttempts,
      lastFailedLoginAt: user.lastFailedLoginAt,
    };
  }

  /**
   * Update user role
   */
  async updateUserRole(
    adminUserId: string,
    targetUserId: string,
    dto: UpdateUserRoleDto,
  ) {
    // Validate hierarchy
    await this.hierarchyService.validateCanChangeRole(
      adminUserId,
      targetUserId,
      dto.role,
    );

    // If demoting from SUPER_ADMIN, ensure at least one remains
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (
      targetUser.role === UserRole.SUPER_ADMIN &&
      dto.role !== UserRole.SUPER_ADMIN
    ) {
      await this.hierarchyService.ensureSuperAdminExists(targetUserId);
    }

    // Update role
    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: dto.role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'UPDATE_USER_ROLE',
        resource: 'User',
        resourceId: targetUserId,
        metadata: {
          previousRole: targetUser.role,
          newRole: dto.role,
        },
      },
    });

    return updatedUser;
  }

  /**
   * Update user status
   */
  async updateUserStatus(
    adminUserId: string,
    targetUserId: string,
    dto: UpdateUserStatusDto,
  ) {
    // Validate hierarchy - can modify user
    await this.hierarchyService.validateCanModifyUser(
      adminUserId,
      targetUserId,
    );

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Update status
    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { status: dto.status },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'UPDATE_USER_STATUS',
        resource: 'User',
        resourceId: targetUserId,
        metadata: {
          previousStatus: targetUser.status,
          newStatus: dto.status,
          reason: dto.reason,
        },
      },
    });

    // TODO: Send notification to user about status change

    return updatedUser;
  }

  /**
   * Update user KYC tier
   */
  async updateKYCTier(
    adminUserId: string,
    targetUserId: string,
    dto: UpdateKYCTierDto,
  ) {
    // Validate hierarchy
    await this.hierarchyService.validateCanModifyUser(
      adminUserId,
      targetUserId,
    );

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Update KYC tier
    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { kycTier: dto.tier },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        kycTier: true,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'UPDATE_KYC_TIER',
        resource: 'User',
        resourceId: targetUserId,
        metadata: {
          previousTier: targetUser.kycTier,
          newTier: dto.tier,
          notes: dto.notes,
        },
      },
    });

    // TODO: Send notification to user about KYC tier update

    return updatedUser;
  }

  /**
   * Get user audit logs
   */
  async getUserAuditLogs(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: {
          OR: [
            { userId }, // Actions by this user
            { resourceId: userId }, // Actions on this user
          ],
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({
        where: {
          OR: [{ userId }, { resourceId: userId }],
        },
      }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Unlock user account that was locked due to failed login attempts
   */
  async unlockAccount(
    adminUserId: string,
    targetUserId: string,
    dto: UnlockAccountDto,
  ) {
    // Validate hierarchy
    await this.hierarchyService.validateCanModifyUser(
      adminUserId,
      targetUserId,
    );

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Check if account is actually locked
    const isLocked =
      targetUser.status === UserStatus.LOCKED ||
      (targetUser.lockedUntil && targetUser.lockedUntil > new Date());

    if (!isLocked) {
      return {
        message: 'Account is not locked',
        user: {
          id: targetUser.id,
          email: targetUser.email,
          status: targetUser.status,
        },
      };
    }

    // Unlock the account
    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        status:
          targetUser.status === UserStatus.LOCKED
            ? UserStatus.ACTIVE
            : targetUser.status,
        lockedUntil: null,
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        lockedUntil: true,
        failedLoginAttempts: true,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'ACCOUNT_UNLOCKED',
        resource: 'User',
        resourceId: targetUserId,
        metadata: {
          previousStatus: targetUser.status,
          newStatus: updatedUser.status,
          reason: dto.reason || 'Manually unlocked by admin',
          failedLoginAttempts: targetUser.failedLoginAttempts,
        },
      },
    });

    // Send notification to user about account unlock
    this.notificationDispatcher
      .sendNotification({
        userId: targetUserId,
        eventType: 'account_unlocked',
        category: 'SECURITY',
        channels: ['EMAIL', 'PUSH', 'IN_APP'],
        title: 'Account Unlocked',
        message: `Your account has been unlocked. You can now log in and access your account. If you did not request this, please contact support immediately.`,
        data: {
          reason: dto.reason || 'Manually unlocked by admin',
          unlockedAt: new Date().toISOString(),
        },
      })
      .catch((error) => {
        this.logger.error('Failed to send account unlock notification', error);
      });

    return {
      message: 'Account unlocked successfully',
      user: updatedUser,
    };
  }

  /**
   * Unlock user account that was locked due to rate limit violations
   * This uses the AccountLockingService for proper handling
   */
  async unlockRateLimitAccount(
    adminUserId: string,
    targetUserId: string,
    reason: string,
  ) {
    // Validate hierarchy
    await this.hierarchyService.validateCanModifyUser(
      adminUserId,
      targetUserId,
    );

    // Use AccountLockingService which handles rate limit unlocking
    const result = await this.accountLockingService.unlockAccount(
      targetUserId,
      adminUserId,
      reason,
    );

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'RATE_LIMIT_ACCOUNT_UNLOCKED',
        resource: 'User',
        resourceId: targetUserId,
        metadata: {
          reason,
          rateLimitLockCount: result.user.rateLimitLockCount,
          previousLockedUntil: result.user.lockedUntil,
        },
      },
    });

    return {
      message: 'Account unlocked successfully',
      user: result.user,
    };
  }

  /**
   * Lock user account manually (admin action)
   */
  async lockAccount(
    adminUserId: string,
    targetUserId: string,
    dto: LockAccountDto,
  ) {
    // Validate hierarchy
    await this.hierarchyService.validateCanModifyUser(
      adminUserId,
      targetUserId,
    );

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Check if account is already locked
    const isLocked =
      targetUser.status === UserStatus.LOCKED ||
      (targetUser.lockedUntil && targetUser.lockedUntil > new Date());

    if (isLocked) {
      return {
        message: 'Account is already locked',
        user: {
          id: targetUser.id,
          email: targetUser.email,
          status: targetUser.status,
          lockedUntil: targetUser.lockedUntil,
        },
      };
    }

    // Calculate lock duration (default: 30 minutes)
    const lockDurationMinutes = dto.lockDurationMinutes || 30;
    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + lockDurationMinutes);

    // Lock the account
    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        status: UserStatus.LOCKED,
        lockedUntil: lockUntil,
        failedLoginAttempts: 3, // Set to max to indicate locked
        lastFailedLoginAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        lockedUntil: true,
        failedLoginAttempts: true,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'ACCOUNT_LOCKED',
        resource: 'User',
        resourceId: targetUserId,
        metadata: {
          previousStatus: targetUser.status,
          newStatus: updatedUser.status,
          reason: dto.reason || 'Manually locked by admin',
          lockDurationMinutes,
          lockedUntil: lockUntil.toISOString(),
        },
      },
    });

    // Send notification to user about account lock
    this.notificationDispatcher
      .sendNotification({
        userId: targetUserId,
        eventType: 'account_locked',
        category: 'SECURITY',
        channels: ['EMAIL', 'PUSH', 'IN_APP'],
        title: 'Account Locked',
        message: `Your account has been temporarily locked for security reasons. It will be automatically unlocked in ${lockDurationMinutes} minutes. If you believe this is an error, please contact our support team immediately.`,
        data: {
          reason: dto.reason || 'Manually locked by admin',
          lockedUntil: lockUntil.toISOString(),
          lockDurationMinutes,
        },
      })
      .catch((error) => {
        this.logger.error('Failed to send account lock notification', error);
      });

    return {
      message: `Account locked successfully for ${lockDurationMinutes} minutes`,
      user: updatedUser,
      lockedUntil: lockUntil,
    };
  }
}
