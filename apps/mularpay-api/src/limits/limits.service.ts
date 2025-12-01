import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KYCTier } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export enum TransactionLimitType {
  AIRTIME = 'AIRTIME',
  DATA = 'DATA',
  BILL_PAYMENT = 'BILL_PAYMENT',
  TRANSFER = 'TRANSFER',
  WITHDRAWAL = 'WITHDRAWAL',
  P2P_TRANSFER = 'P2P_TRANSFER',
}

interface DailyLimitInfo {
  limit: number;
  spent: number;
  remaining: number;
  transactionCount: number;
  canProceed: boolean;
}

@Injectable()
export class LimitsService {
  private readonly logger = new Logger(LimitsService.name);

  // Daily limits by KYC tier (in Naira)
  private readonly TIER_LIMITS: Record<KYCTier, number> = {
    TIER_0: 50_000, // ₦50,000 - Not verified
    TIER_1: 300_000, // ₦300,000 - Email + Phone
    TIER_2: 5_000_000, // ₦5,000,000 - BVN verified
    TIER_3: Number.MAX_SAFE_INTEGER, // Unlimited - Full KYC
  };

  // Individual transaction limits (per transaction)
  private readonly SINGLE_TRANSACTION_LIMITS: Record<KYCTier, number> = {
    TIER_0: 20_000, // Max ₦20k per transaction
    TIER_1: 100_000, // Max ₦100k per transaction
    TIER_2: 1_000_000, // Max ₦1M per transaction
    TIER_3: Number.MAX_SAFE_INTEGER, // Unlimited
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Get daily limit for a user based on KYC tier
   */
  private getDailyLimit(kycTier: KYCTier): number {
    return this.TIER_LIMITS[kycTier] || this.TIER_LIMITS.TIER_0;
  }

  /**
   * Get single transaction limit based on KYC tier
   */
  private getSingleTransactionLimit(kycTier: KYCTier): number {
    return (
      this.SINGLE_TRANSACTION_LIMITS[kycTier] ||
      this.SINGLE_TRANSACTION_LIMITS.TIER_0
    );
  }

  /**
   * Get or create today's limit record for user
   */
  private async getTodayLimitRecord(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day

    let record = await this.prisma.dailyTransactionLimit.findFirst({
      where: {
        userId,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // End of day
        },
      },
    });

    if (!record) {
      // Create new record for today
      record = await this.prisma.dailyTransactionLimit.create({
        data: {
          userId,
          date: today,
        },
      });
    }

    return record;
  }

