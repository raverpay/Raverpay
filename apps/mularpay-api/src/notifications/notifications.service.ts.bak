import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { FindNotificationsDto } from './dto/find-notifications.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async createNotification(dto: CreateNotificationDto) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId: dto.userId,
          type: dto.type,
          title: dto.title,
          message: dto.message,
          data: dto.data,
        },
      });

      this.logger.log(
        `Notification created for user ${dto.userId}: ${dto.title}`,
      );

      // TODO: Send push notification via OneSignal
      // await this.pushNotificationService.send(dto.userId, {
      //   title: dto.title,
      //   message: dto.message,
      //   data: { notificationId: notification.id, ...dto.data },
      // });

      return notification;
    } catch (error) {
      this.logger.error('Error creating notification:', error);
      throw error;
    }
  }

  async findAll(userId: string, options: FindNotificationsDto) {
    const { page = 1, limit = 20, type, unreadOnly = false } = options;

    const where: any = { userId };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (type) where.type = type;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (unreadOnly) where.isRead = false;

    try {
      const [notifications, total, unreadCount] = await Promise.all([
        this.prisma.notification.findMany({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this.prisma.notification.count({ where }),
        this.prisma.notification.count({
          where: { userId, isRead: false },
        }),
      ]);

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
        unreadCount,
      };
    } catch (error) {
      this.logger.error('Error finding notifications:', error);
      throw error;
    }
  }

  async markAsRead(userId: string, notificationId: string) {
    // Verify ownership
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.isRead) {
      return { success: true };
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    this.logger.log(`Notification ${notificationId} marked as read`);

    return { success: true };
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    this.logger.log(
      `${result.count} notifications marked as read for user ${userId}`,
    );

    return { success: true, count: result.count };
  }

  async delete(userId: string, notificationId: string) {
    // Verify ownership
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    this.logger.log(`Notification ${notificationId} deleted`);

    return { success: true };
  }
}
