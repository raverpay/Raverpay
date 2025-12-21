import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationProcessor } from './processors/notification.processor';
import { WebhookRetryProcessor } from './processors/webhook-retry.processor';
import { ReconciliationProcessor } from './processors/reconciliation.processor';
import { QueueService } from './queue.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { VTUModule } from '../vtu/vtu.module';
import { CircleModule } from '../circle/circle.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { EmailModule } from '../services/email/email.module';
import { SmsModule } from '../services/sms/sms.module';

/**
 * Queue Module
 *
 * Manages all background job queues using BullMQ with Redis.
 * Replaces database-backed queue system for better performance.
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    // Import Email and SMS modules for NotificationProcessor
    EmailModule,
    SmsModule,
    // Import modules with forwardRef to break circular dependencies
    forwardRef(() => NotificationsModule),
    forwardRef(() => PaymentsModule),
    forwardRef(() => VTUModule),
    forwardRef(() => CircleModule),
    forwardRef(() => WebhooksModule),
    // Notification Queue - processes EMAIL, SMS, PUSH, IN_APP notifications
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl =
          configService.get<string>('UPSTASH_REDIS_URL') ||
          configService.get<string>('REDIS_URL');

        if (!redisUrl) {
          const isDevelopment =
            configService.get<string>('NODE_ENV') !== 'production';
          if (isDevelopment) {
            // In development, allow app to start without Redis
            // BullMQ queues will fail but app won't crash
            console.warn(
              '⚠️  REDIS_URL or UPSTASH_REDIS_URL not configured. BullMQ queues will not work.',
            );
            // Return a dummy connection that will fail gracefully
            return {
              connection: {
                host: 'localhost',
                port: 6379,
                retryStrategy: () => null, // Don't retry
                connectTimeout: 1000,
                maxRetriesPerRequest: null, // BullMQ requirement
                enableOfflineQueue: false,
                lazyConnect: true,
              },
            };
          }
          throw new Error(
            'REDIS_URL or UPSTASH_REDIS_URL is required for BullMQ in production',
          );
        }

        // Parse Redis URL for ioredis connection
        const url = new URL(redisUrl);
        let password: string | undefined;
        if (url.username && url.password) {
          password = url.password;
        } else if (url.username) {
          password = url.username;
        }

        const connection = {
          host: url.hostname,
          port: parseInt(url.port || '6379'),
          password,
          tls: url.protocol === 'rediss:' ? {} : undefined,
          retryStrategy: (times: number) => {
            if (times > 3) {
              return null; // Stop retrying
            }
            return Math.min(times * 100, 1000);
          },
          connectTimeout: 10000,
          maxRetriesPerRequest: null, // BullMQ requirement - must be null
          enableOfflineQueue: false,
          showFriendlyErrorStack: false,
          lazyConnect: true, // Don't connect immediately
        };

        // Suppress Redis connection errors in development
        const isDevelopment =
          configService.get<string>('NODE_ENV') !== 'production';
        if (isDevelopment) {
          // In development, we'll let BullMQ handle errors gracefully
          // The connection will fail but won't crash the app
        }

        return { connection };
      },
    }),
    // Register queues
    BullModule.registerQueue(
      {
        name: 'notifications',
      },
      {
        name: 'webhook-retry',
      },
      {
        name: 'reconciliation',
      },
    ),
  ],
  providers: [
    QueueService,
    NotificationProcessor,
    WebhookRetryProcessor,
    ReconciliationProcessor,
  ],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