  /**
   * Check if user can perform transaction based on daily limits
   *
   * @param userId - User ID
   * @param amount - Transaction amount
   * @param type - Transaction type
   * @returns Whether transaction can proceed and limit info
   */
  async checkDailyLimit(
    userId: string,
    amount: number,
    type: TransactionLimitType,
  ): Promise<DailyLimitInfo> {
    // Get user to check KYC tier
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { kycTier: true, firstName: true, lastName: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const dailyLimit = this.getDailyLimit(user.kycTier);
    const singleTxLimit = this.getSingleTransactionLimit(user.kycTier);

    // Check single transaction limit first
    if (amount > singleTxLimit) {
      this.logger.warn(
        `[LimitCheck] User ${userId} exceeds single transaction limit: ₦${amount} > ₦${singleTxLimit}`,
      );
      return {
        limit: singleTxLimit,
        spent: 0,
        remaining: singleTxLimit,
        transactionCount: 0,
        canProceed: false,
      };
    }

    // Get today's spending
    const record = await this.getTodayLimitRecord(userId);

    // Calculate total spent based on transaction type
    let totalSpent = 0;
    let transactionCount = 0;

    switch (type) {
      case TransactionLimitType.AIRTIME:
        totalSpent = Number(record.totalAirtime);
        transactionCount = record.airtimeCount;
        break;
      case TransactionLimitType.DATA:
        totalSpent = Number(record.totalData);
        transactionCount = record.dataCount;
        break;
      case TransactionLimitType.BILL_PAYMENT:
        totalSpent = Number(record.totalBillPayments);
        transactionCount = record.billPaymentCount;
        break;
      case TransactionLimitType.TRANSFER:
      case TransactionLimitType.WITHDRAWAL:
      case TransactionLimitType.P2P_TRANSFER:
        // Transfers, withdrawals, and P2P transfers share the same limit
        totalSpent = Number(record.totalTransferred);
        transactionCount = record.transferCount + record.withdrawalCount;
        break;
    }

    const remaining = dailyLimit - totalSpent;
    const canProceed = totalSpent + amount <= dailyLimit;

    this.logger.log(
      `[LimitCheck] User ${userId} (${user.kycTier}): ${type} - Spent: ₦${totalSpent}, Limit: ₦${dailyLimit}, Amount: ₦${amount}, Can proceed: ${canProceed}`,
    );

    return {
      limit: dailyLimit,
      spent: totalSpent,
      remaining: Math.max(0, remaining),
      transactionCount,
      canProceed,
    };
  }

  /**
   * Increment daily spending after successful transaction
   *
   * @param userId - User ID
   * @param amount - Transaction amount
   * @param type - Transaction type
   */
  async incrementDailySpend(
    userId: string,
    amount: number,
    type: TransactionLimitType,
  ): Promise<void> {
    const record = await this.getTodayLimitRecord(userId);

    const amountDecimal = new Decimal(amount);

    switch (type) {
      case TransactionLimitType.AIRTIME:
        await this.prisma.dailyTransactionLimit.update({
          where: { id: record.id },
          data: {
            totalAirtime: new Decimal(record.totalAirtime).add(amountDecimal),
            airtimeCount: record.airtimeCount + 1,
          },
        });
        break;

      case TransactionLimitType.DATA:
        await this.prisma.dailyTransactionLimit.update({
          where: { id: record.id },
          data: {
            totalData: new Decimal(record.totalData).add(amountDecimal),
            dataCount: record.dataCount + 1,
          },
        });
        break;

      case TransactionLimitType.BILL_PAYMENT:
        await this.prisma.dailyTransactionLimit.update({
          where: { id: record.id },
          data: {
            totalBillPayments: new Decimal(record.totalBillPayments).add(
              amountDecimal,
            ),
            billPaymentCount: record.billPaymentCount + 1,
          },
        });
        break;

      case TransactionLimitType.TRANSFER:
        await this.prisma.dailyTransactionLimit.update({
          where: { id: record.id },
          data: {
            totalTransferred: new Decimal(record.totalTransferred).add(
              amountDecimal,
            ),
            transferCount: record.transferCount + 1,
          },
        });
        break;

      case TransactionLimitType.WITHDRAWAL:
        await this.prisma.dailyTransactionLimit.update({
          where: { id: record.id },
          data: {
            totalTransferred: new Decimal(record.totalTransferred).add(
              amountDecimal,
            ),
            totalWithdrawn: new Decimal(record.totalWithdrawn).add(
              amountDecimal,
            ),
            withdrawalCount: record.withdrawalCount + 1,
          },
        });
        break;

      case TransactionLimitType.P2P_TRANSFER:
        await this.prisma.dailyTransactionLimit.update({
          where: { id: record.id },
          data: {
            totalTransferred: new Decimal(record.totalTransferred).add(
              amountDecimal,
            ),
            transferCount: record.transferCount + 1,
          },
        });
        break;
    }

    this.logger.log(`[LimitIncrement] User ${userId}: ${type} +₦${amount}`);
  }

  /**
   * Get daily spending summary for user
   *
   * @param userId - User ID
   * @returns Daily spending breakdown
   */
  async getDailySpending(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { kycTier: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const record = await this.getTodayLimitRecord(userId);
    const dailyLimit = this.getDailyLimit(user.kycTier);

    const totalSpent =
      Number(record.totalTransferred) +
      Number(record.totalAirtime) +
      Number(record.totalData) +
      Number(record.totalBillPayments);

    return {
      kycTier: user.kycTier,
      dailyLimit,
      totalSpent,
      remaining: Math.max(0, dailyLimit - totalSpent),
      breakdown: {
        transfers: {
          amount: Number(record.totalTransferred),
          count: record.transferCount,
        },
        withdrawals: {
          amount: Number(record.totalWithdrawn),
          count: record.withdrawalCount,
        },
        airtime: {
          amount: Number(record.totalAirtime),
          count: record.airtimeCount,
        },
        data: {
          amount: Number(record.totalData),
          count: record.dataCount,
        },
        billPayments: {
          amount: Number(record.totalBillPayments),
          count: record.billPaymentCount,
        },
      },
      date: record.date,
    };
  }

  /**
   * Get remaining daily limit for user
   *
   * @param userId - User ID
   * @returns Remaining limit amount
   */
  async getRemainingLimit(userId: string): Promise<number> {
    const spending = await this.getDailySpending(userId);
    return spending.remaining;
  }

  /**
   * Check if amount exceeds limit and throw descriptive error
   *
   * @param userId - User ID
   * @param amount - Transaction amount
   * @param type - Transaction type
   * @throws BadRequestException if limit exceeded
   */
  async enforceLimit(
    userId: string,
    amount: number,
    type: TransactionLimitType,
  ): Promise<void> {
    const limitInfo = await this.checkDailyLimit(userId, amount, type);

    if (!limitInfo.canProceed) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { kycTier: true },
      });

      // Check if it's single transaction limit or daily limit
      const singleTxLimit = this.getSingleTransactionLimit(user!.kycTier);

      if (amount > singleTxLimit) {
        throw new BadRequestException(
          `Transaction amount (₦${amount.toLocaleString()}) exceeds your tier limit of ₦${singleTxLimit.toLocaleString()} per transaction. Upgrade your KYC tier to increase limits.`,
        );
      }

      throw new BadRequestException(
        `Daily limit exceeded. You have ₦${limitInfo.remaining.toLocaleString()} remaining out of ₦${limitInfo.limit.toLocaleString()}. Upgrade your KYC tier for higher limits.`,
      );
    }
  }

  /**
   * Get KYC tier limits information
   *
   * @returns All tier limits
   */
  getTierLimits() {
    return {
      TIER_0: {
        daily: this.TIER_LIMITS.TIER_0,
        perTransaction: this.SINGLE_TRANSACTION_LIMITS.TIER_0,
        description: 'Not verified - Email & Phone verification required',
      },
      TIER_1: {
        daily: this.TIER_LIMITS.TIER_1,
        perTransaction: this.SINGLE_TRANSACTION_LIMITS.TIER_1,
        description: 'Email & Phone verified - BVN verification recommended',
      },
      TIER_2: {
        daily: this.TIER_LIMITS.TIER_2,
        perTransaction: this.SINGLE_TRANSACTION_LIMITS.TIER_2,
        description: 'BVN verified - Full KYC recommended for unlimited',
      },
      TIER_3: {
        daily: 'Unlimited',
        perTransaction: 'Unlimited',
        description: 'Full KYC verified - No limits',
      },
    };
  }
}
