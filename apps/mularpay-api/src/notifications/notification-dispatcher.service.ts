import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationLogService } from './notification-log.service';
import { OneSignalService } from './onesignal.service';
import { EmailService } from '../services/email/email.service';
import { SmsService } from '../services/sms/sms.service';

/**
 * Notification Event Interface
 */
export interface NotificationEvent {
  userId: string;
  eventType: string; // "deposit", "withdrawal", "bvn_verified", etc.
  category:
    | 'TRANSACTION'
    | 'SECURITY'
    | 'KYC'
    | 'PROMOTIONAL'
    | 'SYSTEM'
    | 'ACCOUNT';
  channels: Array<'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP'>;
  title: string;
  message: string;
  data?: any;
  templateId?: string;
  variables?: Record<string, any>;
}

/**
 * Notification Dispatcher Service
 *
 * Orchestrates multi-channel notification delivery:
 * 1. Checks user preferences
 * 2. Creates in-app notification
 * 3. Sends via appropriate channels (email, SMS, push)
 * 4. Logs delivery status
 * 5. Handles failures and retries
 */
@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly preferencesService: NotificationPreferencesService,
    private readonly logService: NotificationLogService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly oneSignalService: OneSignalService,
  ) {}

  /**
   * Send notification via multiple channels
   *
   * @param event - Notification event data
   * @returns Created notification with delivery status
   */
  async sendNotification(event: NotificationEvent) {
    this.logger.log(
      `Dispatching ${event.eventType} notification for user ${event.userId}`,
    );

    try {
      // 1. Filter channels based on user preferences
      const allowedChannels = await this.filterChannelsByPreferences(
        event.userId,
        event.channels,
        event.category,
      );

      if (allowedChannels.length === 0) {
        this.logger.log(
          `No channels allowed for user ${event.userId}, skipping`,
        );
        return null;
      }

      // 2. Create in-app notification (always create if IN_APP is allowed)
      const notification = await this.createInAppNotification(
        event,
        allowedChannels,
      );

      // 3. Send via other channels (email, SMS, push)
      await this.sendToChannels(notification.id, event, allowedChannels);

      // 4. Update notification delivery status
      await this.updateNotificationDeliveryStatus(notification.id);

      this.logger.log(
        `Notification ${notification.id} dispatched to channels: ${allowedChannels.join(', ')}`,
      );

      return notification;
    } catch (error) {
      this.logger.error(
        `Failed to dispatch notification for user ${event.userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Filter channels based on user preferences
   *
   * @param userId - User ID
   * @param requestedChannels - Channels requested by the event
   * @param category - Notification category
   * @returns Allowed channels
   */
  private async filterChannelsByPreferences(
    userId: string,
    requestedChannels: string[],
    category: string,
  ): Promise<string[]> {
    const allowedChannels: string[] = [];

    for (const channel of requestedChannels) {
      const isAllowed = await this.preferencesService.shouldSendNotification(
        userId,
        channel,
        category,
      );

      if (isAllowed) {
        allowedChannels.push(channel);
      }
    }

    return allowedChannels;
  }

  /**
   * Create in-app notification
   *
   * @param event - Notification event
   * @param allowedChannels - Channels that will be used
   * @returns Created notification
   */
  private async createInAppNotification(
    event: NotificationEvent,
    allowedChannels: string[],
  ) {
    const notification = await this.notificationsService.createNotification({
      userId: event.userId,
      type: this.mapCategoryToType(event.category),
      title: event.title,
      message: event.message,
      data: event.data,
    });

    // Update notification with additional metadata
    await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        eventType: event.eventType,
        category: event.category,
        channels: allowedChannels,
        templateId: event.templateId,
        variables: event.variables,
      },
    });

    return notification;
  }

  /**
   * Send notification to all allowed channels
   *
   * @param notificationId - Notification ID
   * @param event - Notification event
   * @param channels - Channels to send to
   */
  private async sendToChannels(
    notificationId: string,
    event: NotificationEvent,
    channels: string[],
  ) {
    const sendPromises: Promise<void>[] = [];

    if (channels.includes('EMAIL')) {
      sendPromises.push(this.sendEmail(notificationId, event));
    }

    if (channels.includes('SMS')) {
      sendPromises.push(this.sendSms(notificationId, event));
    }

    if (channels.includes('PUSH')) {
      sendPromises.push(this.sendPush(notificationId, event));
    }

    // Send all channels in parallel
    await Promise.allSettled(sendPromises);
  }

  /**
   * Send email notification
   *
   * @param notificationId - Notification ID
   * @param event - Notification event
   */
  private async sendEmail(notificationId: string, event: NotificationEvent) {
    try {
      // Get user email
      const user = await this.prisma.user.findUnique({
        where: { id: event.userId },
        select: { email: true, firstName: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // For now, send simple transactional email
      // TODO: Use templates when template service is implemented
      const emailSent = await this.emailService.sendGenericNotification(
        user.email,
        user.firstName,
        event.title,
        event.message,
        event.data,
      );

      if (emailSent) {
        await this.logService.logDelivery({
          notificationId,
          userId: event.userId,
          channel: 'EMAIL',
          status: 'SENT',
          provider: 'resend',
        });
      } else {
        await this.logService.logFailure({
          notificationId,
          userId: event.userId,
          channel: 'EMAIL',
          failureReason: 'Email service returned false',
          provider: 'resend',
        });
      }
    } catch (error) {
      await this.logService.logFailure({
        notificationId,
        userId: event.userId,
        channel: 'EMAIL',
        failureReason: error.message,
        provider: 'resend',
      });

      this.logger.error(
        `Failed to send email for notification ${notificationId}`,
        error,
      );
    }
  }

  /**
   * Send SMS notification
   *
   * @param notificationId - Notification ID
   * @param event - Notification event
   */
  private async sendSms(notificationId: string, event: NotificationEvent) {
    try {
      // Get user phone
      const user = await this.prisma.user.findUnique({
        where: { id: event.userId },
        select: { phone: true, firstName: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // For now, send simple SMS
      // TODO: Use templates when template service is implemented
      const smsSent = await this.smsService.sendGenericNotification(
        user.phone,
        user.firstName,
        event.message,
      );

      if (smsSent) {
        await this.logService.logDelivery({
          notificationId,
          userId: event.userId,
          channel: 'SMS',
          status: 'SENT',
          provider: this.smsService.getProviderName(),
        });
      } else {
        await this.logService.logFailure({
          notificationId,
          userId: event.userId,
          channel: 'SMS',
          failureReason: 'SMS service returned false',
          provider: this.smsService.getProviderName(),
        });
      }
    } catch (error) {
      await this.logService.logFailure({
        notificationId,
        userId: event.userId,
        channel: 'SMS',
        failureReason: error.message,
        provider: this.smsService.getProviderName(),
      });

      this.logger.error(
        `Failed to send SMS for notification ${notificationId}`,
        error,
      );
    }
  }

  /**
   * Send push notification
   *
   * @param notificationId - Notification ID
   * @param event - Notification event
   */
  private async sendPush(notificationId: string, event: NotificationEvent) {
    try {
      // Send push notification via OneSignal using external user ID
      // No need to fetch player ID from database - OneSignal handles routing
      await this.oneSignalService.sendToUser(event.userId, {
        headings: { en: event.title },
        contents: { en: event.message },
        data: {
          notificationId,
          category: event.category,
          eventType: event.eventType,
          ...event.data,
        },
        ios_badgeType: 'Increase',
        ios_badgeCount: 1,
      });

      await this.logService.logDelivery({
        notificationId,
        userId: event.userId,
        channel: 'PUSH',
        status: 'SENT',
        provider: 'onesignal',
      });

      this.logger.log(
        `Push notification sent for notification ${notificationId}`,
      );
    } catch (error) {
      await this.logService.logFailure({
        notificationId,
        userId: event.userId,
        channel: 'PUSH',
        failureReason: error.message,
        provider: 'onesignal',
      });

      this.logger.error(
        `Failed to send push notification for notification ${notificationId}`,
        error,
      );
    }
  }

  /**
   * Update notification delivery status
   *
   * @param notificationId - Notification ID
   */
  private async updateNotificationDeliveryStatus(notificationId: string) {
    const logs = await this.logService.getLogsForNotification(notificationId);

    const deliveryStatus: Record<string, string> = {};
    for (const log of logs) {
      deliveryStatus[log.channel.toLowerCase()] = log.status;
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { deliveryStatus },
    });
  }

  /**
   * Map category to notification type (for backwards compatibility)
   */
  private mapCategoryToType(
    category: string,
  ): 'TRANSACTION' | 'KYC' | 'SECURITY' | 'PROMOTIONAL' | 'SYSTEM' {
    const mapping: Record<string, any> = {
      TRANSACTION: 'TRANSACTION',
      KYC: 'KYC',
      SECURITY: 'SECURITY',
      PROMOTIONAL: 'PROMOTIONAL',
      SYSTEM: 'SYSTEM',
      ACCOUNT: 'SYSTEM',
    };

    return mapping[category] || 'SYSTEM';
  }

  /**
   * Send bulk notifications (for promotional campaigns, etc.)
   *
   * @param userIds - Array of user IDs
   * @param event - Notification event (same for all users)
   * @returns Array of created notifications
   */
  async sendBulkNotifications(
    userIds: string[],
    event: Omit<NotificationEvent, 'userId'>,
  ) {
    const results: any[] = [];

    // Process in batches to avoid overwhelming the system
    const batchSize = 50;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const batchPromises = batch.map((userId) =>
        this.sendNotification({ ...event, userId }),
      );

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);

      // Add small delay between batches
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    this.logger.log(
      `Bulk notification complete: ${successful} successful, ${failed} failed`,
    );

    return { successful, failed, total: results.length };
  }
}
