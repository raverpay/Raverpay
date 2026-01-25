import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AlchemyWalletState,
  AlchemyTransactionState,
  AlchemyAccountType,
} from '@prisma/client';

/**
 * Alchemy Admin Service
 *
 * Provides analytics, monitoring, and management capabilities
 * for admin dashboard
 *
 * ⚠️ All methods should be protected by admin authentication guards
 */
@Injectable()
export class AlchemyAdminService {
  private readonly logger = new Logger(AlchemyAdminService.name);

  constructor(private readonly prisma: PrismaService) {
    this.logger.log('Alchemy Admin service initialized');
  }

  /**
   * Get platform-wide statistics
   */
  async getPlatformStats() {
    const [
      totalWallets,
      activeWallets,
      eoaWallets,
      smartAccountWallets,
      totalTransactions,
      completedTransactions,
      failedTransactions,
      totalUsers,
      gasSponsored,
    ] = await Promise.all([
      this.prisma.alchemyWallet.count(),
      this.prisma.alchemyWallet.count({
        where: { state: AlchemyWalletState.ACTIVE },
      }),
      this.prisma.alchemyWallet.count({
        where: { accountType: AlchemyAccountType.EOA },
      }),
      this.prisma.alchemyWallet.count({
        where: { accountType: AlchemyAccountType.SMART_CONTRACT },
      }),
      this.prisma.alchemyTransaction.count(),
      this.prisma.alchemyTransaction.count({
        where: { state: AlchemyTransactionState.COMPLETED },
      }),
      this.prisma.alchemyTransaction.count({
        where: { state: AlchemyTransactionState.FAILED },
      }),
      this.prisma.alchemyWallet.groupBy({
        by: ['userId'],
        _count: true,
      }),
      this.prisma.alchemyWallet.count({ where: { isGasSponsored: true } }),
    ]);

    const successRate =
      totalTransactions > 0
        ? ((completedTransactions / totalTransactions) * 100).toFixed(2)
        : '0';

    const smartAccountAdoptionRate =
      totalWallets > 0
        ? ((smartAccountWallets / totalWallets) * 100).toFixed(2)
        : '0';

    return {
      wallets: {
        total: totalWallets,
        active: activeWallets,
        inactive: totalWallets - activeWallets,
        eoa: eoaWallets,
        smartAccount: smartAccountWallets,
        gasSponsored,
        smartAccountAdoptionRate: `${smartAccountAdoptionRate}%`,
      },
      transactions: {
        total: totalTransactions,
        completed: completedTransactions,
        failed: failedTransactions,
        pending:
          totalTransactions - completedTransactions - failedTransactions,
        successRate: `${successRate}%`,
      },
      users: {
        total: totalUsers.length,
        withWallets: totalUsers.length,
        averageWalletsPerUser: (totalWallets / (totalUsers.length || 1)).toFixed(
          2,
        ),
      },
    };
  }

