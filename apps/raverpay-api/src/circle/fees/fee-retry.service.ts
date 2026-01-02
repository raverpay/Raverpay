import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { CircleApiClient } from '../circle-api.client';
import { EntitySecretService } from '../entity/entity-secret.service';
import { CreateTransferResponse } from '../circle.types';

export interface FeeRetryQueueItem {
  id: string;
  walletId: string;
  collectionWallet: string;
  fee: string;
  mainTransferId: string;
  retryCount: number;
  status: string;
  lastError?: string;
  createdAt: Date;
}

/**
 * Fee Retry Service
 * Handles retrying failed fee collections in the background
 */
@Injectable()
export class FeeRetryService {
  private readonly logger = new Logger(FeeRetryService.name);
  private readonly MAX_RETRIES = 3;
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiClient: CircleApiClient,
    private readonly entitySecret: EntitySecretService,
  ) {}

  /**
   * Queue a failed fee collection for retry
   */
  async queueFeeRetry(params: {
    walletId: string;
    collectionWallet: string;
    fee: string;
    mainTransferId: string;
  }): Promise<void> {
    try {
      await this.prisma.feeRetryQueue.create({
        data: {
          walletId: params.walletId,
          collectionWallet: params.collectionWallet,
          fee: params.fee,
          mainTransferId: params.mainTransferId,
          status: 'PENDING',
        },
      });

      this.logger.log(
        `Queued fee retry for transaction ${params.mainTransferId}`,
      );
    } catch (error) {
      this.logger.error('Failed to queue fee retry:', error);
    }
  }

  /**
   * Retry failed fee collections (runs every 5 minutes)
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryFailedFees(): Promise<void> {
    // Prevent concurrent execution
    if (this.isProcessing) {
      this.logger.debug('Fee retry already in progress, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      const pendingRetries = await this.getPendingRetries();

      if (pendingRetries.length === 0) {
        return;
      }

      this.logger.log(
        `Processing ${pendingRetries.length} pending fee retries`,
      );

      for (const retry of pendingRetries) {
        await this.processRetry(retry);
      }
    } catch (error) {
      this.logger.error('Error in fee retry cron job:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get pending retries
   */
  private async getPendingRetries(): Promise<FeeRetryQueueItem[]> {
    return this.prisma.feeRetryQueue.findMany({
      where: {
        status: 'PENDING',
        retryCount: { lt: this.MAX_RETRIES },
      },
      orderBy: { createdAt: 'asc' },
      take: 50, // Process max 50 at a time
    }) as Promise<FeeRetryQueueItem[]>;
  }

  /**
   * Process a single retry
   */
  private async processRetry(retry: FeeRetryQueueItem): Promise<void> {
    try {
      // Check if already at max retries
      if (retry.retryCount >= this.MAX_RETRIES) {
        await this.markAsFailed(retry.id);
        await this.notifyAdmin(retry);
        return;
      }

      this.logger.log(
        `Retrying fee collection for transaction ${retry.mainTransferId} (attempt ${retry.retryCount + 1}/${this.MAX_RETRIES})`,
      );

      // Generate entity secret ciphertext
      const entitySecretCiphertext =
        await this.entitySecret.generateEntitySecretCiphertext();

      // Attempt the fee transfer
      const response = await this.apiClient.post<CreateTransferResponse>(
        '/transactions/transfer',
        {
          walletId: retry.walletId,
          destinationAddress: retry.collectionWallet,
          tokenId: null,
          amounts: [retry.fee],
          feeLevel: 'MEDIUM',
          entitySecretCiphertext,
        },
      );

      if (response.data?.id) {
        // Success - update transaction record and remove from queue
        await this.markFeeCollected(retry.mainTransferId, response.data.id);
        await this.deleteRetry(retry.id);

        this.logger.log(
          `Successfully collected fee for transaction ${retry.mainTransferId}`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Fee retry failed for transaction ${retry.mainTransferId}:`,
        error.message,
      );

      // Increment retry count
      await this.incrementRetryCount(retry.id, error.message);

      // Check if we've hit max retries
      if (retry.retryCount + 1 >= this.MAX_RETRIES) {
        await this.markAsFailed(retry.id);
        await this.notifyAdmin(retry);
      }
    }
  }

  /**
   * Mark fee as collected in the main transaction
   */
  private async markFeeCollected(
    mainTransferId: string,
    feeTransferId: string,
  ): Promise<void> {
    try {
      await this.prisma.circleTransaction.updateMany({
        where: { id: mainTransferId },
        data: {
          feeCollected: true,
          feeTransferId,
        },
      });

      this.logger.log(
        `Marked fee as collected for transaction ${mainTransferId}`,
      );
    } catch (error) {
      this.logger.error('Failed to mark fee as collected:', error);
    }
  }

  /**
   * Delete a retry from queue
   */
  private async deleteRetry(retryId: string): Promise<void> {
    try {
      await this.prisma.feeRetryQueue.delete({
        where: { id: retryId },
      });
    } catch (error) {
      this.logger.error('Failed to delete retry:', error);
    }
  }

  /**
   * Increment retry count
   */
  private async incrementRetryCount(
    retryId: string,
    errorMessage: string,
  ): Promise<void> {
    try {
      await this.prisma.feeRetryQueue.update({
        where: { id: retryId },
        data: {
          retryCount: { increment: 1 },
          lastRetryAt: new Date(),
          lastError: errorMessage,
        },
      });
    } catch (error) {
      this.logger.error('Failed to increment retry count:', error);
    }
  }

  /**
   * Mark retry as failed
   */
  private async markAsFailed(retryId: string): Promise<void> {
    try {
      await this.prisma.feeRetryQueue.update({
        where: { id: retryId },
        data: {
          status: 'FAILED',
        },
      });

      this.logger.warn(
        `Fee retry ${retryId} marked as failed after max retries`,
      );
    } catch (error) {
      this.logger.error('Failed to mark retry as failed:', error);
    }
  }

  /**
   * Notify admin of failed fee collection
   */
  private async notifyAdmin(retry: FeeRetryQueueItem): Promise<void> {
    // TODO: Implement admin notification (email, Slack, etc.)
    this.logger.error(
      `ADMIN ALERT: Fee collection failed after ${this.MAX_RETRIES} retries`,
      {
        retryId: retry.id,
        mainTransferId: retry.mainTransferId,
        fee: retry.fee,
        walletId: retry.walletId,
        lastError: retry.lastError,
      },
    );
  }

  /**
   * Get retry queue statistics
   */
  async getRetryStats(): Promise<{
    pending: number;
    failed: number;
    totalQueued: number;
  }> {
    const [pending, failed, total] = await Promise.all([
      this.prisma.feeRetryQueue.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.feeRetryQueue.count({
        where: { status: 'FAILED' },
      }),
      this.prisma.feeRetryQueue.count(),
    ]);

    return {
      pending,
      failed,
      totalQueued: total,
    };
  }

  /**
   * Get failed retries for admin view
   */
  async getFailedRetries(limit = 50): Promise<FeeRetryQueueItem[]> {
    return this.prisma.feeRetryQueue.findMany({
      where: { status: 'FAILED' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }) as Promise<FeeRetryQueueItem[]>;
  }

  /**
   * Manually retry a failed fee collection
   */
  async manualRetry(retryId: string): Promise<boolean> {
    try {
      const retry = await this.prisma.feeRetryQueue.findUnique({
        where: { id: retryId },
      });

      if (!retry) {
        throw new Error('Retry not found');
      }

      // Reset status and retry count for manual retry
      await this.prisma.feeRetryQueue.update({
        where: { id: retryId },
        data: {
          status: 'PENDING',
          retryCount: 0,
          lastError: null,
        },
      });

      // Process immediately
      await this.processRetry(retry as FeeRetryQueueItem);

      return true;
    } catch (error) {
      this.logger.error(`Manual retry failed for ${retryId}:`, error);
      return false;
    }
  }
}
