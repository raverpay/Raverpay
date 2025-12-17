import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CircleApiClient } from '../circle-api.client';
import { CircleConfigService } from '../config/circle.config.service';
import { CircleTransactionService } from '../transactions/circle-transaction.service';
import { CCTPService } from '../transactions/cctp.service';
import { CircleWebhookEvent, WebhookSubscription } from '../circle.types';
import { CircleTransactionState, CircleWalletState } from '@prisma/client';
import * as crypto from 'crypto';

/**
 * Circle Webhook Service
 * Handles webhook events from Circle for transaction and wallet updates
 */
@Injectable()
export class CircleWebhookService {
  private readonly logger = new Logger(CircleWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiClient: CircleApiClient,
    private readonly config: CircleConfigService,
    private readonly transactionService: CircleTransactionService,
    private readonly cctpService: CCTPService,
  ) {}

  /**
   * Verify webhook signature
   * Circle uses HMAC-SHA256 for webhook signatures
   */
  verifySignature(
    payload: string,
    signature: string,
    timestamp: string,
  ): boolean {
    const webhookSecret = this.config.webhookSecret;

    if (!webhookSecret) {
      this.logger.warn('Webhook secret not configured, skipping verification');
      return true; // Allow in development
    }

    try {
      // Circle's signature format: t=timestamp,v1=signature
      const signedPayload = `${timestamp}.${payload}`;
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(signedPayload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      this.logger.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Process incoming webhook event
   */
  async processWebhook(event: CircleWebhookEvent): Promise<void> {
    // Log the webhook
    const webhookLog = await this.prisma.circleWebhookLog.create({
      data: {
        subscriptionId: event.subscriptionId,
        notificationId: event.notificationId,
        eventType: event.notificationType,
        payload: event as object,
        entityId: event.notification.id,
        walletId: event.notification.walletId,
        transactionId: event.notification.id,
        isValid: true,
        processed: false,
      },
    });

    try {
      this.logger.log(
        `Processing webhook: ${event.notificationType} - ${event.notificationId}`,
      );

      // Route to appropriate handler
      switch (event.notificationType) {
        case 'transactions.created':
        case 'transactions.complete':
        case 'transactions.failed':
        case 'transactions.denied':
        case 'transactions.cancelled':
          await this.handleTransactionEvent(event);
          break;

        case 'wallets.created':
        case 'wallets.updated':
          await this.handleWalletEvent(event);
          break;

        default:
          this.logger.warn(
            `Unknown webhook event type: ${event.notificationType}`,
          );
      }

      // Mark as processed
      await this.prisma.circleWebhookLog.update({
        where: { id: webhookLog.id },
        data: { processed: true, processedAt: new Date() },
      });

      this.logger.log(`Webhook processed: ${event.notificationId}`);
    } catch (error) {
      // Log error but don't fail
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.prisma.circleWebhookLog.update({
        where: { id: webhookLog.id },
        data: {
          error: errorMessage,
          retryCount: { increment: 1 },
          lastRetryAt: new Date(),
        },
      });

      this.logger.error(`Webhook processing failed: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Handle transaction webhook events
   */
  private async handleTransactionEvent(
    event: CircleWebhookEvent,
  ): Promise<void> {
    const { notification, notificationType } = event;
    const transactionId = notification.id;
    const state = notification.state;

    // Map Circle state to our enum
    const stateMap: Record<string, CircleTransactionState> = {
      INITIATED: CircleTransactionState.INITIATED,
      QUEUED: CircleTransactionState.QUEUED,
      SENT: CircleTransactionState.SENT,
      CONFIRMED: CircleTransactionState.CONFIRMED,
      COMPLETE: CircleTransactionState.COMPLETE,
      FAILED: CircleTransactionState.FAILED,
      CANCELLED: CircleTransactionState.CANCELLED,
      DENIED: CircleTransactionState.DENIED,
      STUCK: CircleTransactionState.STUCK,
      CLEARED: CircleTransactionState.CLEARED,
    };

    const mappedState = state ? stateMap[state] : undefined;

    // Update transaction in database
    const updated = await this.prisma.circleTransaction.updateMany({
      where: { circleTransactionId: transactionId },
      data: {
        ...(mappedState && { state: mappedState }),
        ...(notification.txHash && { transactionHash: notification.txHash }),
        ...(notificationType === 'transactions.complete' && {
          completedDate: new Date(),
        }),
        ...(notificationType === 'transactions.cancelled' && {
          cancelledDate: new Date(),
        }),
      },
    });

    if (updated.count > 0) {
      this.logger.log(
        `Transaction ${transactionId} updated: ${notificationType} -> ${state}`,
      );

      // Check if this is part of a CCTP transfer
      await this.checkCCTPProgress(transactionId, notificationType);

      // Sync full transaction details
      await this.transactionService.syncTransaction(transactionId);
    } else {
      this.logger.warn(`Transaction not found in database: ${transactionId}`);
    }
  }

  /**
   * Handle wallet webhook events
   */
  private async handleWalletEvent(event: CircleWebhookEvent): Promise<void> {
    const { notification, notificationType } = event;
    const walletId = notification.id;

    if (notificationType === 'wallets.created') {
      // A new wallet was created - should already be in our database
      this.logger.log(`Wallet created event received: ${walletId}`);
    } else if (notificationType === 'wallets.updated') {
      // Wallet state changed
      const stateMap: Record<string, CircleWalletState> = {
        LIVE: CircleWalletState.LIVE,
        FROZEN: CircleWalletState.FROZEN,
      };

      const state = notification.state as string;
      const mappedState = state ? stateMap[state] : undefined;

      if (mappedState) {
        await this.prisma.circleWallet.updateMany({
          where: { circleWalletId: walletId },
          data: { state: mappedState },
        });
        this.logger.log(`Wallet ${walletId} state updated: ${state}`);
      }
    }
  }

  /**
   * Check if transaction is part of CCTP transfer and update accordingly
   */
  private async checkCCTPProgress(
    transactionId: string,
    eventType: string,
  ): Promise<void> {
    // Check if this transaction is a burn transaction for CCTP
    const cctpTransfer = await this.prisma.circleCCTPTransfer.findFirst({
      where: { burnTransactionId: transactionId },
    });

    if (cctpTransfer) {
      if (
        eventType === 'transactions.complete' ||
        eventType === 'transactions.confirmed'
      ) {
        // Get transaction details to get the tx hash
        const transaction = await this.prisma.circleTransaction.findFirst({
          where: { circleTransactionId: transactionId },
        });

        if (transaction?.transactionHash) {
          await this.cctpService.updateBurnStatus(
            cctpTransfer.id,
            transaction.transactionHash,
          );
        }
      } else if (eventType === 'transactions.failed') {
        await this.cctpService.markTransferFailed(
          cctpTransfer.id,
          'BURN_FAILED',
          'Burn transaction failed',
        );
      }
    }

    // Check if this is a mint transaction for CCTP
    const cctpMintTransfer = await this.prisma.circleCCTPTransfer.findFirst({
      where: { mintTransactionId: transactionId },
    });

    if (cctpMintTransfer) {
      if (
        eventType === 'transactions.complete' ||
        eventType === 'transactions.confirmed'
      ) {
        const transaction = await this.prisma.circleTransaction.findFirst({
          where: { circleTransactionId: transactionId },
        });

        if (transaction?.transactionHash) {
          await this.cctpService.updateMintStatus(
            cctpMintTransfer.id,
            transaction.transactionHash,
            transactionId,
          );
        }
      } else if (eventType === 'transactions.failed') {
        await this.cctpService.markTransferFailed(
          cctpMintTransfer.id,
          'MINT_FAILED',
          'Mint transaction failed',
        );
      }
    }
  }

  /**
   * Create a webhook subscription
   */
  async createSubscription(endpoint: string): Promise<WebhookSubscription> {
    const idempotencyKey = this.apiClient.generateIdempotencyKey();

    const response = await this.apiClient.post<{
      subscription: WebhookSubscription;
    }>('/subscriptions', {
      idempotencyKey,
      endpoint,
    });

    this.logger.log(
      `Webhook subscription created: ${response.data.subscription.id}`,
    );
    return response.data.subscription;
  }

  /**
   * Get all webhook subscriptions
   */
  async getSubscriptions(): Promise<WebhookSubscription[]> {
    const response = await this.apiClient.get<{
      subscriptions: WebhookSubscription[];
    }>('/subscriptions');
    return response.data.subscriptions;
  }

  /**
   * Delete a webhook subscription
   */
  async deleteSubscription(subscriptionId: string): Promise<void> {
    await this.apiClient.delete(`/subscriptions/${subscriptionId}`);
    this.logger.log(`Webhook subscription deleted: ${subscriptionId}`);
  }

  /**
   * Get webhook logs
   */
  async getWebhookLogs(params?: {
    eventType?: string;
    processed?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const { eventType, processed, limit = 50, offset = 0 } = params || {};

    return this.prisma.circleWebhookLog.findMany({
      where: {
        ...(eventType && { eventType }),
        ...(processed !== undefined && { processed }),
      },
      orderBy: { receivedAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Retry failed webhook
   */
  async retryWebhook(webhookLogId: string): Promise<void> {
    const log = await this.prisma.circleWebhookLog.findUnique({
      where: { id: webhookLogId },
    });

    if (!log) {
      throw new Error('Webhook log not found');
    }

    if (log.processed) {
      throw new Error('Webhook already processed');
    }

    // Re-process the webhook
    await this.processWebhook(log.payload as unknown as CircleWebhookEvent);
  }
}
