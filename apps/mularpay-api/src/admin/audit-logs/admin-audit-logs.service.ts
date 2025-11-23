import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminAuditLogsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get audit logs with filters
   */
  async getAuditLogs(
    page: number = 1,
    limit: number = 50,
    action?: string,
    resource?: string,
    userId?: string,
    resourceId?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (resource) where.resource = { contains: resource, mode: 'insensitive' };
    if (userId) where.userId = userId;
    if (resourceId) where.resourceId = resourceId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
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
   * Get audit log by ID
   */
  async getAuditLogById(logId: string) {
    return await this.prisma.auditLog.findUnique({
      where: { id: logId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Get audit log statistics
   */
  async getStats(startDate?: string, endDate?: string) {
    const where: Prisma.AuditLogWhereInput = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [totalCount, byAction, byResource, byUser] = await Promise.all([
      this.prisma.auditLog.count({ where }),

      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true,
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),

      this.prisma.auditLog.groupBy({
        by: ['resource'],
        where,
        _count: true,
        orderBy: { _count: { resource: 'desc' } },
        take: 10,
      }),

      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where,
        _count: true,
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
    ]);

    // Get user details for top admins
    const userIds = byUser
      .map((item) => item.userId)
      .filter((id): id is string => id !== null);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    const topAdmins = byUser.map((item) => {
      const user = users.find((u) => u.id === item.userId);
      return {
        userId: item.userId,
        user: user
          ? {
              email: user.email,
              name: `${user.firstName} ${user.lastName}`,
              role: user.role,
            }
          : null,
        actionCount: item._count,
      };
    });

    return {
      totalCount,
      topActions: byAction.map((item) => ({
        action: item.action,
        count: item._count,
      })),
      topResources: byResource.map((item) => ({
        resource: item.resource,
        count: item._count,
      })),
      topAdmins,
    };
  }

  /**
   * Get user activity logs
   */
  async getUserActivity(userId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where: { userId } }),
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
   * Get resource audit trail
   */
  async getResourceAuditTrail(
    resource: string,
    resourceId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: {
          resource,
          resourceId,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' }, // Show chronological order for audit trail
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({
        where: {
          resource,
          resourceId,
        },
      }),
    ]);

    return {
      resource,
      resourceId,
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
