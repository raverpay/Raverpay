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
import { RedisService } from '../cache/redis.service';

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Get wallet balance and details
   * @param userId - User ID
   * @returns Wallet balance response
   */
  async getWalletBalance(userId: string): Promise<WalletBalanceResponse> {
    // Try to get from cache first
    const cacheKey = `wallet:${userId}`;
    const cached = await this.redis.get<WalletBalanceResponse>(cacheKey);

    if (cached) {
      return cached;
    }

    // Cache miss - fetch from database
    const wallet = await this.prisma.wallet.findFirst({
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

    const response: WalletBalanceResponse = {
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
      singleTransactionLimit: limits.singleTransactionLimit,
      isLocked: wallet.isLocked,
      lockedReason: wallet.lockedReason,
      kycTier,
      lastResetAt: wallet.lastResetAt,
    };

    // Cache for 60 seconds
    await this.redis.set(cacheKey, response, 60);

    return response;
  }

  /**
   * Invalidate wallet cache
   * Call this after any transaction that updates wallet balance
   * @param userId - User ID
   */
  async invalidateWalletCache(userId: string): Promise<void> {
    await this.redis.del(`wallet:${userId}`);
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
        wallets: {
          where: {
            type: 'NAIRA',
          },
        },
      },
    });

    const nairaWallet = user?.wallets?.[0];
    if (!user || !nairaWallet) {
      throw new NotFoundException('User or wallet not found');
    }

    const kycTier = user.kycTier;
    const limits = KYC_TIER_LIMITS[kycTier];

    const dailySpent = nairaWallet.dailySpent.toString();
    const monthlySpent = nairaWallet.monthlySpent.toString();

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
      canTransact: !nairaWallet.isLocked,
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
    const wallet = await this.prisma.wallet.findFirst({
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
    const wallet = await this.prisma.wallet.findFirst({
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

    // Build cache key based on filters
    const cacheKey = `transactions:${userId}:page:${page}:limit:${limit}:type:${type || 'all'}:status:${status || 'all'}:start:${startDate || 'none'}:end:${endDate || 'none'}`;

    // Try cache first
    const cached = await this.redis.get<TransactionHistoryResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    // Build where clause
    const where: Record<string, unknown> = {
      userId,
    };

    // Map DEBIT/CREDIT to actual transaction types
    if (type) {
      // Use string comparison to avoid enum type mismatch
      const typeValue = type.toString();

      if (typeValue === 'CREDIT') {
        // Money IN: DEPOSIT, REFUND, GIFTCARD_SELL, CRYPTO_SELL
        where.type = {
          in: [
            PrismaTransactionType.DEPOSIT,
            PrismaTransactionType.REFUND,
            PrismaTransactionType.GIFTCARD_SELL,
            PrismaTransactionType.CRYPTO_SELL,
          ],
        };
      } else if (typeValue === 'DEBIT') {
        // Money OUT: WITHDRAWAL, TRANSFER, VTU_*, GIFTCARD_BUY, CRYPTO_BUY, FEE
        where.type = {
          in: [
            PrismaTransactionType.WITHDRAWAL,
            PrismaTransactionType.TRANSFER,
            PrismaTransactionType.VTU_AIRTIME,
            PrismaTransactionType.VTU_DATA,
            PrismaTransactionType.VTU_CABLE,
            PrismaTransactionType.VTU_ELECTRICITY,
            PrismaTransactionType.GIFTCARD_BUY,
            PrismaTransactionType.CRYPTO_BUY,
            PrismaTransactionType.FEE,
          ],
        };
      }
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

    const response: TransactionHistoryResponse = {
      data,
      pagination,
      summary,
    };

    // Cache for 2 minutes
    await this.redis.set(cacheKey, response, 120);

    return response;
  }

  /**
   * Invalidate transaction cache for user
   * Call this after any new transaction
   * @param userId - User ID
   */
  async invalidateTransactionCache(userId: string): Promise<void> {
    await this.redis.delPattern(`transactions:${userId}:*`);
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
    // Try cache first
    const cacheKey = `transaction:${transactionId}`;
    const cached = await this.redis.get<TransactionResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const response: TransactionResponse = {
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

    // Cache for 10 minutes (transactions don't change often)
    await this.redis.set(cacheKey, response, 600);

    return response;
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
