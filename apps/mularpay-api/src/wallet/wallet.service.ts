import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  KYCTier,
  TransactionType as PrismaTransactionType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  WalletBalanceResponse,
  WalletLimitsResponse,
  TransactionHistoryResponse,
  TransactionResponse,
  KYC_TIER_LIMITS,
  PaginationInfo,
  TransactionSummary,
} from './wallet.types';
import { GetTransactionsDto, TransactionStatus } from './dto';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get wallet balance and details
   * @param userId - User ID
   * @returns Wallet balance response
   */
  async getWalletBalance(userId: string): Promise<WalletBalanceResponse> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            kycTier: true,
          },
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const kycTier = wallet.user.kycTier;
    const limits = KYC_TIER_LIMITS[kycTier];

    // Convert Decimal to string
    const dailySpent = wallet.dailySpent.toString();
    const monthlySpent = wallet.monthlySpent.toString();

    // Calculate remaining limits
    const dailyRemaining = this.calculateRemaining(
      limits.dailyLimit,
      dailySpent,
    );
    const monthlyRemaining = this.calculateRemaining(
      limits.monthlyLimit,
      monthlySpent,
    );

    return {
      id: wallet.id,
      balance: wallet.balance.toString(),
      ledgerBalance: wallet.ledgerBalance.toString(),
      currency: wallet.currency,
      dailySpent,
      monthlySpent,
      dailyLimit: limits.dailyLimit,
      monthlyLimit: limits.monthlyLimit,
      dailyRemaining,
      monthlyRemaining,
      isLocked: wallet.isLocked,
      lockedReason: wallet.lockedReason,
      kycTier,
      lastResetAt: wallet.lastResetAt,
    };
  }

  /**
   * Get wallet limits based on KYC tier
   * @param userId - User ID
   * @returns Wallet limits response
   */
  async getWalletLimits(userId: string): Promise<WalletLimitsResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
      },
    });

    if (!user || !user.wallet) {
      throw new NotFoundException('User or wallet not found');
    }

    const kycTier = user.kycTier;
    const limits = KYC_TIER_LIMITS[kycTier];

    const dailySpent = user.wallet.dailySpent.toString();
    const monthlySpent = user.wallet.monthlySpent.toString();

    const dailyRemaining = this.calculateRemaining(
      limits.dailyLimit,
      dailySpent,
    );
    const monthlyRemaining = this.calculateRemaining(
      limits.monthlyLimit,
      monthlySpent,
    );

    // Determine next tier
    const nextTier = this.getNextTier(kycTier);
    const nextTierLimits = nextTier ? KYC_TIER_LIMITS[nextTier] : null;

    return {
      kycTier,
      dailyLimit: limits.dailyLimit,
      monthlyLimit: limits.monthlyLimit,
      singleTransactionLimit: limits.singleTransactionLimit,
      dailySpent,
      monthlySpent,
      dailyRemaining,
      monthlyRemaining,
      canTransact: !user.wallet.isLocked,
      limitInfo: {
        isUnlimited: limits.isUnlimited,
        nextTier,
        nextTierDailyLimit: nextTierLimits?.dailyLimit || null,
        nextTierMonthlyLimit: nextTierLimits?.monthlyLimit || null,
      },
    };
  }

  /**
   * Lock user's wallet
   * @param userId - User ID
   * @param reason - Reason for locking
   * @returns Lock confirmation
   */
  async lockWallet(userId: string, reason: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.isLocked) {
      throw new BadRequestException('Wallet is already locked');
    }

    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        isLocked: true,
        lockedReason: reason,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'WALLET_LOCKED',
        resource: 'WALLET',
        resourceId: wallet.id,
        ipAddress: '0.0.0.0',
        userAgent: 'API',
        metadata: {
          reason,
        },
      },
    });

    return {
      message: 'Wallet locked successfully',
      isLocked: true,
      lockedReason: reason,
      lockedAt: new Date(),
    };
  }

  /**
   * Unlock wallet (Admin only)
   * @param walletId - Wallet ID
   * @param adminId - Admin user ID
   * @param reason - Reason for unlocking
   * @returns Unlock confirmation
   */
  async unlockWallet(walletId: string, adminId: string, reason: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (!wallet.isLocked) {
      throw new BadRequestException('Wallet is not locked');
    }

    await this.prisma.wallet.update({
      where: { id: walletId },
      data: {
        isLocked: false,
        lockedReason: null,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'WALLET_UNLOCKED',
        resource: 'WALLET',
        resourceId: walletId,
        ipAddress: '0.0.0.0',
        userAgent: 'API',
        metadata: {
          reason,
          targetWalletId: walletId,
        },
      },
    });

    return {
      message: 'Wallet unlocked successfully',
      isLocked: false,
      unlockedAt: new Date(),
    };
  }

  /**
   * Get transaction history with pagination and filters
   * @param userId - User ID
   * @param dto - Filter and pagination params
   * @returns Transaction history response
   */
  async getTransactionHistory(
    userId: string,
    dto: GetTransactionsDto,
  ): Promise<TransactionHistoryResponse> {
    const { page = 1, limit = 20, type, status, startDate, endDate } = dto;

    // Build where clause
    const where: Record<string, unknown> = {
      userId,
    };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    // Get total count
    const total = await this.prisma.transaction.count({ where });

    // Get transactions
    const transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Calculate summary
    const summary = await this.calculateTransactionSummary(userId, where);

    // Build pagination info
    const totalPages = Math.ceil(total / limit);
    const pagination: PaginationInfo = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };

    // Format transactions
    const data: TransactionResponse[] = transactions.map((tx) => {
      return {
        id: tx.id,
        reference: tx.reference,
        type: tx.type,
        amount: tx.amount.toString(),
        currency: tx.currency,
        balanceBefore: tx.balanceBefore.toString(),
        balanceAfter: tx.balanceAfter.toString(),
        status: tx.status,
        description: tx.description,
        category: null,
        metadata: tx.metadata as unknown,
        createdAt: tx.createdAt,
        completedAt: tx.completedAt,
      };
    });

    return {
      data,
      pagination,
      summary,
    };
  }

  /**
   * Get single transaction details
   * @param userId - User ID
   * @param transactionId - Transaction ID
   * @returns Transaction details
   */
  async getTransactionById(
    userId: string,
    transactionId: string,
  ): Promise<TransactionResponse> {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return {
      id: transaction.id,
      reference: transaction.reference,
      type: transaction.type,
      amount: transaction.amount.toString(),
      currency: transaction.currency,
      balanceBefore: transaction.balanceBefore.toString(),
      balanceAfter: transaction.balanceAfter.toString(),
      status: transaction.status,
      description: transaction.description,
      category: null,
      metadata: transaction.metadata as unknown,
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt,
    };
  }

  /**
   * Calculate remaining limit
   * @private
   */
  private calculateRemaining(limit: string, spent: string): string {
    const limitNum = parseFloat(limit);
    const spentNum = parseFloat(spent);
    const remaining = Math.max(0, limitNum - spentNum);
    return remaining.toFixed(2);
  }

  /**
   * Get next KYC tier
   * @private
   */
  private getNextTier(currentTier: KYCTier): KYCTier | null {
    const tiers: KYCTier[] = [
      KYCTier.TIER_0,
      KYCTier.TIER_1,
      KYCTier.TIER_2,
      KYCTier.TIER_3,
    ];
    const currentIndex = tiers.indexOf(currentTier);
    return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
  }

  /**
   * Calculate transaction summary
   * @private
   */
  private async calculateTransactionSummary(
    userId: string,
    where: Record<string, unknown>,
  ): Promise<TransactionSummary> {
    // Get all transactions matching the filter
    const transactions = await this.prisma.transaction.findMany({
      where: {
        ...where,
        status: TransactionStatus.COMPLETED,
      },
      select: {
        type: true,
        amount: true,
      },
    });

    let totalDebits = new Decimal(0);
    let totalCredits = new Decimal(0);

    // Credit transactions: money coming in
    const creditTypes: PrismaTransactionType[] = [
      PrismaTransactionType.DEPOSIT,
      PrismaTransactionType.GIFTCARD_SELL,
      PrismaTransactionType.CRYPTO_SELL,
      PrismaTransactionType.REFUND,
    ];

    transactions.forEach((tx) => {
      if (creditTypes.includes(tx.type)) {
        totalCredits = totalCredits.plus(tx.amount);
      } else {
        // All other types are debits (money going out)
        totalDebits = totalDebits.plus(tx.amount);
      }
    });

    const netAmount = totalCredits.minus(totalDebits);

    return {
      totalDebits: totalDebits.toString(),
      totalCredits: totalCredits.toString(),
      netAmount: netAmount.toString(),
      transactionCount: transactions.length,
    };
  }
}
