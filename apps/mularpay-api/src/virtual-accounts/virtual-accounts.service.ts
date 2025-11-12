import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from '../payments/paystack.service';

@Injectable()
export class VirtualAccountsService {
  private readonly logger = new Logger(VirtualAccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paystackService: PaystackService,
  ) {}

  /**
   * Request virtual account creation (user-initiated with consent)
   * Requires user to have completed KYC verification for Financial Services
   */
  async requestVirtualAccount(
    userId: string,
    preferredBank?: string,
  ): Promise<{
    success: boolean;
    message: string;
    data?: {
      accountNumber: string;
      accountName: string;
      bankName: string;
    };
  }> {
    // Check if user already has a virtual account
    const existing = await this.prisma.virtualAccount.findFirst({
      where: { userId, isActive: true },
    });

    if (existing) {
      return {
        success: false,
        message: 'You already have an active virtual account',
        data: {
          accountNumber: existing.accountNumber,
          accountName: existing.accountName,
          bankName: existing.bankName,
        },
      };
    }

    // Get user details
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // TODO: Check if user has completed KYC verification
    // For Nigerian Financial Services, BVN validation is required
    // Uncomment when KYC fields are added to User model
    // if (!user.kycVerified || !user.bvnVerified) {
    //   throw new BadRequestException(
    //     'Please complete KYC and BVN verification before requesting a virtual account'
    //   );
    // }

    try {
      // Step 1: Create or get Paystack customer
      const customer = await this.paystackService.createCustomer(
        user.email,
        user.firstName,
        user.lastName,
        user.phone,
      );

      this.logger.log(
        `Paystack customer created for user ${userId}: ${customer.customer_code}`,
      );

      // TODO: Store customer code when field is added to User model
      // await this.prisma.user.update({
      //   where: { id: userId },
      //   data: { paystackCustomerCode: customer.customer_code },
      // });

      // Step 2: Create dedicated virtual account
      const defaultBank = preferredBank || 'wema-bank';
      const virtualAccount =
        await this.paystackService.createDedicatedVirtualAccount(
          customer.customer_code,
          defaultBank,
        );

      // Step 3: Save to database
      await this.prisma.virtualAccount.create({
        data: {
          userId: user.id,
          accountNumber: virtualAccount.account_number,
          accountName: virtualAccount.account_name,
          bankName: virtualAccount.bank.name,
          bankCode: virtualAccount.bank.slug,
          provider: 'paystack',
          providerRef: virtualAccount.id.toString(),
          isActive: virtualAccount.active,
        },
      });

      this.logger.log(
        `Virtual account created for user ${userId}: ${virtualAccount.account_number}`,
      );

      return {
        success: true,
        message: 'Virtual account created successfully',
        data: {
          accountNumber: virtualAccount.account_number,
          accountName: virtualAccount.account_name,
          bankName: virtualAccount.bank.name,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to create virtual account for user ${userId}`,
        error,
      );
      throw new BadRequestException(
        'Failed to create virtual account. Please try again.',
      );
    }
  }

  /**
   * Get virtual account for a user
   */
  async getVirtualAccount(userId: string) {
    return this.prisma.virtualAccount.findFirst({
      where: { userId, isActive: true },
    });
  }

  /**
   * Get list of available bank providers for DVA
   */
  async getAvailableProviders() {
    return this.paystackService.getDedicatedAccountProviders();
  }

  /**
   * Requery virtual account for pending transactions
   * Rate limit: Once every 10 minutes per account
   */
  async requeryVirtualAccount(userId: string) {
    const virtualAccount = await this.getVirtualAccount(userId);

    if (!virtualAccount) {
      throw new BadRequestException('No virtual account found');
    }

    await this.paystackService.requeryDedicatedAccount(
      virtualAccount.accountNumber,
      virtualAccount.bankCode,
    );

    return {
      success: true,
      message:
        'Checking for pending transactions. You will be notified if any are found.',
    };
  }
}
