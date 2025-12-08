/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../services/email/email.service';
import { SmsService } from '../services/sms/sms.service';
import { ExpoPushService } from './expo-push.service';
import { NotificationsService } from './notifications.service';
import { NotificationLogService } from './notification-log.service';
import { NotificationChannel, QueueStatus } from '@prisma/client';

/**
 * Notification Queue Processor Service
 *
 * Processes queued notifications in the background:
 * - Runs every 10 seconds to process pending notifications
 * - Handles rate limiting for different channels
 * - Implements exponential backoff for retries
 * - Supports priority-based processing
 */
@Injectable()
export class NotificationQueueProcessor {
  private readonly logger = new Logger(NotificationQueueProcessor.name);
  private isProcessing = false;

  // Rate limits per channel (items per batch)
  private readonly BATCH_SIZES = {
    EMAIL: 2, // Resend limit: 2 req/sec
    SMS: 5,
    PUSH: 50,
    IN_APP: 100,
  };

  // Delay between items in milliseconds
  private readonly DELAYS = {
    EMAIL: 600, // 600ms between emails (safe for 2 req/sec)
    SMS: 200,
    PUSH: 50,
    IN_APP: 10,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly expoPushService: ExpoPushService,
    private readonly notificationsService: NotificationsService,
    private readonly logService: NotificationLogService,
  ) {}

