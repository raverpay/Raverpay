import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CircleConfigService } from '../../circle/config/circle.config.service';
import {
  QueryCircleWalletsDto,
  QueryCircleTransactionsDto,
  QueryCCTPTransfersDto,
  QueryWebhookLogsDto,
  CircleAnalyticsDto,
} from './admin-circle.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminCircleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly circleConfig: CircleConfigService,
  ) {}

  /**
   * Get Circle configuration
   */
  async getConfig() {
    return {
      environment: this.circleConfig.environment,
      supportedBlockchains: this.circleConfig.getSupportedBlockchains(),
      defaultBlockchain: this.circleConfig.defaultBlockchain,
      isConfigured: this.circleConfig.isConfigured(),
    };
  }

  /**
   * Get Circle statistics
   */
  async getStats() {
    const [
      totalWalletSets,
      totalWallets,
      totalTransactions,
      totalCCTPTransfers,
      transactionsByState,
      transactionsByType,
      walletsByBlockchain,
      allTransactions,
      lastTransaction,
      lastCCTPTransfer,
    ] = await Promise.all([
      this.prisma.circleWalletSet.count(),
      this.prisma.circleWallet.count(),
      this.prisma.circleTransaction.count(),
      this.prisma.circleCCTPTransfer.count(),
      this.prisma.circleTransaction.groupBy({
        by: ['state'],
        _count: true,
      }),
      this.prisma.circleTransaction.groupBy({
        by: ['type'],
        _count: true,
      }),
      this.prisma.circleWallet.groupBy({
        by: ['blockchain'],
        _count: true,
      }),
      // Get all transactions to calculate volume manually
      this.prisma.circleTransaction.findMany({
        select: {
          amounts: true,
        },
      }),
      this.prisma.circleTransaction.findFirst({
        orderBy: { createdAt: 'desc' },
        include: {
          wallet: true,
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
      this.prisma.circleCCTPTransfer.findFirst({
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
    ]);

    // Calculate total volume from amounts array
    let totalVolume = '0';
    if (allTransactions.length > 0) {
      const sum = allTransactions.reduce((acc, tx) => {
        const amounts = tx.amounts;
        const txSum = amounts.reduce(
          (s, amount) => s + parseFloat(amount || '0'),
          0,
        );
        return acc + txSum;
      }, 0);
      totalVolume = sum.toFixed(2);
    }

    return {
      totalWalletSets,
      totalWallets,
      totalTransactions,
      totalCCTPTransfers,
      transactionsByState: transactionsByState.map((item) => ({
        state: item.state,
        count: item._count,
      })),
      transactionsByType: transactionsByType.map((item) => ({
        type: item.type,
        count: item._count,
      })),
      walletsByBlockchain: walletsByBlockchain.map((item) => ({
        blockchain: item.blockchain,
        count: item._count,
      })),
      totalVolume,
      recentActivity: {
        lastTransaction,
        lastCCTPTransfer,
      },
    };
  }

  /**
   * Get paginated wallets with filters
   */
  async getWallets(query: QueryCircleWalletsDto) {
    const { page = 1, limit = 20, search, blockchain, state } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CircleWalletWhereInput = {};

    if (search) {
      where.OR = [
        { address: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (blockchain) {
      where.blockchain = blockchain;
    }

    if (state) {
      where.state = state;
    }

    const [wallets, total] = await Promise.all([
      this.prisma.circleWallet.findMany({
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
              phone: true,
            },
          },
        },
      }),
      this.prisma.circleWallet.count({ where }),
    ]);

    return {
      data: wallets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get wallet by ID
   */
  async getWalletById(id: string) {
    const wallet = await this.prisma.circleWallet.findUnique({
      where: { id },
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
        circleTransactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Add transaction count
    const transactionCount = await this.prisma.circleTransaction.count({
      where: { walletId: id },
    });

    return {
      ...wallet,
      _count: {
        transactions: transactionCount,
      },
    };
  }

  /**
   * Get wallets by user ID
   */
  async getWalletsByUser(userId: string) {
    const wallets = await this.prisma.circleWallet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return wallets;
  }

  /**
   * Get paginated wallet sets
   */
  async getWalletSets(query: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [walletSets, total] = await Promise.all([
      this.prisma.circleWalletSet.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          circleWallets: {
            take: 5,
          },
        },
      }),
      this.prisma.circleWalletSet.count(),
    ]);

    // Add wallet count for each wallet set
    const walletSetsWithCount = await Promise.all(
      walletSets.map(async (ws) => {
        const walletCount = await this.prisma.circleWallet.count({
          where: { walletSetId: ws.id },
        });
        return {
          ...ws,
          _count: {
            wallets: walletCount,
          },
        };
      }),
    );

    return {
      data: walletSetsWithCount,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get wallet set by ID
   */
  async getWalletSetById(id: string) {
    const walletSet = await this.prisma.circleWalletSet.findUnique({
      where: { id },
      include: {
        circleWallets: true,
      },
    });

    if (!walletSet) {
      throw new NotFoundException('Wallet set not found');
    }

    return walletSet;
  }

  /**
   * Get paginated transactions with filters
   */
  async getTransactions(query: QueryCircleTransactionsDto) {
    const { page = 1, limit = 20, state, type, blockchain, userId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CircleTransactionWhereInput = {};

    if (state) {
      where.state = state;
    }

    // Note: type filter removed because the database uses CircleTransactionType enum
    // (TRANSFER, CONTRACT_EXECUTION, CCTP_BURN, CCTP_MINT)
    // The frontend sends INBOUND/OUTBOUND which don't exist in the enum
    // TODO: Implement direction-based filtering if needed

    if (blockchain) {
      where.blockchain = blockchain;
    }

    if (userId) {
      where.userId = userId;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.circleTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          wallet: true,
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
      this.prisma.circleTransaction.count({ where }),
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
   * Get transaction by ID
   */
  async getTransactionById(id: string) {
    const transaction = await this.prisma.circleTransaction.findUnique({
      where: { id },
      include: {
        wallet: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
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
   * Get paginated CCTP transfers with filters
   */
  async getCCTPTransfers(query: QueryCCTPTransfersDto) {
    const {
      page = 1,
      limit = 20,
      state,
      userId,
      sourceChain,
      destinationChain,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CircleCCTPTransferWhereInput = {};

    if (state) {
      where.state = state;
    }

    if (userId) {
      where.userId = userId;
    }

    if (sourceChain) {
      where.sourceChain = sourceChain;
    }

    if (destinationChain) {
      where.destinationChain = destinationChain;
    }

    const [transfers, total] = await Promise.all([
      this.prisma.circleCCTPTransfer.findMany({
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
      this.prisma.circleCCTPTransfer.count({ where }),
    ]);

    return {
      data: transfers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get CCTP transfer by ID
   */
  async getCCTPTransferById(id: string) {
    const transfer = await this.prisma.circleCCTPTransfer.findUnique({
      where: { id },
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
    });

    if (!transfer) {
      throw new NotFoundException('CCTP transfer not found');
    }

    return transfer;
  }

  /**
   * Get paginated webhook logs
   */
  async getWebhookLogs(query: QueryWebhookLogsDto) {
    const { page = 1, limit = 20, processed, eventType } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CircleWebhookLogWhereInput = {};

    if (processed !== undefined) {
      where.processed = processed;
    }

    if (eventType) {
      where.eventType = eventType;
    }

    const [logs, total] = await Promise.all([
      this.prisma.circleWebhookLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.circleWebhookLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get analytics data
   */
  async getAnalytics(params: CircleAnalyticsDto) {
    const { startDate, endDate, blockchain } = params;

    const where: Prisma.CircleTransactionWhereInput = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    if (blockchain) {
      where.blockchain = blockchain;
    }

    const [byBlockchain, byState, transactions] = await Promise.all([
      this.prisma.circleTransaction.groupBy({
        by: ['blockchain'],
        where,
        _count: true,
      }),
      this.prisma.circleTransaction.groupBy({
        by: ['state'],
        where,
        _count: true,
      }),
      this.prisma.circleTransaction.findMany({
        where,
        select: {
          createdAt: true,
          amounts: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Group transactions by day
    const dailyVolumeMap = new Map<string, { volume: number; count: number }>();
    transactions.forEach((tx) => {
      const date = tx.createdAt.toISOString().split('T')[0];
      const amounts = tx.amounts;
      const volume = amounts.reduce(
        (sum, amount) => sum + parseFloat(amount || '0'),
        0,
      );

      const existing = dailyVolumeMap.get(date) || { volume: 0, count: 0 };
      dailyVolumeMap.set(date, {
        volume: existing.volume + volume,
        count: existing.count + 1,
      });
    });

    const dailyVolume = Array.from(dailyVolumeMap.entries()).map(
      ([date, data]) => ({
        date,
        volume: data.volume.toFixed(2),
        count: data.count,
      }),
    );

    // Calculate volume by blockchain
    const blockchainVolumes = await Promise.all(
      byBlockchain.map(async (item) => {
        const txs = await this.prisma.circleTransaction.findMany({
          where: {
            ...where,
            blockchain: item.blockchain,
          },
          select: {
            amounts: true,
          },
        });

        const volume = txs.reduce((acc, tx) => {
          const amounts = tx.amounts;
          return (
            acc +
            amounts.reduce((s, amount) => s + parseFloat(amount || '0'), 0)
          );
        }, 0);

        return {
          blockchain: item.blockchain,
          volume: volume.toFixed(2),
          count: item._count,
        };
      }),
    );

    return {
      dailyVolume,
      byBlockchain: blockchainVolumes,
      byState: byState.map((item) => ({
        state: item.state,
        count: item._count,
      })),
    };
  }

  /**
   * Get fee analytics data for analytics dashboard
   */
  async getFeeAnalytics(params: CircleAnalyticsDto) {
    const { startDate, endDate, blockchain } = params;

    const where: Prisma.CircleTransactionWhereInput = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    if (blockchain) {
      where.blockchain = blockchain;
    }

    // Get transactions with fee info
    const transactions = await this.prisma.circleTransaction.findMany({
      where,
      select: {
        id: true,
        reference: true,
        amounts: true,
        blockchain: true,
        state: true,
        serviceFee: true,
        networkFee: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate totals
    let totalFeesCollected = 0;
    let totalTransactions = 0;
    let confirmedCount = 0;

    const dailyFeesMap = new Map<string, { fees: number; count: number }>();
    const blockchainFeesMap = new Map<string, { fees: number; count: number; confirmed: number }>();

    transactions.forEach((tx) => {
      const fee = parseFloat(tx.serviceFee || '0');
      totalFeesCollected += fee;
      totalTransactions++;

      if (tx.state === 'CONFIRMED' || tx.state === 'COMPLETE') {
        confirmedCount++;
      }

      // Daily aggregation
      const date = tx.createdAt.toISOString().split('T')[0];
      const existing = dailyFeesMap.get(date) || { fees: 0, count: 0 };
      dailyFeesMap.set(date, {
        fees: existing.fees + fee,
        count: existing.count + 1,
      });

      // Blockchain aggregation
      const bcData = blockchainFeesMap.get(tx.blockchain) || { fees: 0, count: 0, confirmed: 0 };
      blockchainFeesMap.set(tx.blockchain, {
        fees: bcData.fees + fee,
        count: bcData.count + 1,
        confirmed: bcData.confirmed + (tx.state === 'CONFIRMED' || tx.state === 'COMPLETE' ? 1 : 0),
      });
    });

    const averageFee = totalTransactions > 0 ? totalFeesCollected / totalTransactions : 0;
    const successRate = totalTransactions > 0 ? (confirmedCount / totalTransactions) * 100 : 0;

    // Estimate gas (very rough estimate for testnet, assuming ~$0.01 per tx for L2)
    const totalGasEstimate = totalTransactions * 0.01;
    const netProfit = totalFeesCollected - totalGasEstimate;

    const dailyFees = Array.from(dailyFeesMap.entries())
      .map(([date, data]) => ({
        date,
        feesCollected: data.fees.toFixed(4),
        transactionCount: data.count,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const feesByBlockchain = Array.from(blockchainFeesMap.entries()).map(([bc, data]) => ({
      blockchain: bc,
      feesCollected: data.fees.toFixed(4),
      transactionCount: data.count,
      averageFee: data.count > 0 ? (data.fees / data.count).toFixed(4) : '0.00',
      successRate: data.count > 0 ? ((data.confirmed / data.count) * 100).toFixed(1) : '0',
    }));

    const recentTransactions = transactions.slice(0, 10).map((tx) => ({
      id: tx.id,
      reference: tx.reference,
      amount: tx.amounts[0] || '0',
      feeAmount: tx.serviceFee || '0',
      blockchain: tx.blockchain,
      state: tx.state,
      createdAt: tx.createdAt.toISOString(),
    }));

    return {
      period: {
        startDate: startDate || 'all',
        endDate: endDate || 'all',
        blockchain: blockchain || 'all',
      },
      summary: {
        totalFeesCollected: totalFeesCollected.toFixed(4),
        totalTransactions,
        averageFeePerTransaction: averageFee.toFixed(4),
        feeCollectionSuccessRate: successRate.toFixed(1),
        totalGasEstimate: totalGasEstimate.toFixed(4),
        netProfit: netProfit.toFixed(4),
      },
      feesByBlockchain,
      dailyFees,
      recentTransactions,
    };
  }

  /**
   * Get paginated Circle users with filters
   */
  async getCircleUsers(query: {
    page?: number;
    limit?: number;
    search?: string;
    authMethod?: string;
    status?: string;
  }) {
    const { page = 1, limit = 20, search, authMethod, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CircleUserWhereInput = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { circleUserId: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (authMethod) {
      where.authMethod = authMethod;
    }

    if (status) {
      where.status = status;
    }

    const [users, total] = await Promise.all([
      this.prisma.circleUser.findMany({
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
          _count: {
            select: {
              wallets: true,
            },
          },
        },
      }),
      this.prisma.circleUser.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get Circle user by ID
   */
  async getCircleUserById(id: string) {
    const user = await this.prisma.circleUser.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        wallets: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Circle user not found');
    }

    return user;
  }

  /**
   * Get Circle users statistics
   */
  async getCircleUsersStats() {
    const [
      totalUsers,
      emailAuthUsers,
      pinAuthUsers,
      socialAuthUsers,
      activeUsers,
    ] = await Promise.all([
      this.prisma.circleUser.count(),
      this.prisma.circleUser.count({ where: { authMethod: 'EMAIL' } }),
      this.prisma.circleUser.count({ where: { authMethod: 'PIN' } }),
      this.prisma.circleUser.count({ where: { authMethod: 'SOCIAL' } }),
      this.prisma.circleUser.count({ where: { status: 'ENABLED' } }),
    ]);

    return {
      totalUsers,
      emailAuthUsers,
      pinAuthUsers,
      socialAuthUsers,
      activeUsers,
    };
  }

  /**
   * Get paginated modular wallets with filters
   */
  async getModularWallets(query: {
    page?: number;
    limit?: number;
    search?: string;
    blockchain?: string;
  }) {
    const { page = 1, limit = 20, search, blockchain } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CircleModularWalletWhereInput = {};

    if (search) {
      where.OR = [
        { address: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (blockchain) {
      where.blockchain = blockchain;
    }

    const [wallets, total] = await Promise.all([
      this.prisma.circleModularWallet.findMany({
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
      this.prisma.circleModularWallet.count({ where }),
    ]);

    return {
      data: wallets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get modular wallet by ID
   */
  async getModularWalletById(id: string) {
    const wallet = await this.prisma.circleModularWallet.findUnique({
      where: { id },
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
    });

    if (!wallet) {
      throw new NotFoundException('Modular wallet not found');
    }

    return wallet;
  }

  /**
   * Get passkey credentials for a modular wallet
   */
  async getModularWalletPasskeys(walletId: string) {
    // First verify the wallet exists
    const wallet = await this.prisma.circleModularWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException('Modular wallet not found');
    }

    // Get all passkeys for the user who owns this wallet
    const passkeys = await this.prisma.passkeyCredential.findMany({
      where: { userId: wallet.userId },
      orderBy: { createdAt: 'desc' },
    });

    return passkeys;
  }

  /**
   * Get modular wallet statistics
   */
  async getModularWalletStats() {
    const [totalWallets, totalPasskeys, walletsByBlockchain] =
      await Promise.all([
        this.prisma.circleModularWallet.count(),
        this.prisma.passkeyCredential.count(),
        this.prisma.circleModularWallet.groupBy({
          by: ['blockchain'],
          _count: true,
        }),
      ]);

    return {
      totalWallets,
      totalPasskeys,
      totalTransactions: 0, // TODO: Implement when we track modular wallet transactions
      walletsByBlockchain: walletsByBlockchain.map((item) => ({
        blockchain: item.blockchain,
        count: item._count,
      })),
    };
  }

  // ==========================================
  // Blockchain Configuration Management
  // ==========================================

  /**
   * Get all blockchain configurations
   */
  async getBlockchainConfigs() {
    const configs = await this.prisma.blockchainConfig.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    return configs;
  }

  /**
   * Get blockchain configuration by identifier
   */
  async getBlockchainConfig(blockchain: string) {
    const config = await this.prisma.blockchainConfig.findUnique({
      where: { blockchain },
    });

    if (!config) {
      throw new NotFoundException(`Blockchain config for ${blockchain} not found`);
    }

    return config;
  }

  /**
   * Update blockchain configuration
   */
  async updateBlockchainConfig(
    blockchain: string,
    updates: {
      name?: string;
      symbol?: string;
      isEnabled?: boolean;
      isTestnet?: boolean;
      feeLabel?: string;
      estimatedCost?: string;
      description?: string;
      isRecommended?: boolean;
      displayOrder?: number;
      isCCTPSupported?: boolean;
    },
  ) {
    const config = await this.prisma.blockchainConfig.update({
      where: { blockchain },
      data: updates,
    });

    return config;
  }

  /**
   * Enable a blockchain
   */
  async enableBlockchain(blockchain: string) {
    await this.prisma.blockchainConfig.update({
      where: { blockchain },
      data: { isEnabled: true },
    });
  }

  /**
   * Disable a blockchain
   */
  async disableBlockchain(blockchain: string) {
    await this.prisma.blockchainConfig.update({
      where: { blockchain },
      data: { isEnabled: false },
    });
  }
}
