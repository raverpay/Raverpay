import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, TransactionStatus } from '@prisma/client';

@Injectable()
export class AdminAnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get dashboard overview analytics
   */
  async getDashboardAnalytics(startDate?: string, endDate?: string) {
    const dateFilter: Prisma.TransactionWhereInput['createdAt'] = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const [
      totalUsers,
      activeUsers,
      totalWalletBalance,
      transactionsToday,
      revenueToday,
      pendingKYC,
      failedTransactions,
      pendingDeletions,
    ] = await Promise.all([
      // Total users
      this.prisma.user.count(),

      // Active users (logged in within last 30 days)
      this.prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Total platform balance
      this.prisma.wallet.aggregate({
        _sum: { balance: true },
      }),

      // Transactions today
      this.prisma.transaction.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),

      // Revenue today (fees collected)
      this.prisma.transaction.aggregate({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
          status: TransactionStatus.COMPLETED,
        },
        _sum: { fee: true },
      }),

      // Pending KYC count
      this.prisma.user.count({
        where: {
          OR: [
            { bvnVerified: false, bvn: { not: null } },
            { ninVerified: false, nin: { not: null } },
          ],
        },
      }),

      // Failed transactions count
      this.prisma.transaction.count({
        where: { status: TransactionStatus.FAILED },
      }),

      // Pending deletion requests
      this.prisma.accountDeletionRequest.count({
        where: { status: 'PENDING' },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      wallets: {
        totalBalance: totalWalletBalance._sum.balance || 0,
      },
      transactions: {
        today: transactionsToday,
      },
      revenue: {
        today: revenueToday._sum.fee || 0,
      },
      pending: {
        kyc: pendingKYC,
        failedTransactions,
        deletionRequests: pendingDeletions,
      },
    };
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(
    startDate?: string,
    endDate?: string,
    groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    const where: Prisma.TransactionWhereInput = {
      status: TransactionStatus.COMPLETED,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [totalRevenue, revenueByType] = await Promise.all([
      // Total revenue
      this.prisma.transaction.aggregate({
        where,
        _sum: { fee: true },
        _count: true,
      }),

      // Revenue by transaction type
      this.prisma.transaction.groupBy({
        by: ['type'],
        where,
        _sum: { fee: true },
        _count: true,
      }),
    ]);

    return {
      totalRevenue: totalRevenue._sum.fee || 0,
      totalTransactions: totalRevenue._count,
      byType: revenueByType.map((item) => ({
        type: item.type,
        revenue: item._sum.fee || 0,
        count: item._count,
      })),
    };
  }

  /**
   * Get user growth analytics
   */
  async getUserGrowthAnalytics(
    startDate?: string,
    endDate?: string,
  ) {
    const where: Prisma.UserWhereInput = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [newUsers, usersByKYCTier, usersByStatus] = await Promise.all([
      // New users count
      this.prisma.user.count({ where }),

      // Users by KYC tier
      this.prisma.user.groupBy({
        by: ['kycTier'],
        where,
        _count: true,
      }),

      // Users by status
      this.prisma.user.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
    ]);

    return {
      newUsers,
      byKYCTier: usersByKYCTier.map((item) => ({
        tier: item.kycTier,
        count: item._count,
      })),
      byStatus: usersByStatus.map((item) => ({
        status: item.status,
        count: item._count,
      })),
    };
  }

  /**
   * Get transaction trends
   */
  async getTransactionTrends(
    startDate?: string,
    endDate?: string,
    type?: string,
  ) {
    const where: Prisma.TransactionWhereInput = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (type) {
      where.type = type as any;
    }

    const [totalVolume, totalCount, byStatus] = await Promise.all([
      // Total volume
      this.prisma.transaction.aggregate({
        where,
        _sum: { amount: true },
      }),

      // Total count
      this.prisma.transaction.count({ where }),

      // By status
      this.prisma.transaction.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
    ]);

    const successCount =
      byStatus.find((s) => s.status === TransactionStatus.COMPLETED)?._count ||
      0;
    const successRate =
      totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(2) : '0';

    return {
      totalVolume: totalVolume._sum.amount || 0,
      totalCount,
      successRate,
      byStatus: byStatus.map((item) => ({
        status: item.status,
        count: item._count,
      })),
    };
  }
}
