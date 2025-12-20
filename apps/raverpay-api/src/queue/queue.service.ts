import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface NotificationJobData {
  userId: string;
  channel: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  eventType: string;
  templateId?: string;
  variables?: Record<string, any>;
  priority?: number;
  scheduledFor?: Date;
}

export interface WebhookRetryJobData {
  provider: 'paystack' | 'circle' | 'vtpass';
  event: string;
  payload: any;
  attempt: number;
  originalError?: string;
}

export interface ReconciliationJobData {
  transactionId: string;
  provider: 'paystack' | 'vtpass' | 'circle';
  reference: string;
  providerRef?: string;
}

/**
 * Queue Service
 *
 * Provides methods to add jobs to BullMQ queues.
 * Used by services to enqueue background jobs.
 */
@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('notifications')
    private readonly notificationQueue: Queue<NotificationJobData>,
    @InjectQueue('webhook-retry')
    private readonly webhookRetryQueue: Queue<WebhookRetryJobData>,
    @InjectQueue('reconciliation')
    private readonly reconciliationQueue: Queue<ReconciliationJobData>,
  ) {}

  /**
   * Add notification job to queue
   */
  async addNotificationJob(data: NotificationJobData): Promise<void> {
    try {
      const delay = data.scheduledFor
        ? Math.max(0, data.scheduledFor.getTime() - Date.now())
        : undefined;

      await this.notificationQueue.add(
        `${data.channel.toLowerCase()}-${data.eventType}`,
        data,
        {
          priority: data.priority || 0,
          delay,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000, // 2s, 4s, 8s
          },
          removeOnComplete: {
            age: 24 * 3600, // Keep completed jobs for 24 hours
            count: 1000, // Keep last 1000 completed jobs
          },
          removeOnFail: {
            age: 7 * 24 * 3600, // Keep failed jobs for 7 days
          },
        },
      );

      this.logger.debug(
        `Notification job queued: ${data.channel} - ${data.eventType} for user ${data.userId}`,
      );
    } catch (error) {
      this.logger.error('Failed to queue notification job', error);
      throw error;
    }
  }

  /**
   * Add bulk notification jobs
   */
  async addBulkNotificationJobs(jobs: NotificationJobData[]): Promise<void> {
    try {
      const queueJobs = jobs.map((data) => ({
        name: `${data.channel.toLowerCase()}-${data.eventType}`,
        data,
        opts: {
          priority: data.priority || 0,
          delay: data.scheduledFor
            ? Math.max(0, data.scheduledFor.getTime() - Date.now())
            : undefined,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            age: 24 * 3600,
            count: 1000,
          },
          removeOnFail: {
            age: 7 * 24 * 3600,
          },
        },
      }));

      await this.notificationQueue.addBulk(queueJobs);
      this.logger.log(`Bulk notification jobs queued: ${jobs.length} jobs`);
    } catch (error) {
      this.logger.error('Failed to queue bulk notification jobs', error);
      throw error;
    }
  }

  /**
   * Add webhook retry job
   */
  async addWebhookRetryJob(data: WebhookRetryJobData): Promise<void> {
    try {
      await this.webhookRetryQueue.add(`${data.provider}-${data.event}`, data, {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 60000, // 1min, 2min, 4min, 8min, 16min
        },
        removeOnComplete: {
          age: 24 * 3600,
        },
        removeOnFail: {
          age: 7 * 24 * 3600,
        },
      });

      this.logger.debug(
        `Webhook retry job queued: ${data.provider} - ${data.event} (attempt ${data.attempt})`,
      );
    } catch (error) {
      this.logger.error('Failed to queue webhook retry job', error);
      throw error;
    }
  }

  /**
   * Add reconciliation job
   */
  async addReconciliationJob(data: ReconciliationJobData): Promise<void> {
    try {
      await this.reconciliationQueue.add(
        `reconcile-${data.provider}-${data.reference}`,
        data,
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 300000, // 5min, 10min, 20min
          },
          removeOnComplete: {
            age: 7 * 24 * 3600,
          },
          removeOnFail: {
            age: 30 * 24 * 3600, // Keep failed reconciliations for 30 days
          },
        },
      );

      this.logger.debug(
        `Reconciliation job queued: ${data.provider} - ${data.reference}`,
      );
    } catch (error) {
      this.logger.error('Failed to queue reconciliation job', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [notifications, webhooks, reconciliation] = await Promise.all([
      this.notificationQueue.getJobCounts(),
      this.webhookRetryQueue.getJobCounts(),
      this.reconciliationQueue.getJobCounts(),
    ]);

    return {
      notifications,
      webhooks,
      reconciliation,
    };
  }
}
