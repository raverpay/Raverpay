import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, TransactionStatus } from '@prisma/client';

@Injectable()
export class AdminAdvancedAnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get time-series revenue analytics
   */
  async getRevenueTimeSeries(
    startDate: string,
    endDate: string,
    interval: 'day' | 'week' | 'month' = 'day',
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get all completed transactions in date range
    const transactions = await this.prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        status: TransactionStatus.COMPLETED,
      },
      select: {
        createdAt: true,
        fee: true,
        amount: true,
        type: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by interval
    const grouped = this.groupByInterval(transactions, interval);

    return {
      interval,
      startDate: start,
      endDate: end,
      data: grouped,
      summary: {
        totalRevenue: grouped.reduce((sum, item) => sum + item.revenue, 0),
        totalVolume: grouped.reduce((sum, item) => sum + item.volume, 0),
        totalTransactions: transactions.length,
        averageRevenue:
          grouped.length > 0
            ? grouped.reduce((sum, item) => sum + item.revenue, 0) /
              grouped.length
            : 0,
      },
    };
  }

  /**
   * Get transaction trends over time
   */
  async getTransactionTrends(
    startDate: string,
    endDate: string,
    interval: 'day' | 'week' | 'month' = 'day',
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        createdAt: true,
        status: true,
        type: true,
        amount: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const grouped = this.groupTransactionsByInterval(transactions, interval);

    return {
      interval,
      startDate: start,
      endDate: end,
      data: grouped,
    };
  }

  /**
   * Get user growth metrics
   */
  async getUserGrowth(
    startDate: string,
    endDate: string,
    interval: 'day' | 'week' | 'month' = 'day',
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const users = await this.prisma.user.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        createdAt: true,
        status: true,
        kycTier: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const grouped = this.groupUsersByInterval(users, interval);

    // Get total users before period
    const usersBefore = await this.prisma.user.count({
      where: {
        createdAt: {
          lt: start,
        },
      },
    });

    return {
      interval,
      startDate: start,
      endDate: end,
      usersBefore,
      data: grouped,
      summary: {
        newUsers: users.length,
        growthRate:
          usersBefore > 0
            ? ((users.length / usersBefore) * 100).toFixed(2)
            : '100',
      },
    };
  }

  /**
   * Get cohort analysis (users by registration month and their activity)
   */
  async getCohortAnalysis(months: number = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Get users grouped by registration month
    const users = await this.prisma.user.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    // Get transaction counts for each user
    const userIds = users.map((u) => u.id);
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId: { in: userIds },
        status: TransactionStatus.COMPLETED,
      },
      select: {
        userId: true,
        createdAt: true,
        amount: true,
      },
    });

    // Build cohorts
    const cohorts = this.buildCohorts(users, transactions);

    return {
      months,
      startDate,
      cohorts,
    };
  }

  /**
   * Get provider performance metrics
   */
  async getProviderPerformance(startDate?: string, endDate?: string) {
    const where: Prisma.VTUOrderWhereInput = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const vtuOrders = await this.prisma.vTUOrder.groupBy({
      by: ['provider'],
      where,
      _count: true,
      _sum: { amount: true },
      _avg: { amount: true },
    });

    const vtuByStatus = await this.prisma.vTUOrder.groupBy({
      by: ['provider', 'status'],
      where,
      _count: true,
    });

    // Calculate success rates
    const providerStats = vtuOrders.map((provider) => {
      const statusBreakdown = vtuByStatus.filter(
        (s) => s.provider === provider.provider,
      );
      const completed =
        statusBreakdown.find((s) => s.status === TransactionStatus.COMPLETED)
          ?._count || 0;
      const failed =
        statusBreakdown.find((s) => s.status === TransactionStatus.FAILED)
          ?._count || 0;
      const total = provider._count;

      return {
        provider: provider.provider,
        totalOrders: total,
        totalVolume: provider._sum.amount || 0,
        averageAmount: provider._avg.amount || 0,
        completed,
        failed,
        pending: total - completed - failed,
        successRate: total > 0 ? ((completed / total) * 100).toFixed(2) : '0',
      };
    });

    return {
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      providers: providerStats,
      summary: {
        totalProviders: providerStats.length,
        totalOrders: providerStats.reduce((sum, p) => sum + p.totalOrders, 0),
        totalVolume: providerStats.reduce(
          (sum, p) => sum + Number(p.totalVolume),
          0,
        ),
        overallSuccessRate:
          (providerStats.reduce((sum, p) => sum + p.completed, 0) /
            providerStats.reduce((sum, p) => sum + p.totalOrders, 0)) *
            100 || 0,
      },
    };
  }

  /**
   * Get platform overview metrics
   */
  async getPlatformOverview() {
    const [
      totalUsers,
      activeUsers,
      totalTransactions,
      totalRevenue,
      totalVolume,
      walletBalance,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
      this.prisma.transaction.count({
        where: { status: TransactionStatus.COMPLETED },
      }),
      this.prisma.transaction.aggregate({
        where: { status: TransactionStatus.COMPLETED },
        _sum: { fee: true },
      }),
      this.prisma.transaction.aggregate({
        where: { status: TransactionStatus.COMPLETED },
        _sum: { amount: true },
      }),
      this.prisma.wallet.aggregate({
        _sum: { balance: true },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        activeRate:
          totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(2) : '0',
      },
      transactions: {
        total: totalTransactions,
        volume: totalVolume._sum.amount || 0,
        revenue: totalRevenue._sum.fee || 0,
      },
      wallet: {
        totalBalance: walletBalance._sum.balance || 0,
      },
    };
  }

  // Helper methods

  private groupByInterval(
    transactions: any[],
    interval: 'day' | 'week' | 'month',
  ) {
    const grouped = new Map<
      string,
      { revenue: number; volume: number; count: number }
    >();

    transactions.forEach((tx) => {
      const key = this.getIntervalKey(tx.createdAt, interval);
      const current = grouped.get(key) || { revenue: 0, volume: 0, count: 0 };

      current.revenue += Number(tx.fee);
      current.volume += Number(tx.amount);
      current.count += 1;

      grouped.set(key, current);
    });

    return Array.from(grouped.entries()).map(([period, data]) => ({
      period,
      revenue: data.revenue,
      volume: data.volume,
      transactions: data.count,
      averageTransactionSize: data.count > 0 ? data.volume / data.count : 0,
    }));
  }

  private groupTransactionsByInterval(
    transactions: any[],
    interval: 'day' | 'week' | 'month',
  ) {
    const grouped = new Map<string, any>();

    transactions.forEach((tx) => {
      const key = this.getIntervalKey(tx.createdAt, interval);
      const current = grouped.get(key) || {
        total: 0,
        completed: 0,
        failed: 0,
        pending: 0,
        volume: 0,
      };

      current.total += 1;
      current.volume += Number(tx.amount);

      if (tx.status === TransactionStatus.COMPLETED) current.completed += 1;
      else if (tx.status === TransactionStatus.FAILED) current.failed += 1;
      else current.pending += 1;

      grouped.set(key, current);
    });

    return Array.from(grouped.entries()).map(([period, data]) => ({
      period,
      ...data,
      successRate:
        data.total > 0 ? ((data.completed / data.total) * 100).toFixed(2) : '0',
    }));
  }

  private groupUsersByInterval(
    users: any[],
    interval: 'day' | 'week' | 'month',
  ) {
    const grouped = new Map<string, number>();

    users.forEach((user) => {
      const key = this.getIntervalKey(user.createdAt, interval);
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });

    return Array.from(grouped.entries()).map(([period, count]) => ({
      period,
      newUsers: count,
    }));
  }

  private getIntervalKey(
    date: Date,
    interval: 'day' | 'week' | 'month',
  ): string {
    const d = new Date(date);

    if (interval === 'day') {
      return d.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (interval === 'week') {
      const weekNumber = this.getWeekNumber(d);
      return `${d.getFullYear()}-W${weekNumber}`;
    } else {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  private buildCohorts(users: any[], transactions: any[]) {
    const cohortMap = new Map<string, any>();

    users.forEach((user) => {
      const cohortKey = this.getIntervalKey(user.createdAt, 'month');
      if (!cohortMap.has(cohortKey)) {
        cohortMap.set(cohortKey, {
          month: cohortKey,
          users: 0,
          activeUsers: new Set(),
          totalRevenue: 0,
        });
      }
      cohortMap.get(cohortKey).users += 1;
    });

    transactions.forEach((tx) => {
      const user = users.find((u) => u.id === tx.userId);
      if (user) {
        const cohortKey = this.getIntervalKey(user.createdAt, 'month');
        const cohort = cohortMap.get(cohortKey);
        if (cohort) {
          cohort.activeUsers.add(tx.userId);
          cohort.totalRevenue += Number(tx.amount);
        }
      }
    });

    return Array.from(cohortMap.values()).map((cohort) => ({
      month: cohort.month,
      totalUsers: cohort.users,
      activeUsers: cohort.activeUsers.size,
      retentionRate:
        cohort.users > 0
          ? ((cohort.activeUsers.size / cohort.users) * 100).toFixed(2)
          : '0',
      totalRevenue: cohort.totalRevenue,
      averageRevenuePerUser:
        cohort.users > 0 ? cohort.totalRevenue / cohort.users : 0,
    }));
  }
}
