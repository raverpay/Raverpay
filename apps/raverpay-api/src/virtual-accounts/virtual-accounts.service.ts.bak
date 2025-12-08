import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PaystackService } from '../payments/paystack.service';
import { PrismaService } from '../prisma/prisma.service';
import { BVNEncryptionService } from '../utils/bvn-encryption.service';
import { RequestVirtualAccountDto } from './dto';

@Injectable()
export class VirtualAccountsService {
  private readonly logger = new Logger(VirtualAccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paystackService: PaystackService,
    private readonly bvnEncryptionService: BVNEncryptionService,
  ) {}

  /**
   * Request virtual account creation (user-initiated with consent)
   * Requires BVN or NIN for customer validation (Nigerian Financial Services requirement)
   *
   * Flow:
   * 1. Validate user doesn't already have a DVA
   * 2. Create/get Paystack customer
   * 3. If BVN provided, validate customer identity (triggers async webhook)
   * 4. Create dedicated virtual account
   * 5. Wait for customeridentification.success webhook to upgrade user to TIER_2
   */
  async requestVirtualAccount(
    userId: string,
    dto: RequestVirtualAccountDto,
  ): Promise<{
    success: boolean;
    message: string;
    data?: {
      accountNumber: string;
      accountName: string;
      bankName: string;
      status: string;
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
          status: 'active',
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

    // Validate that either BVN or NIN is provided for Financial Services compliance
    if (!dto.bvn && !dto.nin && !user.bvnVerified && !user.ninVerified) {
      throw new BadRequestException(
        'BVN or NIN is required for dedicated virtual account creation',
      );
    }

    try {
      // Step 1: Create or get Paystack customer
      let customerCode = user.paystackCustomerCode;

      if (!customerCode) {
        const customer = await this.paystackService.createCustomer(
          user.email,
          dto.first_name || user.firstName,
          dto.last_name || user.lastName,
          dto.phone || user.phone,
        );

        customerCode = customer.customer_code;

        this.logger.log(
          `Paystack customer created for user ${userId}: ${customerCode}`,
        );

        // Store customer code
        await this.prisma.user.update({
          where: { id: userId },
          data: { paystackCustomerCode: customerCode },
        });
      }

      // Step 2: Validate customer identity if BVN is provided
      // This triggers an async webhook: customeridentification.success/failed
      // The webhook handler will automatically upgrade user to TIER_2 on success
      if (dto.bvn && dto.account_number && dto.bank_code) {
        // Encrypt BVN before storing in database
        const encryptedBvn = this.bvnEncryptionService.encrypt(dto.bvn);

        this.logger.log(
          `Initiating BVN validation for user ${userId} (customer: ${customerCode}) - BVN: ${this.bvnEncryptionService.maskForLogging(dto.bvn)}`,
        );

        // Store encrypted BVN in database
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            bvn: encryptedBvn,
            dateOfBirth: dto.date_of_birth
              ? new Date(dto.date_of_birth)
              : user.dateOfBirth,
          },
        });

        // Use plain BVN for Paystack API call (decrypt if user already has encrypted BVN)
        let plainBvn = dto.bvn;
        if (user.bvn && this.bvnEncryptionService.isEncrypted(user.bvn)) {
          try {
            plainBvn = this.bvnEncryptionService.decrypt(user.bvn);
          } catch {
            // If decryption fails, use the new BVN from DTO
            plainBvn = dto.bvn;
          }
        }

        await this.paystackService.validateCustomer(
          customerCode,
          dto.first_name || user.firstName,
          dto.last_name || user.lastName,
          dto.account_number,
          plainBvn,
          dto.bank_code,
        );

        this.logger.log(
          `BVN validation initiated. Will receive webhook with results.`,
        );
      }

      // Step 3: Create dedicated virtual account
      const defaultBank = dto.preferred_bank || 'wema-bank';
      const virtualAccount =
        await this.paystackService.createDedicatedVirtualAccount(
          customerCode,
          defaultBank,
        );

      // Step 4: Save to database
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
        `✅ Virtual account created for user ${userId}: ${virtualAccount.account_number}`,
      );

      return {
        success: true,
        message: dto.bvn
          ? 'Virtual account created. BVN verification in progress - you will be upgraded to TIER_2 once verified.'
          : 'Virtual account created successfully',
        data: {
          accountNumber: virtualAccount.account_number,
          accountName: virtualAccount.account_name,
          bankName: virtualAccount.bank.name,
          status: dto.bvn ? 'pending_verification' : 'active',
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
