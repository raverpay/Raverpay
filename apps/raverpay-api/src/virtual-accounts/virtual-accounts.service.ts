import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PaystackService } from '../payments/paystack.service';
import { PrismaService } from '../prisma/prisma.service';
import { BVNEncryptionService } from '../utils/bvn-encryption.service';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
import { RequestVirtualAccountDto } from './dto';

@Injectable()
export class VirtualAccountsService {
  private readonly logger = new Logger(VirtualAccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paystackService: PaystackService,
    private readonly bvnEncryptionService: BVNEncryptionService,
    private readonly notificationDispatcher: NotificationDispatcherService,
  ) {}

  /**
   * Request virtual account creation (user-initiated with consent)
   * Requires BVN or NIN for customer validation (Nigerian Financial Services requirement)
   *
   * Flow:
   * 1. Validate user doesn't already have a DVA
   * 2. Create/get Paystack customer (ensure phone number is present and formatted)
   * 3. If BVN provided, validate customer identity (triggers async webhook)
   * 4. Create dedicated virtual account (with retry mechanism)
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
          status: existing.creationStatus || 'active',
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

    // Ensure phone number is available
    const phoneNumber = dto.phone || user.phone;
    if (!phoneNumber) {
      throw new BadRequestException(
        'Phone number is required for virtual account creation',
      );
    }

    const MAX_RETRIES = 2; // Define outside try-catch for use in catch block

    try {
      // Step 1: Create or get Paystack customer, ensure phone number is present
      let customerCode = user.paystackCustomerCode;

      if (!customerCode) {
        const customer = await this.paystackService.createCustomer(
          user.email,
          dto.first_name || user.firstName,
          dto.last_name || user.lastName,
          phoneNumber,
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
      } else {
        // Customer exists - ensure phone number is updated if needed
        // Paystack requires phone number for DVA creation
        try {
          await this.paystackService.updateCustomer(customerCode, {
            phone: phoneNumber,
            firstName: dto.first_name || user.firstName,
            lastName: dto.last_name || user.lastName,
          });
          this.logger.log(
            `Updated Paystack customer ${customerCode} with phone number`,
          );
        } catch (updateError) {
          // Log but don't fail - phone might already be set correctly
          this.logger.warn(
            `Failed to update customer ${customerCode} phone number`,
            updateError,
          );
        }
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

        try {
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
        } catch (validationError: unknown) {
          // Handle "Customer already validated" error gracefully
          const validationErrorObj = validationError as {
            response?: { message?: string };
            message?: string;
          };
          const errorMsg =
            validationErrorObj?.response?.message ||
            validationErrorObj?.message ||
            '';

          if (errorMsg.includes('already validated')) {
            this.logger.log(
              `Customer ${customerCode} already validated, skipping validation step`,
            );
          } else {
            throw validationError;
          }
        }
      }

      // Step 3: Create dedicated virtual account with retry mechanism
      const defaultBank = dto.preferred_bank || 'wema-bank';
      let lastError: Error | unknown;
      let virtualAccount: any;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          virtualAccount =
            await this.paystackService.createDedicatedVirtualAccount(
              customerCode,
              defaultBank,
            );
          break; // Success, exit retry loop
        } catch (error: unknown) {
          lastError = error;
          const errorObj = error as {
            status?: number;
            response?: { statusCode?: number };
            message?: string;
          };
          const isRetryable =
            (errorObj?.status && errorObj.status >= 500) ||
            (errorObj?.response?.statusCode &&
              errorObj.response.statusCode >= 500) ||
            (errorObj?.message &&
              (errorObj.message.includes('timeout') ||
                errorObj.message.includes('network')));

          if (attempt < MAX_RETRIES && isRetryable) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s
            this.logger.warn(
              `DVA creation attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
              error,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          } else {
            // Non-retryable error or max retries reached
            throw error;
          }
        }
      }

      if (!virtualAccount) {
        throw lastError || new Error('Failed to create virtual account');
      }

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
          creationStatus: dto.bvn ? 'PENDING' : 'ACTIVE',
          retryCount: 0,
        },
      });

      this.logger.log(
        `✅ Virtual account created for user ${userId}: ${virtualAccount.account_number}`,
      );

      // Send notification for successful DVA creation
      try {
        await this.notificationDispatcher.sendNotification({
          userId: user.id,
          eventType: 'virtual_account_created',
          category: 'ACCOUNT',
          title: 'Virtual Account Created Successfully',
          message: dto.bvn
            ? `Your virtual account has been created. Account Number: ${virtualAccount.account_number}. BVN verification is in progress - you will be upgraded to TIER_2 once verified.`
            : `Your virtual account has been created successfully. Account Number: ${virtualAccount.account_number}, Bank: ${virtualAccount.bank.name}.`,
          channels: ['EMAIL', 'IN_APP', 'PUSH'],
          data: {
            accountNumber: virtualAccount.account_number,
            accountName: virtualAccount.account_name,
            bankName: virtualAccount.bank.name,
            status: dto.bvn ? 'PROCESSING' : 'ACTIVE',
          },
        });
      } catch (notifError) {
        // Log but don't fail the request if notification fails
        this.logger.warn(
          `Failed to send DVA creation notification for user ${userId}`,
          notifError,
        );
      }

      return {
        success: true,
        message: dto.bvn
          ? 'Virtual account created. BVN verification in progress - you will be notified when your account is ready.'
          : 'Virtual account created successfully',
        data: {
          accountNumber: virtualAccount.account_number,
          accountName: virtualAccount.account_name,
          bankName: virtualAccount.bank.name,
          status: dto.bvn ? 'PROCESSING' : 'ACTIVE',
        },
      };
    } catch (error: unknown) {
      const errorObj = error as {
        response?: { message?: string };
        message?: string;
        status?: number;
      };
      const errorMessage =
        errorObj?.response?.message ||
        errorObj?.message ||
        'Failed to create virtual account';

      this.logger.error(
        `Failed to create virtual account for user ${userId}`,
        error,
      );

      // Determine if error is retryable
      const isRetryable =
        (errorObj?.status && errorObj.status >= 500) ||
        (errorObj?.response &&
          typeof errorObj.response === 'object' &&
          'statusCode' in errorObj.response &&
          (errorObj.response as { statusCode?: number }).statusCode &&
          (errorObj.response as { statusCode: number }).statusCode >= 500) ||
        (errorMessage &&
          (errorMessage.includes('timeout') ||
            errorMessage.includes('network')));

      // Create a failed account record for admin manual creation
      try {
        await this.prisma.virtualAccount.create({
          data: {
            userId: user.id,
            accountNumber: `FAILED_${Date.now()}`, // Temporary placeholder
            accountName: `${user.firstName} ${user.lastName}`,
            bankName: 'Unknown',
            bankCode: dto.preferred_bank || 'wema-bank',
            provider: 'paystack',
            isActive: false,
            creationStatus: 'FAILED',
            retryCount: MAX_RETRIES,
            failureReason: errorMessage,
          },
        });
      } catch (dbError) {
        // Ignore DB errors when creating failed record
        this.logger.warn('Failed to create failed account record', dbError);
      }

      // Send notification for failed DVA creation (only for non-retryable errors)
      if (!isRetryable) {
        try {
          await this.notificationDispatcher.sendNotification({
            userId: user.id,
            eventType: 'virtual_account_creation_failed',
            category: 'ACCOUNT',
            title: 'Virtual Account Creation Failed',
            message:
              'We encountered an issue creating your virtual account. Our team has been notified and will create it manually. You will be notified when your account is ready.',
            channels: ['EMAIL', 'IN_APP', 'PUSH'],
            data: {
              failureReason: errorMessage,
              retryCount: MAX_RETRIES,
            },
          });
        } catch (notifError) {
          // Log but don't fail the request if notification fails
          this.logger.warn(
            `Failed to send DVA creation failure notification for user ${userId}`,
            notifError,
          );
        }
      }

      throw new BadRequestException(
        isRetryable
          ? 'Virtual account creation is temporarily unavailable. Please try again in a few minutes.'
          : 'Failed to create virtual account. Our team has been notified and will create it manually. You will be notified when ready.',
      );
    }
  }

  /**
   * Get virtual account for a user
   */
  async getVirtualAccount(userId: string) {
    const account = await this.prisma.virtualAccount.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!account) {
      return null;
    }

    // Return account with status
    return {
      ...account,
      status:
        account.creationStatus || (account.isActive ? 'ACTIVE' : 'INACTIVE'),
    };
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
