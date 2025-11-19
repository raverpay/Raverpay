import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, NotificationType } from '@prisma/client';
import { CreateBroadcastDto, UpdateNotificationDto } from '../dto';

@Injectable()
export class AdminNotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get notifications with filters
   */
  async getNotifications(
    page: number = 1,
    limit: number = 20,
    type?: NotificationType,
    isRead?: boolean,
    userId?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {};

    if (type) where.type = type;
    if (isRead !== undefined) where.isRead = isRead;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
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
            },
          },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get notification statistics
   */
  async getStats(startDate?: string, endDate?: string) {
    const where: Prisma.NotificationWhereInput = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [totalCount, byType, readCount] = await Promise.all([
      this.prisma.notification.count({ where }),

      this.prisma.notification.groupBy({
        by: ['type'],
        where,
        _count: true,
      }),

      this.prisma.notification.count({
        where: {
          ...where,
          isRead: true,
        },
      }),
    ]);

    const readRate =
      totalCount > 0 ? ((readCount / totalCount) * 100).toFixed(2) : '0';

    return {
      totalCount,
      readCount,
      unreadCount: totalCount - readCount,
      readRate,
      byType: byType.map((item) => ({
        type: item.type,
        count: item._count,
      })),
    };
  }

  /**
   * Get single notification
   */
  async getNotificationById(notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create broadcast notification (send to all users)
   */
  async createBroadcast(adminUserId: string, dto: CreateBroadcastDto) {
    // Get all active users
    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    if (users.length === 0) {
      throw new BadRequestException('No active users to broadcast to');
    }

    // Create notifications for all users
    const notifications = await this.prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        isRead: false,
        data: {
          broadcastId: `BROADCAST_${Date.now()}`,
          sentBy: adminUserId,
        },
      })),
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'CREATE_BROADCAST_NOTIFICATION',
        resource: 'Notification',
        resourceId: 'BROADCAST',
        metadata: {
          recipientCount: users.length,
          type: dto.type,
          title: dto.title,
        },
      },
    });

    return {
      success: true,
      recipientCount: users.length,
      message: `Broadcast sent to ${users.length} users`,
    };
  }

  /**
   * Send notification to specific user
   */
  async sendToUser(
    adminUserId: string,
    userId: string,
    dto: UpdateNotificationDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: dto.type || NotificationType.SYSTEM,
        title: dto.title || '',
        message: dto.message || '',
        isRead: false,
        data: {
          sentBy: adminUserId,
          manual: true,
        },
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'SEND_USER_NOTIFICATION',
        resource: 'Notification',
        resourceId: notification.id,
        metadata: {
          recipientId: userId,
          type: notification.type,
          title: notification.title,
        },
      },
    });

    return notification;
  }

  /**
   * Mark notification as read (for troubleshooting)
   */
  async markAsRead(notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Delete notification (admin cleanup)
   */
  async deleteNotification(adminUserId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'DELETE_NOTIFICATION',
        resource: 'Notification',
        resourceId: notificationId,
        metadata: {
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
        },
      },
    });

    return { success: true, message: 'Notification deleted' };
  }

  /**
   * Bulk delete notifications
   */
  async bulkDelete(
    adminUserId: string,
    userId?: string,
    type?: NotificationType,
    isRead?: boolean,
    beforeDate?: string,
  ) {
    const where: Prisma.NotificationWhereInput = {};

    if (userId) where.userId = userId;
    if (type) where.type = type;
    if (isRead !== undefined) where.isRead = isRead;
    if (beforeDate) where.createdAt = { lt: new Date(beforeDate) };

    const deletedCount = await this.prisma.notification.deleteMany({
      where,
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'BULK_DELETE_NOTIFICATIONS',
        resource: 'Notification',
        resourceId: 'BULK',
        metadata: {
          filters: { userId, type, isRead, beforeDate },
          deletedCount: deletedCount.count,
        },
      },
    });

    return {
      success: true,
      deletedCount: deletedCount.count,
      message: `Deleted ${deletedCount.count} notifications`,
    };
  }
}
