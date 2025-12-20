import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../services/email/email.service';
import { SmsService } from '../../services/sms/sms.service';
import { ExpoPushService } from '../../notifications/expo-push.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationLogService } from '../../notifications/notification-log.service';
import { QueueService, NotificationJobData } from '../queue.service';

/**
 * Notification Processor
 *
 * Processes notification jobs from BullMQ queue.
 * Replaces database-backed notification queue for better performance.
 *
 * Handles:
 * - EMAIL notifications (rate limited: 2/sec)
 * - SMS notifications (rate limited: 5/sec)
 * - PUSH notifications (rate limited: 50/sec)
 * - IN_APP notifications (rate limited: 100/sec)
 */
@Processor('notifications', {
  concurrency: 10, // Process up to 10 jobs concurrently
  limiter: {
    max: 100, // Max 100 jobs per interval
    duration: 1000, // Per second
  },
})
@Injectable()
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly expoPushService: ExpoPushService,
    private readonly notificationsService: NotificationsService,
    private readonly logService: NotificationLogService,
  ) {
    super();
  }

  /**
   * Process notification job
   */
  async process(job: Job<NotificationJobData>): Promise<void> {
    const { userId, channel, eventType, variables, templateId } = job.data;

    this.logger.debug(
      `Processing ${channel} notification: ${eventType} for user ${userId}`,
    );

    try {
      // Get user data
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          expoPushToken: true,
        },
      });

      if (!user) {
        this.logger.warn(`User not found: ${userId}`);
        throw new Error(`User not found: ${userId}`);
      }

      // Send notification based on channel
      const success = await this.sendNotification(job.data, user, channel);

      if (success) {
        // Log successful delivery
        await this.logService.logDelivery({
          notificationId: job.id || 'unknown',
          userId,
          channel: channel,
          status: 'SENT',
          provider: this.getProviderForChannel(channel),
        });

        this.logger.log(
          `✅ ${channel} notification sent: ${eventType} for user ${userId}`,
        );
      } else {
        throw new Error(`Failed to send ${channel} notification`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process ${channel} notification for user ${userId}`,
        error,
      );

      // Log failure
      await this.logService.logFailure({
        notificationId: job.id || 'unknown',
        userId,
        channel: channel,
        failureReason: error instanceof Error ? error.message : 'Unknown error',
        provider: this.getProviderForChannel(channel),
        retryCount: job.attemptsMade || 0,
      });

      // Re-throw to trigger BullMQ retry
      throw error;
    }
  }

  /**
   * Send notification based on channel
   */
  private async sendNotification(
    data: NotificationJobData,
    user: {
      id: string;
      email: string;
      phone: string;
      firstName: string;
      lastName: string;
      expoPushToken: string | null;
    },
    channel: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP',
  ): Promise<boolean> {
    const vars = data.variables || {};

    switch (channel) {
      case 'EMAIL':
        return this.sendEmail(user, vars);

      case 'SMS':
        return this.sendSms(user, vars);

      case 'PUSH':
        return this.sendPush(user, vars);

      case 'IN_APP':
        return this.sendInApp(user, vars);

      default:
        this.logger.warn(`Unknown channel: ${channel}`);
        return false;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(
    user: { email: string; firstName: string; lastName?: string },
    variables: Record<string, any>,
  ): Promise<boolean> {
    const { eventType, title, message, ...data } = variables;

    try {
      // Check if this is a birthday notification
      if (eventType === 'birthday') {
        return await this.emailService.sendBirthdayEmail(
          user.email,
          user.firstName,
          user.lastName,
        );
      }

      // Check if this is a P2P transfer event
      const p2pEventTypes = ['p2p_transfer_received', 'p2p_transfer_sent'];
      if (p2pEventTypes.includes(eventType)) {
        const transactionType =
          eventType === 'p2p_transfer_received' ? 'received' : 'sent';

        return await this.emailService.sendP2PTransferEmail(user.email, {
          firstName: user.firstName,
          amount:
            typeof data?.amount === 'number'
              ? data.amount
              : parseFloat(data?.amount?.toString() || '0'),
          senderName: data?.senderName || data?.recipientName || 'Unknown',
          senderTag: data?.senderTag,
          recipientTag: data?.recipientTag,
          message: data?.message,
          reference: data?.reference || 'N/A',
          transactionType,
        });
      }

      // Check if this is a withdrawal transaction event
      const withdrawalEventTypes = [
        'withdrawal_initiated',
        'withdrawal_success',
        'withdrawal_failed',
      ];
      if (withdrawalEventTypes.includes(eventType)) {
        const statusMap: Record<string, 'initiated' | 'success' | 'failed'> = {
          withdrawal_initiated: 'initiated',
          withdrawal_success: 'success',
          withdrawal_failed: 'failed',
        };

        const status = statusMap[eventType] || 'initiated';

        return await this.emailService.sendWithdrawalTransactionEmail(
          user.email,
          {
            firstName: user.firstName,
            amount:
              typeof data?.amount === 'number'
                ? data.amount.toLocaleString()
                : data?.amount?.toString() || '0',
            fee:
              typeof data?.fee === 'number'
                ? data.fee.toLocaleString()
                : data?.fee?.toString() || '0',
            totalDebit:
              typeof data?.totalDebit === 'number'
                ? data.totalDebit.toLocaleString()
                : data?.totalDebit?.toString() ||
                  (typeof data?.amount === 'number'
                    ? data.amount.toLocaleString()
                    : '0'),
            accountName: data?.accountName || 'N/A',
            accountNumber: data?.accountNumber || 'N/A',
            bankName: data?.bankName,
            reference: data?.reference || 'N/A',
            status,
            date: new Date().toLocaleString('en-NG', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }),
          },
        );
      }

      // Generic email notification
      return await this.emailService.sendGenericNotification(
        user.email,
        user.firstName,
        title || 'Notification from RaverPay',
        message || '',
        data,
      );
    } catch (error) {
      this.logger.error('Failed to send email notification', error);
      return false;
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSms(
    user: { phone: string; firstName: string },
    variables: Record<string, any>,
  ): Promise<boolean> {
    const { message } = variables;

    try {
      if (!message) {
        this.logger.warn('No message provided for SMS notification');
        return false;
      }

      return await this.smsService.sendGenericNotification(
        user.phone,
        user.firstName,
        message,
      );
    } catch (error) {
      this.logger.error('Failed to send SMS notification', error);
      return false;
    }
  }

  /**
   * Send push notification
   */
  private async sendPush(
    user: { expoPushToken: string | null; firstName: string },
    variables: Record<string, any>,
  ): Promise<boolean> {
    const { title, message, data: notificationData } = variables;

    try {
      if (!user.expoPushToken) {
        this.logger.debug('User has no Expo push token');
        return false;
      }

      return await this.expoPushService.sendToToken(user.expoPushToken, {
        title: title || 'RaverPay',
        body: message || '',
        data: notificationData || {},
      });
    } catch (error) {
      this.logger.error('Failed to send push notification', error);
      return false;
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInApp(
    user: { id: string; firstName: string },
    variables: Record<string, any>,
  ): Promise<boolean> {
    const {
      eventType,
      title,
      message,
      category,
      data: notificationData,
    } = variables;

    try {
      await this.notificationsService.createNotification({
        userId: user.id,
        type: eventType || 'SYSTEM',
        title: title || 'Notification',
        message: message || '',
        data: notificationData || {},
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to create in-app notification', error);
      return false;
    }
  }

  /**
   * Get provider name for channel
   */
  private getProviderForChannel(
    channel: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP',
  ): string {
    const providers = {
      EMAIL: 'resend',
      SMS: 'vtpass',
      PUSH: 'expo',
      IN_APP: 'internal',
    };
    return providers[channel] || 'unknown';
  }

  /**
   * Job completed event
   */
  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Notification job completed: ${job.id}`);
  }

  /**
   * Job failed event
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Notification job failed: ${job.id} - ${error.message}`,
      error.stack,
    );
  }
}