  /**
   * Main cron job - runs every 10 seconds to process queued notifications
   */
  @Cron('*/10 * * * * *', {
    name: 'notification-queue-processor',
  })
  async processQueue() {
    // Prevent concurrent processing
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process each channel separately to respect rate limits
      await this.processChannelQueue('EMAIL');
      await this.processChannelQueue('SMS');
      await this.processChannelQueue('PUSH');
      await this.processChannelQueue('IN_APP');
    } catch (error) {
      this.logger.error('Queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process queue for a specific channel
   */
  private async processChannelQueue(channel: NotificationChannel) {
    const batchSize = this.BATCH_SIZES[channel];
    const delay = this.DELAYS[channel];
    const now = new Date();

    // Get queued items for this channel using raw query
    // Raw SQL is needed because the channel column is stored as text in the database
    const items = await this.prisma.$queryRaw<
      Array<{
        id: string;
        userId: string;
        channel: string;
        eventType: string;
        variables: any;
        status: string;
        priority: number;
        retryCount: number;
        maxRetries: number;
        nextRetryAt: Date | null;
        scheduledFor: Date | null;
        sentAt: Date | null;
        lastError: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>
    >`
      SELECT * FROM "notification_queue"
      WHERE channel = ${channel}
        AND status = 'QUEUED'
        AND (("scheduledFor" IS NULL) OR ("scheduledFor" <= ${now}))
        AND (("nextRetryAt" IS NULL) OR ("nextRetryAt" <= ${now}))
      ORDER BY priority DESC, "createdAt" ASC
      LIMIT ${batchSize}
    `;

    // If no items, return early
    if (items.length === 0) {
      return;
    }

    // Fetch user data for each item
    const userIds = [...new Set(items.map((item) => item.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        expoPushToken: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    this.logger.log(`Processing ${items.length} ${channel} notifications`);

    for (const item of items) {
      const user = userMap.get(item.userId);
      try {
        // Mark as processing
        await this.prisma.notificationQueue.update({
          where: { id: item.id },
          data: { status: 'PROCESSING' },
        });

        // Send the notification
        const success = await this.sendNotification(item, user, channel);

        if (success) {
          // Mark as sent
          await this.prisma.notificationQueue.update({
            where: { id: item.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
            },
          });
        } else {
          // Handle failure
          await this.handleFailure(item, 'Notification delivery failed');
        }

        // Delay between items to respect rate limits
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (error) {
        await this.handleFailure(item, error.message || 'Unknown error');
      }
    }
  }

  /**
   * Send notification based on channel
   */
  private async sendNotification(
    item: { variables: any },
    user:
      | {
          id: string;
          email: string;
          phone: string;
          firstName: string;
          lastName: string;
          expoPushToken: string | null;
        }
      | undefined,
    channel: NotificationChannel,
  ): Promise<boolean> {
    if (!user) {
      this.logger.warn('User not found for notification');
      return false;
    }
    const vars = (item.variables as Record<string, any>) || {};

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

    // Check if this is a birthday notification
    if (eventType === 'birthday') {
      return this.emailService.sendBirthdayEmail(
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

      return this.emailService.sendP2PTransferEmail(user.email, {
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
      // Map event type to status
      const statusMap: Record<string, 'initiated' | 'success' | 'failed'> = {
        withdrawal_initiated: 'initiated',
        withdrawal_success: 'success',
        withdrawal_failed: 'failed',
      };

      const status = statusMap[eventType] || 'initiated';

      return this.emailService.sendWithdrawalTransactionEmail(user.email, {
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
      });
    }

    // Generic notification email
    return this.emailService.sendGenericNotification(
      user.email,
      user.firstName,
      title || 'Notification',
      message || '',
      data,
    );
  }

  /**
   * Send SMS notification
   */
  private async sendSms(
    user: { phone: string; firstName: string },
    variables: Record<string, any>,
  ): Promise<boolean> {
    const { eventType, message } = variables;

    if (!user.phone) {
      return false;
    }

    // Check if this is a birthday notification
    if (eventType === 'birthday') {
      return this.smsService.sendBirthdaySms(user.phone, user.firstName);
    }

    // Generic SMS
    return this.smsService.sendGenericNotification(
      user.phone,
      user.firstName,
      message || '',
    );
  }

  /**
   * Send push notification
   */
  private async sendPush(
    user: { id: string; expoPushToken?: string | null; firstName: string },
    variables: Record<string, any>,
  ): Promise<boolean> {
    if (!user.expoPushToken) {
      return false;
    }

    const { eventType, title, message, ...data } = variables;

    // Format P2P transfer push notifications
    let formattedTitle = title || 'RaverPay';
    let formattedBody = message || '';

    if (eventType === 'p2p_transfer_received') {
      const amount =
        typeof data?.amount === 'number'
          ? `₦${data.amount.toLocaleString()}`
          : data?.amount;
      const sender = data?.senderTag
        ? `@${data.senderTag}`
        : data?.senderName || 'Someone';
      formattedTitle = 'Money Received';
      formattedBody = `${sender} sent you ${amount}`;
      if (data?.message) {
        formattedBody += `\n\n"${data.message}"`;
      }
    } else if (eventType === 'p2p_transfer_sent') {
      const amount =
        typeof data?.amount === 'number'
          ? `₦${data.amount.toLocaleString()}`
          : data?.amount;
      const recipient = data?.recipientTag
        ? `@${data.recipientTag}`
        : data?.recipientName || 'recipient';
      formattedTitle = ' Money Sent';
      formattedBody = `You sent ${amount} to ${recipient}`;
      if (data?.message) {
        formattedBody += `\n\n"${data.message}"`;
      }
    }

    return this.expoPushService.sendToToken(user.expoPushToken, {
      title: formattedTitle,
      body: formattedBody,
      data: {
        eventType,
        userId: user.id,
        ...data,
      },
      sound: 'default',
      badge: 1,
      priority: 'high',
    });
  }

  /**
   * Create in-app notification
   */
  private async sendInApp(
    user: { id: string; firstName: string },
    variables: Record<string, any>,
  ): Promise<boolean> {
    const { eventType, title, message, type, ...data } = variables;

    try {
      await this.notificationsService.createNotification({
        userId: user.id,
        type: type || 'SYSTEM',
        title: title || 'Notification',
        message: message || '',
        data: {
          eventType,
          ...data,
        },
      });
      return true;
    } catch (error) {
      this.logger.error(`In-app notification failed for ${user.id}:`, error);
      return false;
    }
  }

  /**
   * Handle notification failure with retry logic
   */
  private async handleFailure(item: any, errorMessage: string) {
    const newRetryCount = item.retryCount + 1;

    if (newRetryCount >= item.maxRetries) {
      // Max retries reached, mark as failed
      await this.prisma.notificationQueue.update({
        where: { id: item.id },
        data: {
          status: 'FAILED',
          lastError: errorMessage,
          retryCount: newRetryCount,
        },
      });

      this.logger.warn(
        `Notification ${item.id} failed after ${newRetryCount} attempts: ${errorMessage}`,
      );
    } else {
      // Schedule retry with exponential backoff
      // 2^retryCount minutes: 2min, 4min, 8min...
      const backoffMinutes = Math.pow(2, newRetryCount);
      const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

      await this.prisma.notificationQueue.update({
        where: { id: item.id },
        data: {
          status: 'QUEUED',
          lastError: errorMessage,
          retryCount: newRetryCount,
          nextRetryAt,
        },
      });

      this.logger.log(
        `Notification ${item.id} will retry in ${backoffMinutes} minutes (attempt ${newRetryCount + 1}/${item.maxRetries})`,
      );
    }
  }

  /**
   * Queue a notification for processing
   */
  async queueNotification(params: {
    userId: string;
    channel: NotificationChannel;
    eventType: string;
    variables?: Record<string, any>;
    priority?: number;
    scheduledFor?: Date;
  }) {
    return this.prisma.notificationQueue.create({
      data: {
        userId: params.userId,
        channel: params.channel,
        eventType: params.eventType,
        variables: params.variables || {},
        priority: params.priority || 0,
        scheduledFor: params.scheduledFor,
        status: QueueStatus.QUEUED,
      },
    });
  }

  /**
   * Queue notifications for multiple users (bulk)
   */
  async queueBulkNotifications(params: {
    userIds: string[];
    channel: NotificationChannel;
    eventType: string;
    variables?: Record<string, any>;
    priority?: number;
    scheduledFor?: Date;
  }) {
    const data = params.userIds.map((userId) => ({
      userId,
      channel: params.channel,
      eventType: params.eventType,
      variables: params.variables || {},
      priority: params.priority || 0,
      scheduledFor: params.scheduledFor,
      status: QueueStatus.QUEUED,
    }));

    return this.prisma.notificationQueue.createMany({
      data,
    });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      // Use raw SQL to avoid enum type issues
      const stats = await this.prisma.$queryRaw<
        Array<{ status: string; count: bigint }>
      >`
        SELECT status, COUNT(*) as count
        FROM "notification_queue"
        GROUP BY status
      `;

      const byChannel = await this.prisma.$queryRaw<
        Array<{ channel: string; status: string; count: bigint }>
      >`
        SELECT channel, status, COUNT(*) as count
        FROM "notification_queue"
        GROUP BY channel, status
      `;

      // Convert BigInt to number and organize stats
      const statusMap: Record<string, number> = {};
      for (const row of stats) {
        statusMap[row.status] = Number(row.count);
      }

      const queued = statusMap['QUEUED'] || 0;
      const processing = statusMap['PROCESSING'] || 0;
      const sent = statusMap['SENT'] || 0;
      const failed = statusMap['FAILED'] || 0;

      return {
        total: queued + processing + sent + failed,
        queued,
        processing,
        sent,
        failed,
        byChannel: byChannel.map((row) => ({
          channel: row.channel,
          status: row.status,
          _count: Number(row.count),
        })),
      };
    } catch (error) {
      // Table might not exist yet, return empty stats
      this.logger.warn(
        'Could not get queue stats, table may not exist:',
        error.message,
      );
      return {
        total: 0,
        queued: 0,
        processing: 0,
        sent: 0,
        failed: 0,
        byChannel: [],
      };
    }
  }

  /**
   * Cleanup old processed notifications (run daily)
   */
  @Cron('0 3 * * *', {
    name: 'notification-queue-cleanup',
    timeZone: 'Africa/Lagos',
  })
  async cleanupOldItems() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const deleted = await this.prisma.notificationQueue.deleteMany({
      where: {
        status: { in: ['SENT', 'FAILED'] },
        updatedAt: { lt: thirtyDaysAgo },
      },
    });

    if (deleted.count > 0) {
      this.logger.log(
        `Cleaned up ${deleted.count} old notification queue items`,
      );
    }
  }
}