  /**
   * Get gas spending analytics
   */
  async getGasSpendingAnalytics(params: {
    startDate?: Date;
    endDate?: Date;
    blockchain?: string;
  }) {
    const { startDate, endDate, blockchain } = params;

    const where: any = {};

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    if (blockchain) {
      where.blockchain = blockchain;
    }

    const gasSpending = await this.prisma.alchemyGasSpending.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 100,
    });

    // Aggregate by blockchain
    const byBlockchain = gasSpending.reduce((acc, record) => {
      if (!acc[record.blockchain]) {
        acc[record.blockchain] = {
          blockchain: record.blockchain,
          totalTransactions: 0,
          totalGasUsed: BigInt(0),
          totalGasUsd: 0,
        };
      }
      acc[record.blockchain].totalTransactions += record.transactionCount;
      acc[record.blockchain].totalGasUsed += BigInt(record.totalGasUsed);
      acc[record.blockchain].totalGasUsd += parseFloat(
        record.totalGasUsd || '0',
      );
      return acc;
    }, {});

    // Calculate totals
    const totals = Object.values(byBlockchain).reduce(
      (acc: any, curr: any) => ({
        totalTransactions: acc.totalTransactions + curr.totalTransactions,
        totalGasUsd: acc.totalGasUsd + curr.totalGasUsd,
      }),
      { totalTransactions: 0, totalGasUsd: 0 },
    );

    return {
      byBlockchain: Object.values(byBlockchain),
      totals: {
        ...totals,
        totalGasUsd: `$${totals.totalGasUsd.toFixed(2)}`,
        averagePerTransaction:
          totals.totalTransactions > 0
            ? `$${(totals.totalGasUsd / totals.totalTransactions).toFixed(4)}`
            : '$0',
      },
      recordCount: gasSpending.length,
    };
  }

  /**
   * Get recent transactions with pagination
   */
  async getRecentTransactions(params: {
    limit?: number;
    offset?: number;
    state?: AlchemyTransactionState;
    userId?: string;
  }) {
    const { limit = 50, offset = 0, state, userId } = params;

    const where: any = {};
    if (state) where.state = state;
    if (userId) where.userId = userId;

    const [transactions, total] = await Promise.all([
      this.prisma.alchemyTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          wallet: {
            select: {
              id: true,
              address: true,
              blockchain: true,
              network: true,
              accountType: true,
            },
          },
        },
      }),
      this.prisma.alchemyTransaction.count({ where }),
    ]);

    return {
      transactions: transactions.map((tx) => ({
        id: tx.id,
        reference: tx.reference,
        userId: tx.userId,
        type: tx.type,
        state: tx.state,
        amount: tx.amountFormatted,
        transactionHash: tx.transactionHash,
        blockchain: tx.blockchain,
        network: tx.network,
        gasUsed: tx.gasUsed,
        createdAt: tx.createdAt,
        completedAt: tx.completedAt,
        wallet: tx.wallet,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Get user wallets overview
   */
  async getUserWalletsOverview(userId: string) {
    const wallets = await this.prisma.alchemyWallet.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });

    const transactions = await this.prisma.alchemyTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      userId,
      wallets: wallets.map((w) => ({
        id: w.id,
        address: w.address,
        blockchain: w.blockchain,
        network: w.network,
        accountType: w.accountType,
        state: w.state,
        isGasSponsored: w.isGasSponsored,
        transactionCount: w._count.transactions,
        createdAt: w.createdAt,
      })),
      recentTransactions: transactions.map((tx) => ({
        id: tx.id,
        reference: tx.reference,
        type: tx.type,
        state: tx.state,
        amount: tx.amountFormatted,
        createdAt: tx.createdAt,
      })),
      summary: {
        totalWallets: wallets.length,
        eoaWallets: wallets.filter((w) => w.accountType === AlchemyAccountType.EOA)
          .length,
        smartAccounts: wallets.filter(
          (w) => w.accountType === AlchemyAccountType.SMART_CONTRACT,
        ).length,
        activeWallets: wallets.filter(
          (w) => w.state === AlchemyWalletState.ACTIVE,
        ).length,
      },
    };
  }

  /**
   * Get blockchain network statistics
   */
  async getNetworkStats() {
    const wallets = await this.prisma.alchemyWallet.groupBy({
      by: ['blockchain', 'network'],
      _count: true,
      where: {
        state: AlchemyWalletState.ACTIVE,
      },
    });

    const transactions = await this.prisma.alchemyTransaction.groupBy({
      by: ['blockchain', 'network', 'state'],
      _count: true,
    });

    // Group by network
    const networkStats = {};

    wallets.forEach((w) => {
      const key = `${w.blockchain}-${w.network}`;
      if (!networkStats[key]) {
        networkStats[key] = {
          blockchain: w.blockchain,
          network: w.network,
          wallets: 0,
          transactions: {
            total: 0,
            completed: 0,
            failed: 0,
            pending: 0,
          },
        };
      }
      networkStats[key].wallets = w._count;
    });

    transactions.forEach((tx) => {
      const key = `${tx.blockchain}-${tx.network}`;
      if (!networkStats[key]) {
        networkStats[key] = {
          blockchain: tx.blockchain,
          network: tx.network,
          wallets: 0,
          transactions: {
            total: 0,
            completed: 0,
            failed: 0,
            pending: 0,
          },
        };
      }
      networkStats[key].transactions.total += tx._count;
      if (tx.state === AlchemyTransactionState.COMPLETED) {
        networkStats[key].transactions.completed += tx._count;
      } else if (tx.state === AlchemyTransactionState.FAILED) {
        networkStats[key].transactions.failed += tx._count;
      } else {
        networkStats[key].transactions.pending += tx._count;
      }
    });

    return {
      networks: Object.values(networkStats),
      totalNetworks: Object.keys(networkStats).length,
    };
  }

  /**
   * Get security alerts
   */
  async getSecurityAlerts(params: { limit?: number; daysBack?: number }) {
    const { limit = 50, daysBack = 7 } = params;

    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    // Get compromised/locked wallets
    const compromisedWallets = await this.prisma.alchemyWallet.findMany({
      where: {
        OR: [
          { state: AlchemyWalletState.COMPROMISED },
          { state: AlchemyWalletState.LOCKED },
        ],
        updatedAt: { gte: since },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    // Get failed transactions (potential issues)
    const failedTransactions = await this.prisma.alchemyTransaction.findMany({
      where: {
        state: AlchemyTransactionState.FAILED,
        failedAt: { gte: since },
      },
      orderBy: { failedAt: 'desc' },
      take: limit,
    });

    return {
      compromisedWallets: compromisedWallets.map((w) => ({
        id: w.id,
        address: w.address,
        userId: w.userId,
        state: w.state,
        blockchain: w.blockchain,
        network: w.network,
        updatedAt: w.updatedAt,
        severity: w.state === AlchemyWalletState.COMPROMISED ? 'HIGH' : 'MEDIUM',
      })),
      failedTransactions: failedTransactions.map((tx) => ({
        id: tx.id,
        reference: tx.reference,
        userId: tx.userId,
        errorMessage: tx.errorMessage,
        blockchain: tx.blockchain,
        network: tx.network,
        failedAt: tx.failedAt,
        severity: 'LOW',
      })),
      summary: {
        compromisedWallets: compromisedWallets.length,
        lockedWallets: compromisedWallets.filter(
          (w) => w.state === AlchemyWalletState.LOCKED,
        ).length,
        failedTransactions: failedTransactions.length,
        totalAlerts:
          compromisedWallets.length + failedTransactions.length,
      },
    };
  }

  /**
   * Get system health status
   */
  async getSystemHealth() {
    const [recentTransactions, pendingCount, failedCount] = await Promise.all([
      this.prisma.alchemyTransaction.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
          },
        },
      }),
      this.prisma.alchemyTransaction.count({
        where: { state: AlchemyTransactionState.PENDING },
      }),
      this.prisma.alchemyTransaction.count({
        where: {
          state: AlchemyTransactionState.FAILED,
          failedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
          },
        },
      }),
    ]);

    const successRate =
      recentTransactions.length > 0
        ? (
            (recentTransactions.filter(
              (tx) => tx.state === AlchemyTransactionState.COMPLETED,
            ).length /
              recentTransactions.length) *
            100
          ).toFixed(2)
        : '100';

    // Determine health status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    const issues: string[] = [];

    if (parseFloat(successRate) < 90) {
      status = 'warning';
      issues.push(`Low success rate: ${successRate}%`);
    }

    if (pendingCount > 100) {
      status = 'warning';
      issues.push(`High pending count: ${pendingCount}`);
    }

    if (failedCount > 50) {
      status = 'critical';
      issues.push(`High failure count in last 24h: ${failedCount}`);
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      metrics: {
        transactionsLastHour: recentTransactions.length,
        successRate: `${successRate}%`,
        pendingTransactions: pendingCount,
        failedLast24h: failedCount,
      },
      issues,
    };
  }
}
