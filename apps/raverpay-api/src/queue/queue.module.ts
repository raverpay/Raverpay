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
          throw new Error(
            'REDIS_URL or UPSTASH_REDIS_URL is required for BullMQ',
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

        return {
          connection: {
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
            maxRetriesPerRequest: 3,
            enableOfflineQueue: false,
          },
        };
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
