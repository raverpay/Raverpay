import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService } from '../../common/services/hierarchy.service';
import {
  QueryUsersDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
  UpdateKYCTierDto,
} from '../dto';
import { UserRole, UserStatus, KYCTier, Prisma } from '@prisma/client';

@Injectable()
export class AdminUsersService {
  constructor(
    private prisma: PrismaService,
    private hierarchyService: HierarchyService,
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
          wallet: {
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
        wallet: true,
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
    const { password, pin, twoFactorSecret, ...userWithoutSensitiveData } =
      user;

    return userWithoutSensitiveData;
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
}
