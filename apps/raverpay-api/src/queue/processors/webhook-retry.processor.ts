import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PaystackWebhookService } from '../../webhooks/paystack-webhook.service';
import { CircleWebhookService } from '../../circle/webhooks/circle-webhook.service';
import { VTUService } from '../../vtu/vtu.service';
import { QueueService, WebhookRetryJobData } from '../queue.service';

/**
 * Webhook Retry Processor
 *
 * Retries failed webhook processing with exponential backoff.
 * Handles webhooks from Paystack, Circle, and VTPass.
 */
@Processor('webhook-retry', {
  concurrency: 5, // Process up to 5 retry jobs concurrently
  limiter: {
    max: 50, // Max 50 jobs per interval
    duration: 60000, // Per minute
  },
})
@Injectable()
export class WebhookRetryProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookRetryProcessor.name);

  constructor(
    private readonly paystackWebhookService: PaystackWebhookService,
    private readonly circleWebhookService: CircleWebhookService,
    private readonly vtuService: VTUService,
  ) {
    super();
  }

  /**
   * Process webhook retry job
   */
  async process(job: Job<WebhookRetryJobData>): Promise<void> {
    const { provider, event, payload, attempt } = job.data;

    this.logger.log(
      `Retrying ${provider} webhook: ${event} (attempt ${attempt})`,
    );

    try {
      switch (provider) {
        case 'paystack':
          await this.processPaystackWebhook(event, payload);
          break;

        case 'circle':
          await this.processCircleWebhook(event, payload);
          break;

        case 'vtpass':
          await this.processVTPassWebhook(event, payload);
          break;

        default:
          throw new Error(`Unknown webhook provider: ${provider}`);
      }

      this.logger.log(
        `✅ Successfully processed ${provider} webhook retry: ${event}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process ${provider} webhook retry: ${event}`,
        error,
      );

      // If max attempts reached, log for manual investigation
      if (attempt >= 5) {
        this.logger.error(
          `Max retry attempts reached for ${provider} webhook: ${event}. Manual investigation required.`,
        );
      }

      // Re-throw to trigger BullMQ retry
      throw error;
    }
  }

  /**
   * Process Paystack webhook
   */
  private async processPaystackWebhook(
    event: string,
    payload: any,
  ): Promise<void> {
    switch (event) {
      case 'charge.success':
        await this.paystackWebhookService.handleChargeSuccess(payload.data);
        break;

      case 'transfer.success':
        // Paystack transfer success is handled via charge.success
        this.logger.log(
          `Paystack transfer.success event received: ${payload.data?.reference || 'unknown'}`,
        );
        break;

      case 'transfer.failed':
        // Paystack transfer failed - log for manual review
        this.logger.warn(
          `Paystack transfer.failed event: ${payload.data?.reference || 'unknown'}`,
        );
        break;

      case 'transfer.reversed':
        // Paystack transfer reversed - log for manual review
        this.logger.warn(
          `Paystack transfer.reversed event: ${payload.data?.reference || 'unknown'}`,
        );
        break;

      default:
        this.logger.warn(`Unhandled Paystack webhook event: ${event}`);
    }
  }

  /**
   * Process Circle webhook
   */
  private async processCircleWebhook(
    event: string,
    payload: any,
  ): Promise<void> {
    await this.circleWebhookService.processWebhook(payload);
  }

  /**
   * Process VTPass webhook
   */
  private async processVTPassWebhook(
    event: string,
    payload: any,
  ): Promise<void> {
    // VTPass webhooks update transaction status
    const { reference, status } = payload.data || payload;

    if (reference && status) {
      await this.vtuService.updateTransactionStatus(
        reference,
        status === 'success' ? 'COMPLETED' : 'FAILED',
      );
    } else {
      this.logger.warn('VTPass webhook missing reference or status');
    }
  }

  /**
   * Job completed event
   */
  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Webhook retry job completed: ${job.id}`);
  }

  /**
   * Job failed event
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Webhook retry job failed: ${job.id} - ${error.message}`,
      error.stack,
    );
  }
}
