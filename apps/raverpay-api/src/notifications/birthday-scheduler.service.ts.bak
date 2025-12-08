import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../services/email/email.service';
import { SmsService } from '../services/sms/sms.service';
import { ExpoPushService } from './expo-push.service';
import { NotificationsService } from './notifications.service';
import { NotificationQueueProcessor } from './notification-queue.processor';
import { NotificationChannel } from '@prisma/client';

/**
 * Birthday Scheduler Service
 *
 * Queues birthday notifications to users via:
 * - Email
 * - SMS (optional)
 * - Push notification
 * - In-app notification
 *
 * Runs daily at 8:00 AM to check for users with birthdays
 * Birthday notifications are always sent regardless of notification preferences
 * Uses the notification queue for efficient processing of thousands of users
 */
@Injectable()
export class BirthdaySchedulerService {
  private readonly logger = new Logger(BirthdaySchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly expoPushService: ExpoPushService,
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => NotificationQueueProcessor))
    private readonly queueProcessor: NotificationQueueProcessor,
  ) {}

  /**
   * Cron job that runs daily at 8:00 AM to queue birthday notifications
   * Uses Nigeria timezone (WAT - West Africa Time)
   * Queues notifications for background processing instead of sending immediately
   */
  @Cron('0 8 * * *', {
    name: 'birthday-notifications',
    timeZone: 'Africa/Lagos',
  })
  async sendBirthdayNotifications() {
    this.logger.log('Starting birthday notification job...');

    try {
      const birthdayUsers = await this.findUsersWithBirthdayToday();

      if (birthdayUsers.length === 0) {
        this.logger.log('No users with birthdays today');
        return;
      }

      this.logger.log(
        `Found ${birthdayUsers.length} users with birthdays today. Queueing notifications...`,
      );

      const userIds = birthdayUsers.map((u) => u.id);
      const birthdayVariables = {
        eventType: 'birthday',
        title: 'Happy Birthday! 🎂🎉',
        message:
          'On this special day, all of us at RaverPay want to wish you the happiest of birthdays! May this year bring you endless opportunities and success.',
        type: 'PROMOTIONAL',
        year: new Date().getFullYear(),
      };

      // Queue EMAIL notifications (priority 1 - lower, since they're rate limited)
      await this.queueProcessor.queueBulkNotifications({
        userIds,
        channel: NotificationChannel.EMAIL,
        eventType: 'birthday',
        variables: birthdayVariables,
        priority: 1,
      });

      // Queue PUSH notifications (priority 2 - higher, faster to send)
      await this.queueProcessor.queueBulkNotifications({
        userIds,
        channel: NotificationChannel.PUSH,
        eventType: 'birthday',
        variables: birthdayVariables,
        priority: 2,
      });

      // Queue IN_APP notifications (priority 3 - highest, instant)
      await this.queueProcessor.queueBulkNotifications({
        userIds,
        channel: NotificationChannel.IN_APP,
        eventType: 'birthday',
        variables: birthdayVariables,
        priority: 3,
      });

      this.logger.log(
        `Birthday notification job completed: Queued ${userIds.length * 3} notifications for ${userIds.length} users`,
      );
    } catch (error) {
      this.logger.error('Birthday notification job failed:', error);
    }
  }

  /**
   * Find all users whose birthday is today
   * Matches on month and day only (ignores year)
   */
  private async findUsersWithBirthdayToday(): Promise<
    Array<{
      id: string;
      email: string;
      phone: string;
      firstName: string;
      lastName: string | null;
      expoPushToken: string | null;
    }>
  > {
    const today = new Date();
    const month = today.getMonth() + 1; // getMonth() is 0-indexed
    const day = today.getDate();

    // Use raw query to extract month and day from dateOfBirth
    // This works with PostgreSQL
    const users = await this.prisma.$queryRaw<
      Array<{
        id: string;
        email: string;
        phone: string;
        firstName: string;
        lastName: string | null;
        expoPushToken: string | null;
      }>
    >`
      SELECT id, email, phone, "firstName", "lastName", "expoPushToken"
      FROM "User"
      WHERE "dateOfBirth" IS NOT NULL
        AND EXTRACT(MONTH FROM "dateOfBirth") = ${month}
        AND EXTRACT(DAY FROM "dateOfBirth") = ${day}
        AND status = 'ACTIVE'
    `;

    return users;
  }

  /**
   * Send birthday notifications to a single user via all channels
   * Birthday notifications bypass user preferences and are always sent
   */
  private async sendBirthdayNotificationsToUser(user: {
    id: string;
    email: string;
    phone: string;
    firstName: string;
    lastName: string | null;
    expoPushToken: string | null;
  }) {
    const promises: Promise<boolean>[] = [];

    // 1. Send Email (always)
    promises.push(
      this.emailService
        .sendBirthdayEmail(
          user.email,
          user.firstName,
          user.lastName || undefined,
        )
        .catch((error) => {
          this.logger.error(`Birthday email failed for ${user.id}:`, error);
          return false;
        }),
    );

    // 2. Send SMS (always)
    // if (user.phone) {
    //   promises.push(
    //     this.smsService.sendBirthdaySms(user.phone, user.firstName).catch((error) => {
    //       this.logger.error(`Birthday SMS failed for ${user.id}:`, error);
    //       return false;
    //     }),
    //   );
    // }

    // 3. Send Push Notification (if user has token)
    if (user.expoPushToken) {
      promises.push(
        this.expoPushService
          .sendToToken(user.expoPushToken, {
            title: `Happy Birthday, ${user.firstName}! 🎂`,
            body: 'The RaverPay team wishes you a wonderful birthday filled with joy and happiness!',
            data: {
              type: 'birthday',
              userId: user.id,
            },
            sound: 'default',
            badge: 1,
            priority: 'high',
          })
          .catch((error) => {
            this.logger.error(
              `Birthday push notification failed for ${user.id}:`,
              error,
            );
            return false;
          }),
      );
    }

    // 4. Create In-App Notification (always)
    promises.push(
      this.notificationsService
        .createNotification({
          userId: user.id,
          type: 'PROMOTIONAL',
          title: `Happy Birthday, ${user.firstName}! 🎂🎉`,
          message:
            'On this special day, all of us at RaverPay want to wish you the happiest of birthdays! May this year bring you endless opportunities and success.',
          data: {
            type: 'birthday',
            year: new Date().getFullYear(),
          },
        })
        .then(() => true)
        .catch((error) => {
          this.logger.error(
            `Birthday in-app notification failed for ${user.id}:`,
            error,
          );
          return false;
        }),
    );

    // Wait for all notifications to complete
    const results = await Promise.allSettled(promises);

    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value === true,
    ).length;

    this.logger.log(
      `Birthday notifications sent to ${user.firstName} (${user.id}): ${successCount}/${results.length} successful`,
    );
  }

  /**
   * Manual trigger for testing - sends birthday notification to a specific user
   * Can be called from admin endpoint for testing purposes
   */
  async sendBirthdayNotificationToUser(userId: string): Promise<{
    success: boolean;
    message: string;
  }> {
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
      return { success: false, message: 'User not found' };
    }

    try {
      await this.sendBirthdayNotificationsToUser(user);
      return {
        success: true,
        message: `Birthday notifications sent to ${user.firstName}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to send birthday notifications: ${error.message}`,
      };
    }
  }
}
