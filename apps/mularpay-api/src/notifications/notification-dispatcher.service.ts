import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationLogService } from './notification-log.service';
import { ExpoPushService } from './expo-push.service';
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
    private readonly expoPushService: ExpoPushService,
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

      // 3. Send via other channels (email, SMS, push) asynchronously
      // Don't await - fire and forget to avoid blocking transaction responses
      this.sendToChannelsAsync(notification.id, event, allowedChannels).catch(
        (error) => {
          this.logger.error(
            `Error in async notification delivery for ${notification.id}`,
            error,
          );
        },
      );

      this.logger.log(
        `Notification ${notification.id} created, sending to channels: ${allowedChannels.join(', ')}`,
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
   * Send notification to all allowed channels asynchronously
   * This method runs in the background and doesn't block the caller
   *
   * @param notificationId - Notification ID
   * @param event - Notification event
   * @param channels - Channels to send to
   */
  private async sendToChannelsAsync(
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

    // Update notification delivery status after all channels complete
    await this.updateNotificationDeliveryStatus(notificationId);

    this.logger.log(
      `Async notification delivery complete for ${notificationId}`,
    );
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

      let emailSent = false;

      // Check if this is a VTU transaction event
      const vtuEventTypes = [
        'airtime_purchase_success',
        'data_purchase_success',
        'cable_tv_payment_success',
        'showmax_payment_success',
        'electricity_payment_success',
        'international_airtime_success',
      ];

      if (vtuEventTypes.includes(event.eventType)) {
        // Use VTU-specific template
        emailSent = await this.sendVTUTransactionEmail(user, event);
      } else {
        // Use generic template for other notifications
        emailSent = await this.emailService.sendGenericNotification(
          user.email,
          user.firstName,
          event.title,
          event.message,
          event.data,
        );
      }

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
   * Send VTU transaction email with proper template
   *
   * @param user - User data
   * @param event - Notification event
   * @returns Whether email was sent successfully
   */
  private async sendVTUTransactionEmail(
    user: { email: string; firstName: string },
    event: NotificationEvent,
  ): Promise<boolean> {
    // Map event type to service details
    const serviceTypeMap = {
      airtime_purchase_success: 'Airtime',
      data_purchase_success: 'Data',
      cable_tv_payment_success: 'Cable TV',
      showmax_payment_success: 'Showmax',
      electricity_payment_success: 'Electricity',
      international_airtime_success: 'International Airtime',
    };

    const serviceType = serviceTypeMap[event.eventType] || 'VTU Service';

    // Extract additional info based on service type
    const additionalInfo: { label: string; value: string }[] = [];

    if (event.data) {
      // Add service-specific details
      if (event.eventType === 'cable_tv_payment_success') {
        if (event.data.productName)
          additionalInfo.push({ label: 'Package', value: event.data.productName });
        if (event.data.provider)
          additionalInfo.push({ label: 'Provider', value: event.data.provider });
      } else if (event.eventType === 'showmax_payment_success') {
        if (event.data.productName)
          additionalInfo.push({ label: 'Plan', value: event.data.productName });
        if (event.data.voucher)
          additionalInfo.push({ label: 'Voucher Code', value: event.data.voucher });
      } else if (event.eventType === 'electricity_payment_success') {
        if (event.data.provider)
          additionalInfo.push({ label: 'DISCO', value: event.data.provider });
        if (event.data.meterToken)
          additionalInfo.push({ label: 'Token', value: event.data.meterToken });
        if (event.data.units)
          additionalInfo.push({ label: 'Units', value: event.data.units });
      } else if (event.eventType === 'data_purchase_success') {
        if (event.data.plan)
          additionalInfo.push({ label: 'Plan', value: event.data.plan });
        if (event.data.network)
          additionalInfo.push({ label: 'Network', value: event.data.network });
      } else if (event.eventType === 'airtime_purchase_success') {
        if (event.data.network)
          additionalInfo.push({ label: 'Network', value: event.data.network });
      } else if (event.eventType === 'international_airtime_success') {
        if (event.data.countryCode)
          additionalInfo.push({ label: 'Country', value: event.data.countryCode });
      }
    }

    return await this.emailService.sendVTUTransactionEmail(user.email, {
      firstName: user.firstName,
      serviceType,
      serviceName: event.data?.productName || event.data?.plan || event.data?.network || serviceType,
      amount: event.data?.amount?.toLocaleString() || '0',
      recipient: event.data?.recipient || event.data?.phoneNumber || 'N/A',
      reference: event.data?.reference || 'N/A',
      status: 'success',
      date: new Date().toLocaleString('en-NG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      additionalInfo: additionalInfo.length > 0 ? additionalInfo : undefined,
    });
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
      // Get user's Expo push token
      const user = await this.prisma.user.findUnique({
        where: { id: event.userId },
        select: { expoPushToken: true },
      });

      if (!user || !user.expoPushToken) {
        this.logger.warn(
          `No Expo push token for user ${event.userId}, skipping push notification`,
        );
        return;
      }

      // Send push notification via Expo
      const success = await this.expoPushService.sendToToken(
        user.expoPushToken,
        {
          title: event.title,
          body: event.message,
          data: {
            notificationId,
            category: event.category,
            eventType: event.eventType,
            ...event.data,
          },
          sound: 'default',
          badge: 1,
          priority: 'high',
        },
      );

      if (success) {
        await this.logService.logDelivery({
          notificationId,
          userId: event.userId,
          channel: 'PUSH',
          status: 'SENT',
          provider: 'expo',
        });

        this.logger.log(
          `Push notification sent for notification ${notificationId}`,
        );
      } else {
        await this.logService.logFailure({
          notificationId,
          userId: event.userId,
          channel: 'PUSH',
          failureReason: 'Failed to send via Expo',
          provider: 'expo',
        });
      }
    } catch (error) {
      await this.logService.logFailure({
        notificationId,
        userId: event.userId,
        channel: 'PUSH',
        failureReason: error.message,
        provider: 'expo',
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

    // Check if EMAIL is in the channels - if so, we need to rate limit
    const hasEmailChannel = event.channels?.includes('EMAIL');

    if (hasEmailChannel) {
      // Process sequentially with delays to respect Resend rate limit (2 req/sec)
      // We use 600ms delay to stay safely under the limit
      this.logger.log(
        `Bulk notification with EMAIL channel - processing ${userIds.length} users with rate limiting`,
      );

      for (let i = 0; i < userIds.length; i++) {
        const userId = userIds[i];
        try {
          const result = await this.sendNotification({ ...event, userId });
          results.push({ status: 'fulfilled', value: result });
        } catch (error) {
          results.push({ status: 'rejected', reason: error });
        }

        // Add delay between each email to respect rate limit (2 requests/second)
        // 600ms ensures we stay under the limit even with some variance
        if (i < userIds.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 600));
        }

        // Log progress every 10 users
        if ((i + 1) % 10 === 0) {
          this.logger.log(
            `Bulk notification progress: ${i + 1}/${userIds.length} processed`,
          );
        }
      }
    } else {
      // For non-email channels, process in batches (push/in-app don't have strict rate limits)
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
    }

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    this.logger.log(
      `Bulk notification complete: ${successful} successful, ${failed} failed`,
    );

    return { successful, failed, total: results.length };
  }
}
