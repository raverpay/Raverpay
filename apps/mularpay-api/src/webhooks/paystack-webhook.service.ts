import { Injectable, Logger } from '@nestjs/common';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
import { PrismaService } from '../prisma/prisma.service';
import { BVNEncryptionService } from '../utils/bvn-encryption.service';
import { WalletService } from '../wallet/wallet.service';

/**
 * Paystack Webhook Service
 *
 * Handles webhook events from Paystack for:
 * - charge.success: Payment received via DVA
 * - customeridentification.success/failed: BVN validation status
 * - dedicatedaccount.assign.success/failed: DVA creation status
 */
@Injectable()
export class PaystackWebhookService {
  private readonly logger = new Logger(PaystackWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly notificationDispatcher: NotificationDispatcherService,
    private readonly bvnEncryptionService: BVNEncryptionService,
  ) {}

  /**
   * Handle successful payment via Dedicated Virtual Account
   *
   * Webhook event: charge.success
   * Triggered when a customer transfers money to their DVA
   */
  async handleChargeSuccess(data: any) {
    const { reference, amount, channel, authorization } = data;

    // Only process bank transfer payments to DVAs
    if (channel !== 'dedicated_nuban') {
      this.logger.log(`Skipping non-DVA payment: ${channel}`);
      return;
    }

    const accountNumber = authorization?.receiver_bank_account_number;
    const amountInNaira = amount / 100; // Convert from kobo to naira

    if (!accountNumber) {
      this.logger.error('No account number in charge.success webhook');
      return;
    }

    this.logger.log(
      `Processing DVA payment: ₦${amountInNaira} to ${accountNumber}`,
    );

    // Find virtual account
    const virtualAccount = await this.prisma.virtualAccount.findFirst({
      where: { accountNumber, isActive: true },
      include: { user: true },
    });

    if (!virtualAccount) {
      this.logger.error(`Virtual account not found: ${accountNumber}`);
      return;
    }

    // Check if transaction already processed
    const existing = await this.prisma.transaction.findUnique({
      where: { reference },
    });

    if (existing) {
      this.logger.warn(`Transaction already processed: ${reference}`);
      return;
    }

    try {
      // Credit user's wallet using a transaction
      await this.prisma.$transaction(async (tx) => {
        // Get current wallet balance
        const wallet = await tx.wallet.findFirst({
          where: {
            userId: virtualAccount.userId,
            type: 'NAIRA',
          },
        });

        if (!wallet) {
          throw new Error(`Wallet not found for user ${virtualAccount.userId}`);
        }

        const balanceBefore = Number(wallet.balance);
        const fee = 0; // No fee for deposits
        const totalAmount = amountInNaira + fee;
        const balanceAfter = balanceBefore + amountInNaira;

        // Create transaction record
        await tx.transaction.create({
          data: {
            userId: virtualAccount.userId,
            type: 'DEPOSIT',
            amount: amountInNaira,
            fee,
            totalAmount,
            balanceBefore,
            balanceAfter,
            currency: 'NGN',
            status: 'COMPLETED',
            reference,
            description: 'Wallet funding via bank transfer',
            channel: 'BANK_TRANSFER',
            provider: 'paystack',
            metadata: {
              accountNumber,
              senderName: authorization?.sender_name,
              senderBank: authorization?.sender_bank,
              senderAccountNumber: authorization?.sender_bank_account_number,
            },
          },
        });

        // Update wallet balance
        await tx.wallet.update({
          where: {
            userId_type: {
              userId: virtualAccount.userId,
              type: 'NAIRA'
            }
          },
          data: {
            balance: {
              increment: amountInNaira,
            },
            ledgerBalance: {
              increment: amountInNaira,
            },
          },
        });
      });

      // Invalidate wallet and transaction caches
      await this.walletService.invalidateWalletCache(virtualAccount.userId);
      await this.walletService.invalidateTransactionCache(
        virtualAccount.userId,
      );

      this.logger.log(
        `✅ Wallet credited: User ${virtualAccount.userId} - ₦${amountInNaira}`,
      );

      // Send transaction notification
      try {
        await this.notificationDispatcher.sendNotification({
          userId: virtualAccount.userId,
          eventType: 'deposit_success',
          category: 'TRANSACTION',
          channels: ['EMAIL', 'SMS', 'IN_APP'],
          title: 'Wallet Funded Successfully',
          message: `Your wallet has been credited with ₦${amountInNaira.toLocaleString()} via bank transfer.`,
          data: {
            amount: amountInNaira,
            reference,
            channel: 'BANK_TRANSFER',
            accountNumber,
          },
        });
        this.logger.log(
          `📬 Deposit notification sent for user ${virtualAccount.userId}`,
        );
      } catch (notifError) {
        this.logger.error(
          `Failed to send deposit notification to user ${virtualAccount.userId}`,
          notifError,
        );
        // Don't fail the webhook if notification fails
      }
    } catch (error) {
      this.logger.error(
        `Failed to credit wallet for transaction ${reference}`,
        error,
      );
      // TODO: Send notification to admin for manual review
    }
  }

