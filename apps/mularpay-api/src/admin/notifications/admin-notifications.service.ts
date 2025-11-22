import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, NotificationType } from '@prisma/client';
import { CreateBroadcastDto, UpdateNotificationDto } from '../dto';
import { NotificationDispatcherService } from '../../notifications/notification-dispatcher.service';
import { NotificationPreferencesService } from '../../notifications/notification-preferences.service';

@Injectable()
export class AdminNotificationsService {
  private readonly logger = new Logger(AdminNotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationDispatcher: NotificationDispatcherService,
    private preferencesService: NotificationPreferencesService,
  ) {}

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
   * Uses NotificationDispatcher to send via selected channels
   * Respects user notification preferences
   */
  async createBroadcast(adminUserId: string, dto: CreateBroadcastDto) {
    const broadcastId = `BROADCAST_${Date.now()}`;

    this.logger.log(
      `Creating broadcast ${broadcastId} via channels: ${dto.channels.join(', ')}`,
    );

    // Get all active users with their notification preferences
    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        email: true,
        phone: true,
        expoPushToken: true,
      },
    });

    if (users.length === 0) {
      throw new BadRequestException({
        message: 'No active users found in the system',
        code: 'NO_ACTIVE_USERS',
        details: {
          totalUsers: 0,
        },
      });
    }

    // Map notification type to category
    const categoryMap: Record<NotificationType, string> = {
      TRANSACTION: 'TRANSACTION',
      KYC: 'KYC',
      SECURITY: 'SECURITY',
      PROMOTIONAL: 'PROMOTIONAL',
      SYSTEM: 'SYSTEM',
    };
    const category = categoryMap[dto.type] || 'SYSTEM';

    // Track rejection reasons for better error messages
    const rejectionReasons: Record<string, number> = {
      noEmail: 0,
      noPhone: 0,
      noPushToken: 0,
      optedOutOfCategory: 0,
      channelDisabled: 0,
    };

    // Filter users based on notification preferences for each channel
    const eligibleUsers: string[] = [];

    for (const user of users) {
      // Check if user has opted in for at least one of the requested channels
      let isEligible = false;
      let rejectionReason: string | null = null;

      for (const channel of dto.channels) {
        const shouldSend = await this.preferencesService.shouldSendNotification(
          user.id,
          channel,
          category,
        );

        if (!shouldSend) {
          // User has opted out of this channel/category combination
          rejectionReason = 'optedOutOfCategory';
          continue;
        }

        // Additional checks for channel-specific requirements
        if (channel === 'EMAIL') {
          if (user.email) {
            isEligible = true;
            break;
          } else {
            rejectionReason = 'noEmail';
          }
        } else if (channel === 'SMS') {
          if (user.phone) {
            isEligible = true;
            break;
          } else {
            rejectionReason = 'noPhone';
          }
        } else if (channel === 'PUSH') {
          if (user.expoPushToken) {
            isEligible = true;
            break;
          } else {
            rejectionReason = 'noPushToken';
          }
        } else if (channel === 'IN_APP') {
          isEligible = true;
          break;
        }
      }

      if (isEligible) {
        eligibleUsers.push(user.id);
      } else if (rejectionReason) {
        rejectionReasons[rejectionReason]++;
      }
    }

    if (eligibleUsers.length === 0) {
      // Build a helpful error message based on rejection reasons
      const reasons: string[] = [];

      if (rejectionReasons.optedOutOfCategory > 0) {
        reasons.push(
          `${rejectionReasons.optedOutOfCategory} user(s) have opted out of ${dto.type.toLowerCase()} notifications`,
        );
      }
      if (rejectionReasons.noEmail > 0 && dto.channels.includes('EMAIL')) {
        reasons.push(
          `${rejectionReasons.noEmail} user(s) don't have an email address`,
        );
      }
      if (rejectionReasons.noPhone > 0 && dto.channels.includes('SMS')) {
        reasons.push(
          `${rejectionReasons.noPhone} user(s) don't have a phone number`,
        );
      }
      if (rejectionReasons.noPushToken > 0 && dto.channels.includes('PUSH')) {
        reasons.push(
          `${rejectionReasons.noPushToken} user(s) don't have push notifications enabled`,
        );
      }

      const detailMessage = reasons.length > 0
        ? `Reasons: ${reasons.join('; ')}`
        : 'All users have opted out of the selected notification type and channels';

      throw new BadRequestException({
        message: `No eligible users found for this broadcast. ${detailMessage}`,
        code: 'NO_ELIGIBLE_USERS',
        details: {
          totalUsers: users.length,
          channels: dto.channels,
          notificationType: dto.type,
          rejectionReasons,
        },
      });
    }

    this.logger.log(
      `Sending broadcast to ${eligibleUsers.length} eligible users (filtered from ${users.length} total)`,
    );

    // Use NotificationDispatcher to send notifications via bulk method
    const result = await this.notificationDispatcher.sendBulkNotifications(
      eligibleUsers,
      {
        eventType: dto.eventType || 'admin_broadcast',
        category: category as any,
        channels: dto.channels as any[],
        title: dto.title,
        message: dto.message,
        data: {
          broadcastId,
          sentBy: adminUserId,
          isAdminBroadcast: true,
        },
      },
    );

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'CREATE_BROADCAST_NOTIFICATION',
        resource: 'Notification',
        resourceId: broadcastId,
        metadata: {
          broadcastId,
          totalUsers: users.length,
          eligibleUsers: eligibleUsers.length,
          successfulDeliveries: result.successful,
          failedDeliveries: result.failed,
          channels: dto.channels,
          type: dto.type,
          title: dto.title,
        },
      },
    });

    return {
      success: true,
      broadcastId,
      totalUsers: users.length,
      eligibleUsers: eligibleUsers.length,
      successfulDeliveries: result.successful,
      failedDeliveries: result.failed,
      channels: dto.channels,
      message: `Broadcast sent to ${result.successful} users via ${dto.channels.join(', ')}`,
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
