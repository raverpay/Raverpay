import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaystackService } from '../../payments/paystack.service';
import { VTUService } from '../../vtu/vtu.service';
import { CircleTransactionService } from '../../circle/transactions/circle-transaction.service';
import { TransactionStatus } from '@prisma/client';
import { QueueService, ReconciliationJobData } from '../queue.service';

/**
 * Reconciliation Processor
 *
 * Checks stuck transactions and reconciles with processor APIs.
 * Queries processor for actual status when webhooks fail or are delayed.
 */
@Processor('reconciliation', {
  concurrency: 3, // Process up to 3 reconciliation jobs concurrently
  limiter: {
    max: 100, // Max 100 jobs per interval
    duration: 60000, // Per minute
  },
})
@Injectable()
export class ReconciliationProcessor extends WorkerHost {
  private readonly logger = new Logger(ReconciliationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paystackService: PaystackService,
    private readonly vtuService: VTUService,
    private readonly circleTransactionService: CircleTransactionService,
  ) {
    super();
  }

  /**
   * Process reconciliation job
   */
  async process(job: Job<ReconciliationJobData>): Promise<void> {
    const { transactionId, provider, reference, providerRef } = job.data;

    this.logger.log(`Reconciling transaction: ${reference} (${provider})`);

    try {
      // Get transaction from database
      const transaction = await this.prisma.transaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction) {
        throw new Error(`Transaction not found: ${transactionId}`);
      }

      // Skip if already in final state
      if (
        transaction.status === TransactionStatus.COMPLETED ||
        transaction.status === TransactionStatus.FAILED ||
        transaction.status === TransactionStatus.REVERSED
      ) {
        this.logger.debug(
          `Transaction ${reference} already in final state: ${transaction.status}`,
        );
        return;
      }

      // Query processor for actual status
      const processorStatus = await this.queryProcessorStatus(
        provider,
        reference,
        providerRef,
      );

      // Update transaction if status differs
      if (processorStatus && processorStatus !== transaction.status) {
        await this.updateTransactionStatus(
          transaction.id,
          processorStatus,
          processorStatus === TransactionStatus.COMPLETED
            ? new Date()
            : undefined,
        );

        this.logger.log(
          `✅ Reconciled transaction ${reference}: ${transaction.status} → ${processorStatus}`,
        );
      } else if (processorStatus === transaction.status) {
        this.logger.debug(
          `Transaction ${reference} status matches processor: ${processorStatus}`,
        );
      } else {
        this.logger.warn(
          `Could not determine processor status for transaction ${reference}`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to reconcile transaction ${reference}`, error);

      // Re-throw to trigger BullMQ retry
      throw error;
    }
  }

  /**
   * Query processor for transaction status
   */
  private async queryProcessorStatus(
    provider: 'paystack' | 'vtpass' | 'circle',
    reference: string,
    providerRef?: string,
  ): Promise<TransactionStatus | null> {
    try {
      switch (provider) {
        case 'paystack':
          return await this.queryPaystackStatus(reference);

        case 'vtpass':
          return await this.queryVTPassStatus(reference, providerRef);

        case 'circle':
          return await this.queryCircleStatus(providerRef || reference);

        default:
          this.logger.warn(`Unknown provider: ${provider}`);
          return null;
      }
    } catch (error) {
      this.logger.error(
        `Failed to query ${provider} status for ${reference}`,
        error,
      );
      return null;
    }
  }

  /**
   * Query Paystack transaction status
   */
  private async queryPaystackStatus(
    reference: string,
  ): Promise<TransactionStatus | null> {
    try {
      const payment = await this.paystackService.verifyPayment(reference);

      if (payment.status === 'success') {
        return TransactionStatus.COMPLETED;
      } else if (payment.status === 'failed') {
        return TransactionStatus.FAILED;
      } else {
        return TransactionStatus.PROCESSING;
      }
    } catch (error) {
      this.logger.error(`Paystack verification failed for ${reference}`, error);
      return null;
    }
  }

  /**
   * Query VTPass transaction status
   */
  private async queryVTPassStatus(
    reference: string,
    providerRef?: string,
  ): Promise<TransactionStatus | null> {
    try {
      // VTPass doesn't have a direct status query endpoint
      // We would need to check the order status via their API
      // For now, return null to indicate we can't query
      this.logger.debug(`VTPass status query not implemented for ${reference}`);
      return null;
    } catch (error) {
      this.logger.error(`VTPass query failed for ${reference}`, error);
      return null;
    }
  }

  /**
   * Query Circle transaction status
   */
  private async queryCircleStatus(
    transactionId: string,
  ): Promise<TransactionStatus | null> {
    try {
      const transaction =
        await this.circleTransactionService.getTransaction(transactionId);

      if (!transaction) {
        return null;
      }

      // Map Circle state to TransactionStatus
      const state = transaction.state as string;
      switch (state) {
        case 'COMPLETE':
          return TransactionStatus.COMPLETED;
        case 'FAILED':
        case 'DENIED':
          return TransactionStatus.FAILED;
        case 'CANCELLED':
          return TransactionStatus.CANCELLED;
        case 'QUEUED':
        case 'SENT':
        case 'CONFIRMED':
        case 'INITIATED':
          return TransactionStatus.PROCESSING;
        default:
          return TransactionStatus.PROCESSING;
      }
    } catch (error) {
      this.logger.error(`Circle query failed for ${transactionId}`, error);
      return null;
    }
  }

  /**
   * Update transaction status
   */
  private async updateTransactionStatus(
    transactionId: string,
    status: TransactionStatus,
    completedAt?: Date,
  ): Promise<void> {
    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status,
        completedAt:
          completedAt ||
          (status === TransactionStatus.COMPLETED ? new Date() : undefined),
        failedAt: status === TransactionStatus.FAILED ? new Date() : undefined,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Job completed event
   */
  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Reconciliation job completed: ${job.id}`);
  }

  /**
   * Job failed event
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Reconciliation job failed: ${job.id} - ${error.message}`,
      error.stack,
    );
  }
}