  /**
   * Handle successful customer identification/validation
   *
   * Webhook event: customeridentification.success
   * Triggered when BVN validation succeeds
   *
   * This webhook is sent when Paystack validates a customer's BVN during DVA creation.
   * We automatically upgrade the user to TIER_2 since their BVN has been verified.
   */
  async handleCustomerIdentificationSuccess(data: any) {
    const { customer_code, email, identification } = data;

    this.logger.log(`✅ Customer validated successfully: ${email}`);

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      this.logger.warn(`User not found for email: ${email}`);
      return;
    }

    // Check if user already has BVN verified
    if (user.bvnVerified) {
      this.logger.log(`User ${user.id} already has verified BVN`);
      return;
    }

    try {
      // Extract BVN from identification data
      const bvn = identification?.bvn;

      // Encrypt BVN if provided from webhook, otherwise keep existing encrypted BVN
      let encryptedBvn = user.bvn;
      if (bvn) {
        encryptedBvn = this.bvnEncryptionService.encrypt(bvn);
        this.logger.log(
          `BVN received from webhook for user ${user.id} - BVN: ${this.bvnEncryptionService.maskForLogging(bvn)}`,
        );
      }

      // Update user with encrypted BVN and upgrade to TIER_2
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          bvnVerified: true,
          bvn: encryptedBvn, // Store encrypted BVN
          kycTier: 'TIER_2', // Auto-upgrade to TIER_2
          paystackCustomerCode: customer_code,
          status:
            user.emailVerified && user.phoneVerified ? 'ACTIVE' : user.status,
        },
      });

      // Create audit log for KYC upgrade
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'BVN_VERIFIED_VIA_DVA',
          resource: 'USER',
          resourceId: user.id,
          ipAddress: '0.0.0.0',
          userAgent: 'Paystack Webhook',
          metadata: {
            kycTier: 'TIER_2',
            previousTier: user.kycTier,
            paystackCustomerCode: customer_code,
            verificationMethod: 'DVA_BVN_VALIDATION',
          },
        },
      });

      this.logger.log(
        `✅ User ${user.id} upgraded to TIER_2 via DVA BVN verification (${user.kycTier} -> TIER_2)`,
      );

      // Send multi-channel notification about successful verification and tier upgrade
      try {
        await this.notificationDispatcher.sendNotification({
          userId: user.id,
          eventType: 'bvn_verified',
          category: 'KYC',
          channels: ['EMAIL', 'SMS', 'IN_APP'],
          title: 'BVN Verification Successful',
          message: `Your BVN has been verified! Your account has been upgraded to TIER_2 with increased transaction limits.`,
          data: {
            previousTier: user.kycTier,
            newTier: 'TIER_2',
            verificationMethod: 'DVA_BVN_VALIDATION',
          },
        });
        this.logger.log(
          `📬 Notification sent for BVN verification: ${user.id}`,
        );
      } catch (notifError) {
        this.logger.error(
          `Failed to send BVN verification notification to user ${user.id}`,
          notifError,
        );
        // Don't fail the webhook if notification fails
      }
    } catch (error) {
      this.logger.error(
        `Failed to upgrade user ${user.id} after BVN verification`,
        error,
      );
    }
  }

  /**
   * Handle failed customer identification/validation
   *
   * Webhook event: customeridentification.failed
   * Triggered when BVN validation fails
   */
  async handleCustomerIdentificationFailed(data: any) {
    const { email, reason } = data;

    this.logger.error(`❌ Customer validation failed: ${email} - ${reason}`);

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // Send notification to user about failed verification
      try {
        await this.notificationDispatcher.sendNotification({
          userId: user.id,
          eventType: 'bvn_verification_failed',
          category: 'KYC',
          channels: ['EMAIL', 'SMS', 'IN_APP'],
          title: 'BVN Verification Failed',
          message: `We couldn't verify your BVN. ${reason || 'Please check your details and try again.'}`,
          data: {
            reason: reason || 'Unknown error',
          },
        });
        this.logger.log(`📬 BVN failure notification sent to user ${user.id}`);
      } catch (notifError) {
        this.logger.error(
          `Failed to send BVN failure notification to user ${user.id}`,
          notifError,
        );
      }
    }
  }

  /**
   * Handle successful DVA assignment
   *
   * Webhook event: dedicatedaccount.assign.success
   * Triggered when DVA is successfully created and assigned
   */
  async handleDedicatedAccountAssignSuccess(data: any) {
    const { customer, account_number, account_name, bank } = data;

    this.logger.log(
      `✅ DVA assigned successfully: ${account_number} to ${customer?.email}`,
    );

    // Update virtual account status if it exists
    const updated = await this.prisma.virtualAccount.updateMany({
      where: { accountNumber: account_number },
      data: {
        isActive: true,
        accountName: account_name || undefined,
      },
    });

    if (updated.count > 0) {
      this.logger.log(`Virtual account ${account_number} status updated`);

      // Find the user to send notification
      const virtualAccount = await this.prisma.virtualAccount.findFirst({
        where: { accountNumber: account_number },
      });

      if (virtualAccount) {
        try {
          await this.notificationDispatcher.sendNotification({
            userId: virtualAccount.userId,
            eventType: 'dva_created',
            category: 'ACCOUNT',
            channels: ['EMAIL', 'SMS', 'IN_APP'],
            title: 'Virtual Account Ready',
            message: `Your dedicated virtual account has been created successfully. Account: ${account_number} (${bank?.name || 'Bank'})`,
            data: {
              accountNumber: account_number,
              accountName: account_name,
              bankName: bank?.name,
            },
          });
          this.logger.log(
            `📬 DVA creation notification sent for user ${virtualAccount.userId}`,
          );
        } catch (notifError) {
          this.logger.error(
            `Failed to send DVA creation notification to user ${virtualAccount.userId}`,
            notifError,
          );
        }
      }
    }
  }

  /**
   * Handle failed DVA assignment
   *
   * Webhook event: dedicatedaccount.assign.failed
   * Triggered when DVA creation/assignment fails
   */
  async handleDedicatedAccountAssignFailed(data: any) {
    const { customer, reason } = data;

    this.logger.error(
      `❌ DVA assignment failed: ${customer?.email} - ${reason}`,
    );

    // Find user by email
    if (customer?.email) {
      const user = await this.prisma.user.findUnique({
        where: { email: customer.email },
      });

      if (user) {
        // TODO: Send notification to user about failed DVA creation
        this.logger.log(`Notifying user ${user.id} about DVA creation failure`);
      }
    }
  }
}
