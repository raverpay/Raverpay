import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, CryptoTransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AdminVenlyWalletsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all crypto wallets with filters
   */
  async getCryptoWallets(
    page: number = 1,
    limit: number = 20,
    search?: string,
    minBalance?: number,
    maxBalance?: number,
    hasWallet?: boolean,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    // Filter by users who have Venly wallets
    if (hasWallet !== undefined) {
      if (hasWallet) {
        where.venlyUser = { isNot: null };
      } else {
        where.venlyUser = null;
      }
    }

    // Search by user's name, email, or phone
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          venlyUser: true,
          wallets: {
            where: { type: 'CRYPTO' },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        hasVenlyWallet: !!user.venlyUser,
        venlyUserId: user.venlyUser?.venlyUserId,
        wallets: user.wallets,
        createdAt: user.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get crypto wallet statistics
   */
  async getWalletStats() {
    const [totalUsers, usersWithWallets, totalWallets, transactionStats] =
      await Promise.all([
        this.prisma.user.count(),

        this.prisma.venlyUser.count(),

        this.prisma.wallet.count({
          where: { type: 'CRYPTO' },
        }),

        this.prisma.cryptoTransaction.groupBy({
          by: ['status'],
          _count: true,
        }),
      ]);

    return {
      totalUsers,
      usersWithWallets,
      totalWallets,
      adoptionRate:
        totalUsers > 0
          ? ((usersWithWallets / totalUsers) * 100).toFixed(2)
          : '0',
      transactions: {
        byStatus: transactionStats.map((item) => ({
          status: item.status,
          count: item._count,
        })),
      },
    };
  }

  /**
   * Get user's crypto wallet details
   */
  async getUserCryptoWallet(userId: string) {
    const venlyUser = await this.prisma.venlyUser.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            status: true,
            kycTier: true,
          },
        },
      },
    });

    if (!venlyUser) {
      throw new NotFoundException('User does not have a Venly wallet');
    }

    // Get crypto wallet
    const cryptoWallet = await this.prisma.wallet.findFirst({
      where: {
        userId,
        type: 'CRYPTO',
      },
      include: {
        cryptoBalances: true,
      },
    });

    // Get recent transactions
    const recentTransactions = await this.prisma.cryptoTransaction.findMany({
      where: { userId },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    return {
      ...venlyUser,
      cryptoWallet,
      recentTransactions,
    };
  }

  /**
   * Get crypto transactions with filters
   */
  async getCryptoTransactions(
    page: number = 1,
    limit: number = 20,
    userId?: string,
    status?: CryptoTransactionStatus,
    type?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.CryptoTransactionWhereInput = {};

    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (type) where.type = type as any;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [transactions, total] = await Promise.all([
      this.prisma.cryptoTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.cryptoTransaction.count({ where }),
    ]);

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get crypto conversions (crypto to Naira)
   */
  async getCryptoConversions(
    page: number = 1,
    limit: number = 20,
    userId?: string,
    status?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.CryptoConversionWhereInput = {};

    if (userId) where.userId = userId;
    if (status) where.status = status as any;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [conversions, total, aggregations] = await Promise.all([
      this.prisma.cryptoConversion.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.cryptoConversion.count({ where }),

      this.prisma.cryptoConversion.aggregate({
        where,
        _sum: { usdValue: true, nairaAmount: true },
        _avg: { usdValue: true },
      }),
    ]);

    return {
      data: conversions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalVolumeUSD: aggregations._sum?.usdValue || 0,
        averageConversionUSD: aggregations._avg?.usdValue || 0,
      },
    };
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(transactionId: string) {
    const transaction = await this.prisma.cryptoTransaction.findUnique({
      where: { id: transactionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  /**
   * Flag transaction as suspicious
   */
  async flagTransaction(
    adminUserId: string,
    transactionId: string,
    reason: string,
  ) {
    const transaction = await this.prisma.cryptoTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Note: Since metadata field doesn't exist in CryptoTransaction,
    // we'll create an audit log instead
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'FLAG_CRYPTO_TRANSACTION',
        resource: 'CryptoTransaction',
        resourceId: transactionId,
        metadata: {
          transactionHash: transaction.transactionHash,
          flagReason: reason,
          flaggedAt: new Date().toISOString(),
        },
      },
    });

    return {
      success: true,
      message: 'Transaction flagged successfully',
      transactionId,
    };
  }

  /**
   * Get exchange rates
   */
  async getExchangeRates() {
    const rates = await this.prisma.exchangeRate.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    return rates;
  }

  /**
   * Update exchange rate
   */
  async updateExchangeRate(
    adminUserId: string,
    currency: string,
    toNaira: number,
    platformFeePercent?: number,
  ) {
    // Find existing rate
    const existingRate = await this.prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: currency,
        toCurrency: 'NGN',
      },
    });

    let rate;

    if (existingRate) {
      rate = await this.prisma.exchangeRate.update({
        where: { id: existingRate.id },
        data: {
          rate: new Decimal(toNaira),
          ...(platformFeePercent !== undefined && {
            platformFeePercent: new Decimal(platformFeePercent),
          }),
          setBy: adminUserId,
          updatedAt: new Date(),
        },
      });
    } else {
      rate = await this.prisma.exchangeRate.create({
        data: {
          fromCurrency: currency,
          toCurrency: 'NGN',
          rate: new Decimal(toNaira),
          platformFeePercent: new Decimal(platformFeePercent || 1.0),
          setBy: adminUserId,
        },
      });
    }

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'UPDATE_EXCHANGE_RATE',
        resource: 'ExchangeRate',
        resourceId: rate.id,
        metadata: {
          currency,
          previousRate: existingRate?.rate.toString(),
          newRate: toNaira.toString(),
        },
      },
    });

    return rate;
  }

  /**
   * Get analytics data
   */
  async getAnalytics(startDate?: string, endDate?: string) {
    const where: Prisma.CryptoTransactionWhereInput = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [transactionsByType, transactionsByStatus, conversionStats] =
      await Promise.all([
        this.prisma.cryptoTransaction.groupBy({
          by: ['type'],
          where,
          _count: true,
          _sum: { usdValue: true },
        }),

        this.prisma.cryptoTransaction.groupBy({
          by: ['status'],
          where,
          _count: true,
        }),

        this.prisma.cryptoConversion.aggregate({
          _count: true,
          _sum: { usdValue: true, nairaAmount: true },
          _avg: { usdValue: true },
        }),
      ]);

    // Get daily volume for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyTransactions = await this.prisma.cryptoTransaction.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        createdAt: true,
        usdValue: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by date
    const dailyVolume = dailyTransactions.reduce(
      (acc, tx) => {
        const date = tx.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            count: 0,
            volume: new Decimal(0),
          };
        }
        acc[date].count += 1;
        acc[date].volume = acc[date].volume.plus(tx.usdValue);
        return acc;
      },
      {} as Record<string, { date: string; count: number; volume: Decimal }>,
    );

    return {
      byType: transactionsByType.map((item) => ({
        type: item.type,
        count: item._count,
        volumeUSD: item._sum.usdValue || 0,
      })),
      byStatus: transactionsByStatus.map((item) => ({
        status: item.status,
        count: item._count,
      })),
      conversions: {
        totalCount: conversionStats._count,
        totalVolumeUSD: conversionStats._sum?.usdValue || 0,
        totalVolumeNGN: conversionStats._sum?.nairaAmount || 0,
        averageAmountUSD: conversionStats._avg?.usdValue || 0,
      },
      dailyVolume: Object.values(dailyVolume).map((item) => ({
        date: item.date,
        count: item.count,
        volume: item.volume.toString(),
      })),
    };
  }
}
