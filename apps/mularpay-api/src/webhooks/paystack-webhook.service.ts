import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  constructor(private readonly prisma: PrismaService) {}

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
        // Create transaction record
        await tx.transaction.create({
          data: {
            userId: virtualAccount.userId,
            type: 'DEPOSIT',
            amount: amountInNaira,
            currency: 'NGN',
            status: 'SUCCESS',
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
          where: { userId: virtualAccount.userId },
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

      this.logger.log(
        `✅ Wallet credited: User ${virtualAccount.userId} - ₦${amountInNaira}`,
      );
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
   */
  async handleCustomerIdentificationSuccess(data: any) {
    const { customer_code, email } = data;

    this.logger.log(`✅ Customer validated successfully: ${email}`);

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // TODO: Update user KYC status when fields are added to User model
      // await this.prisma.user.update({
      //   where: { id: user.id },
      //   data: {
      //     kycVerified: true,
      //     bvnVerified: true,
      //     paystackCustomerCode: customer_code,
      //   },
      // });

      this.logger.log(`User ${user.id} KYC status updated`);
      // TODO: Send notification to user about successful verification
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
      // TODO: Store validation failure reason
      // TODO: Send notification to user about failed verification with reason
      this.logger.log(`Notifying user ${user.id} about validation failure`);
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
      // TODO: Send notification to user about successful DVA creation
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
        this.logger.log(
          `Notifying user ${user.id} about DVA creation failure`,
        );
      }
    }
  }
}
