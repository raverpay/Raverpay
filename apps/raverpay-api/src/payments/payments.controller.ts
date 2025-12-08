import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { PaystackService } from './paystack.service';
import { TransactionsService } from '../transactions/transactions.service';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';

interface PaystackWebhookPayload {
  event: string;
  data: {
    reference: string;
    amount: number;
    status: string;
    channel?: string; // e.g., "dedicated_nuban", "card"
    paid_at?: string;
    fees?: number;
    customer?: {
      email: string;
      customer_code: string;
    };
    authorization?: {
      channel?: string;
      receiver_bank_account_number?: string;
      sender_bank?: string;
      sender_name?: string;
      [key: string]: any;
    };
    metadata?: {
      receiver_account_number?: string;
      receiver_bank?: string;
      [key: string]: any;
    };
    dedicated_account?: {
      account_number: string;
      account_name: string;
      bank: {
        name: string;
        slug: string;
      };
    };
  };
}

@Controller('payments/webhooks')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paystackService: PaystackService,
    private readonly transactionsService: TransactionsService,
    private readonly notificationDispatcher: NotificationDispatcherService,
  ) {}

  /**
   * Paystack webhook handler
   * POST /api/payments/webhooks/paystack
   */
  @Post('paystack')
  async handlePaystackWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: PaystackWebhookPayload,
  ) {
    try {
      // Get raw body for signature verification
      const rawBody = req.rawBody?.toString('utf8') || JSON.stringify(payload);

      // Verify signature
      if (!signature) {
        this.logger.warn('Webhook received without signature');
        throw new BadRequestException('Missing signature');
      }

      const isValid = this.paystackService.verifyWebhookSignature(
        signature,
        rawBody,
      );

      if (!isValid) {
        this.logger.warn('Invalid webhook signature');
        throw new BadRequestException('Invalid signature');
      }

      this.logger.log(`Webhook event received: ${payload.event}`);

      // Handle different webhook events
      switch (payload.event) {
        case 'charge.success':
          await this.handleChargeSuccess(payload);
          break;

        case 'transfer.success':
          await this.handleTransferSuccess(payload);
          break;

        case 'transfer.failed':
          await this.handleTransferFailed(payload);
          break;

        case 'transfer.reversed':
          await this.handleTransferReversed(payload);
          break;

        case 'dedicatedaccount.assign.success':
          this.logger.log('Virtual account assigned successfully');
          break;

        default:
          this.logger.log(`Unhandled event: ${payload.event}`);
      }

      return { status: 'success' };
    } catch (error) {
      this.logger.error('Webhook processing failed', error);
      throw error;
    }
  }

  /**
   * Handle successful charge (card payment or bank transfer)
   */
  private async handleChargeSuccess(payload: PaystackWebhookPayload) {
    const { reference, amount, status } = payload.data;

    // DEBUG: Log full payload to understand structure
    this.logger.log(
      `🔍 Charge payload: ${JSON.stringify(payload.data, null, 2)}`,
    );

    if (status !== 'success') {
      this.logger.warn(`Charge not successful: ${reference} - ${status}`);
      return;
    }

    // Amount is in kobo, convert to naira
    const amountInNaira = amount / 100;
    const paystackFeeInNaira = (payload.data.fees || 0) / 100; // Paystack DVA fee

    try {
      // Check if it's a virtual account payment
      // Paystack sends virtual account info in different ways depending on API version
      const isVirtualAccountPayment =
        payload.data.channel === 'dedicated_nuban' ||
        payload.data.dedicated_account ||
        (payload.data.metadata &&
          payload.data.metadata['receiver_account_number']);

      if (isVirtualAccountPayment) {
        // Get account number from different possible locations
        let accountNumber: string | undefined;

        if (payload.data.dedicated_account) {
          accountNumber = payload.data.dedicated_account.account_number;
        } else if (
          payload.data.metadata &&
          payload.data.metadata['receiver_account_number']
        ) {
          accountNumber = payload.data.metadata['receiver_account_number'];
        } else if (
          payload.data.authorization?.['receiver_bank_account_number']
        ) {
          accountNumber =
            payload.data.authorization['receiver_bank_account_number'];
        }

        if (!accountNumber) {
          this.logger.error(
            `Virtual account payment but no account number found in payload`,
          );
          throw new BadRequestException(
            'Account number not found in webhook payload',
          );
        }

        this.logger.log(
          `💰 Processing virtual account deposit: ₦${amountInNaira} (Fee: ₦${paystackFeeInNaira}) to account ${accountNumber}`,
        );

        await this.transactionsService.processVirtualAccountCredit(
          reference,
          amountInNaira,
          accountNumber,
          paystackFeeInNaira,
        );
        this.logger.log(`✅ Virtual account credited: ${reference}`);

        // Get transaction to retrieve userId
        const transaction = await this.transactionsService[
          'prisma'
        ].transaction.findUnique({
          where: { reference },
        });

        if (transaction) {
          // Send multi-channel notification for wallet funding
          try {
            const netAmount = amountInNaira - paystackFeeInNaira;
            await this.notificationDispatcher.sendNotification({
              userId: transaction.userId,
              eventType: 'deposit_success',
              category: 'TRANSACTION',
              channels: ['EMAIL', 'SMS', 'IN_APP'],
              title: 'Wallet Funded Successfully',
              message: `Your wallet has been credited with ₦${netAmount.toLocaleString()} via bank transfer${paystackFeeInNaira > 0 ? ` (₦${paystackFeeInNaira.toFixed(2)} transaction fee deducted)` : ''}.`,
              data: {
                transactionId: transaction.id,
                amount: netAmount,
                grossAmount: amountInNaira,
                fee: paystackFeeInNaira,
                reference,
                channel: 'BANK_TRANSFER',
              },
            });
            this.logger.log(
              `📬 Deposit notification sent for user ${transaction.userId}`,
            );
          } catch (notifError) {
            this.logger.error(
              `Failed to send deposit notification to user ${transaction.userId}`,
              notifError,
            );
            // Don't fail the webhook if notification fails
          }
        }
      } else {
        // Regular card payment - will be verified by user calling /verify endpoint
        this.logger.log(`Card payment successful: ${reference}`);

        // Still send notification for card payments
        const transaction = await this.transactionsService[
          'prisma'
        ].transaction.findUnique({
          where: { reference },
        });

        if (transaction) {
          try {
            await this.notificationDispatcher.sendNotification({
              userId: transaction.userId,
              eventType: 'deposit_success',
              category: 'TRANSACTION',
              channels: ['EMAIL', 'SMS', 'IN_APP'],
              title: 'Wallet Funded Successfully',
              message: `Your wallet has been credited with ₦${amountInNaira.toLocaleString()} via card payment.`,
              data: {
                transactionId: transaction.id,
                amount: amountInNaira,
                reference,
                channel: 'CARD',
              },
            });
            this.logger.log(
              `📬 Card deposit notification sent for user ${transaction.userId}`,
            );
          } catch (notifError) {
            this.logger.error(
              `Failed to send card deposit notification to user ${transaction.userId}`,
              notifError,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process charge: ${reference}`, error);
      throw error;
    }
  }

  /**
   * Handle successful transfer (withdrawal completed)
   */
  private async handleTransferSuccess(payload: PaystackWebhookPayload) {
    const { reference } = payload.data;

    try {
      // Get transaction with metadata to extract bank account details
      const transaction = await this.transactionsService[
        'prisma'
      ].transaction.findUnique({
        where: { reference },
        include: { user: true },
      });

      if (!transaction) {
        this.logger.error(`Transaction not found: ${reference}`);
        return;
      }

      // Update transaction status to COMPLETED
      await this.transactionsService['prisma'].transaction.update({
        where: { reference },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          providerStatus: 'success',
        },
      });

      this.logger.log(`Transfer completed: ${reference}`);

      // Extract bank account details from transaction metadata
      const metadata = transaction.metadata as {
        accountNumber?: string;
        accountName?: string;
        bankCode?: string;
        bankName?: string;
      } | null;

      if (
        metadata?.accountNumber &&
        metadata?.accountName &&
        metadata?.bankCode
      ) {
        // Save bank account for future use
        await this.transactionsService.upsertBankAccount(
          transaction.userId,
          metadata.bankCode,
          metadata.accountNumber,
          metadata.accountName,
        );
      }

      // Send notification for successful withdrawal
      try {
        const amount = Number(transaction.amount);
        await this.notificationDispatcher.sendNotification({
          userId: transaction.userId,
          eventType: 'withdrawal_success',
          category: 'TRANSACTION',
          channels: ['EMAIL', 'SMS', 'IN_APP', 'PUSH'],
          title: 'Withdrawal Successful',
          message: `Your withdrawal of ₦${amount.toLocaleString()} has been successfully sent to ${metadata?.accountName || 'your bank account'}.`,
          data: {
            transactionId: transaction.id,
            amount,
            fee: Number(transaction.fee),
            totalDebit: Number(transaction.totalAmount),
            reference: transaction.reference,
            accountNumber: metadata?.accountNumber,
            accountName: metadata?.accountName,
            bankCode: metadata?.bankCode,
            bankName: metadata?.bankName,
            status: 'COMPLETED',
          },
        });
        this.logger.log(
          `📬 Withdrawal success notification sent for user ${transaction.userId}`,
        );
      } catch (notifError) {
        this.logger.error(
          `Failed to send withdrawal success notification to user ${transaction.userId}`,
          notifError,
        );
        // Don't fail the webhook if notification fails
      }
    } catch (error) {
      this.logger.error(`Failed to update transfer: ${reference}`, error);
    }
  }

  /**
   * Handle failed transfer (withdrawal failed)
   */
  private async handleTransferFailed(payload: PaystackWebhookPayload) {
    const { reference } = payload.data;

    try {
      // Get transaction
      const transaction = await this.transactionsService[
        'prisma'
      ].transaction.findUnique({
        where: { reference },
        include: {
          user: { include: { wallets: { where: { type: 'NAIRA' } } } },
        },
      });

      const wallet = transaction?.user?.wallets?.[0];
      if (!transaction || !wallet) {
        this.logger.error(`Transaction or wallet not found: ${reference}`);
        return;
      }

      // Refund amount to wallet and mark transaction as failed
      const refundAmount = transaction.totalAmount;

      await this.transactionsService['prisma'].$transaction([
        // Refund wallet
        this.transactionsService['prisma'].wallet.update({
          where: { id: wallet.id },
          data: {
            balance: wallet.balance.plus(refundAmount),
            ledgerBalance: wallet.ledgerBalance.plus(refundAmount),
          },
        }),
        // Update transaction
        this.transactionsService['prisma'].transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            providerStatus: 'failed',
            metadata: {
              ...(transaction.metadata as object),
              refunded: true,
            },
          },
        }),
      ]);

      this.logger.log(`Transfer failed and refunded: ${reference}`);

      // Extract bank account details from transaction metadata
      const metadata = transaction.metadata as {
        accountNumber?: string;
        accountName?: string;
        bankCode?: string;
        bankName?: string;
      } | null;

      // Send notification for failed withdrawal
      try {
        const amount = Number(transaction.amount);
        await this.notificationDispatcher.sendNotification({
          userId: transaction.userId,
          eventType: 'withdrawal_failed',
          category: 'TRANSACTION',
          channels: ['EMAIL', 'SMS', 'IN_APP', 'PUSH'],
          title: 'Withdrawal Failed',
          message: `Your withdrawal of ₦${amount.toLocaleString()} failed. The amount has been refunded to your wallet.`,
          data: {
            transactionId: transaction.id,
            amount,
            fee: Number(transaction.fee),
            totalDebit: Number(transaction.totalAmount),
            reference: transaction.reference,
            accountNumber: metadata?.accountNumber,
            accountName: metadata?.accountName,
            bankCode: metadata?.bankCode,
            bankName: metadata?.bankName,
            status: 'FAILED',
            refunded: true,
          },
        });
        this.logger.log(
          `📬 Withdrawal failure notification sent for user ${transaction.userId}`,
        );
      } catch (notifError) {
        this.logger.error(
          `Failed to send withdrawal failure notification to user ${transaction.userId}`,
          notifError,
        );
        // Don't fail the webhook if notification fails
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle transfer failure: ${reference}`,
        error,
      );
    }
  }

  /**
   * Handle reversed transfer
   */
  private async handleTransferReversed(payload: PaystackWebhookPayload) {
    // Same as failed transfer
    await this.handleTransferFailed(payload);
  }
}
