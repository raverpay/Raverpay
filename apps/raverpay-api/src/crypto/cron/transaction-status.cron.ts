import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
// Venly services - COMMENTED OUT (not using Venly anymore, using Circle)
// import { VenlyService } from '../venly/venly.service';
import { CryptoSendService } from '../services/crypto-send.service';
import { CryptoTransactionStatus } from '@prisma/client';
import { AuditService } from '../../common/services/audit.service';
import {
  AuditAction,
  ActorType,
  AuditStatus,
} from '../../common/types/audit-log.types';

/**
 * Transaction Status Check Cron Job
 *
 * Periodically checks pending crypto transactions and updates their status.
 * This serves as a fallback mechanism in case webhooks fail or are missed.
 *
 * Runs every 5 minutes to check transactions that have been pending for more than 2 minutes.
 */
@Injectable()
export class TransactionStatusCron {
  private readonly logger = new Logger(TransactionStatusCron.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    // Venly services - COMMENTED OUT (not using Venly anymore, using Circle)
    // private readonly venly: VenlyService,
    private readonly cryptoSend: CryptoSendService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Check pending transactions every 5 minutes
   * Only checks transactions older than 2 minutes to avoid race conditions with webhooks
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkPendingTransactions() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Audit log for job started
    // await this.auditService.log({
    //   userId: null,
    //   action: AuditAction.JOB_STARTED,
    //   resource: 'JOB',
    //   metadata: {
    //     jobName: 'checkPendingTransactions',
    //     scheduledTime: new Date(),
    //   },
    //   actorType: ActorType.SYSTEM,
    // });

    try {
      // Find transactions that have been pending for more than 2 minutes
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

      const pendingTransactions = await this.prisma.cryptoTransaction.findMany({
        where: {
          status: CryptoTransactionStatus.PENDING,
          submittedAt: {
            lt: twoMinutesAgo, // Only check transactions older than 2 minutes
          },
        },
        take: 50, // Process max 50 transactions at a time
        orderBy: {
          submittedAt: 'asc', // Check oldest first
        },
      });

      if (pendingTransactions.length === 0) {
        return;
      }

      let checkedCount = 0;
      const updatedCount = 0; // Always 0 since Venly is disabled

      // Check each transaction status
      for (const transaction of pendingTransactions) {
        try {
          // Get transaction status from Venly - COMMENTED OUT (not using Venly anymore, using Circle)
          // const status = await this.venly.getTransactionStatus(
          //   'MATIC', // secretType for Polygon
          //   transaction.transactionHash,
          // );

          // Skip Venly status check - Venly integration disabled
          checkedCount++;
          continue; // Skip this transaction since Venly is disabled

          // COMMENTED OUT - Venly status handling (not using Venly anymore, using Circle)
          // // Update transaction based on status
          // if (status.status === 'SUCCEEDED') {
          //   // Use the same handler as webhook
          //   await this.cryptoSend.handleTransactionSuccess(
          //     transaction.transactionHash,
          //     {
          //       result: status,
          //       eventType: 'TRANSACTION_SUCCEEDED',
          //     },
          //   );

          //   updatedCount++;
          // } else if (status.status === 'FAILED') {
          //   // Use the same handler as webhook
          //   await this.cryptoSend.handleTransactionFailure(
          //     transaction.transactionHash,
          //     {
          //       result: status,
          //       eventType: 'TRANSACTION_FAILED',
          //     },
          //   );

          //   updatedCount++;
          // }

          // // Small delay to avoid rate limiting
          // await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          this.logger.error(
            `Failed to check transaction ${transaction.transactionHash}`,
            error,
          );
          // Continue with next transaction
        }
      }

      // Only log if there were updates or errors
      if (updatedCount > 0 || checkedCount > 0) {
        this.logger.log(
          `Transaction status check: ${checkedCount} checked, ${updatedCount} updated`,
        );
      }

      // Audit log for job completed
      // await this.auditService.log({
      //   userId: null,
      //   action: AuditAction.JOB_COMPLETED,
      //   resource: 'JOB',
      //   metadata: {
      //     jobName: 'checkPendingTransactions',
      //     transactionsChecked: checkedCount,
      //     transactionsUpdated: updatedCount,
      //   },
      //   actorType: ActorType.SYSTEM,
      //   status: AuditStatus.SUCCESS,
      // });
    } catch (error) {
      this.logger.error('Error in transaction status check cron', error);

      // Audit log for job failed
      // await this.auditService.log({
      //   userId: null,
      //   action: AuditAction.JOB_FAILED,
      //   resource: 'JOB',
      //   metadata: {
      //     jobName: 'checkPendingTransactions',
      //     error: error.message,
      //   },
      //   actorType: ActorType.SYSTEM,
      //   status: AuditStatus.FAILURE,
      //   errorMessage: error.message,
      // });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check a specific transaction immediately (can be called manually)
   */
  async checkTransactionStatus(transactionHash: string): Promise<void> {
    try {
      this.logger.log(`Manually checking transaction: ${transactionHash}`);

      const transaction = await this.prisma.cryptoTransaction.findUnique({
        where: { transactionHash },
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== CryptoTransactionStatus.PENDING) {
        this.logger.log(`Transaction already ${transaction.status}`);
        return;
      }

      // Get transaction status from Venly - COMMENTED OUT (not using Venly anymore, using Circle)
      // const status = await this.venly.getTransactionStatus(
      //   'MATIC',
      //   transactionHash,
      // );

      // Skip Venly status check - Venly integration disabled
      this.logger.warn(
        'Venly transaction status check disabled - using Circle instead',
      );
      return;

      // COMMENTED OUT - Venly status handling (not using Venly anymore, using Circle)
      // // Update transaction based on status
      // if (status.status === 'SUCCEEDED') {
      //   await this.cryptoSend.handleTransactionSuccess(transactionHash, {
      //     result: status,
      //     eventType: 'TRANSACTION_SUCCEEDED',
      //   });
      // } else if (status.status === 'FAILED') {
      //   await this.cryptoSend.handleTransactionFailure(transactionHash, {
      //     result: status,
      //     eventType: 'TRANSACTION_FAILED',
      //   });
      // }

      // this.logger.log(
      //   `Transaction ${transactionHash} status: ${status.status}`,
      // );
    } catch (error) {
      this.logger.error(
        `Failed to check transaction status for ${transactionHash}`,
        error,
      );
      throw error;
    }
  }
}
