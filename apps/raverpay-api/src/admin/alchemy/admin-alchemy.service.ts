import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  QueryAlchemyWalletsDto,
  QueryAlchemyTransactionsDto,
  QueryGasSpendingDto,
} from './admin-alchemy.dto';

@Injectable()
export class AdminAlchemyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get overall Alchemy statistics
   */
  async getStats() {
    const [
      totalWallets,
      totalTransactions,
      allGasSpending,
      activeWallets,
      pendingTransactions,
      completedTransactions,
      failedTransactions,
    ] = await Promise.all([
      this.prisma.alchemyWallet.count(),
      this.prisma.alchemyTransaction.count(),
      this.prisma.alchemyGasSpending.findMany({
        select: { totalGasUsed: true },
      }),
      this.prisma.alchemyWallet.count({
        where: { state: 'ACTIVE' },
      }),
      this.prisma.alchemyTransaction.count({
        where: { state: 'PENDING' },
      }),
      this.prisma.alchemyTransaction.count({
        where: { state: 'COMPLETED' },
      }),
      this.prisma.alchemyTransaction.count({
        where: { state: 'FAILED' },
      }),
    ]);

    // Calculate total gas spent (sum string values)
    const totalGasSpent = allGasSpending
      .reduce((sum, item) => sum + BigInt(item.totalGasUsed || '0'), BigInt(0))
      .toString();

    // Get wallets by blockchain
    const walletsByBlockchain = await this.prisma.alchemyWallet.groupBy({
      by: ['blockchain'],
      _count: true,
    });

    // Get wallets by network
    const walletsByNetwork = await this.prisma.alchemyWallet.groupBy({
      by: ['network'],
      _count: true,
    });

    // Get transactions by state
    const transactionsByState = await this.prisma.alchemyTransaction.groupBy({
      by: ['state'],
      _count: true,
    });

    return {
      totalWallets,
      totalTransactions,
      totalGasSpent,
      activeWallets,
      pendingTransactions,
      completedTransactions,
      failedTransactions,
      walletsByBlockchain: walletsByBlockchain.map((item) => ({
        blockchain: item.blockchain,
        count: item._count,
      })),
      walletsByNetwork: walletsByNetwork.map((item) => ({
        network: item.network,
        count: item._count,
      })),
      transactionsByState: transactionsByState.map((item) => ({
        state: item.state,
        count: item._count,
      })),
    };
  }

  /**
   * Get paginated wallets with filters
   */
  async getWallets(query: QueryAlchemyWalletsDto) {
    const {
      page = 1,
      limit = 20,
      search,
      blockchain,
      network,
      accountType,
      state,
      userId,
    } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (blockchain) where.blockchain = blockchain;
    if (network) where.network = network;
    if (accountType) where.accountType = accountType;
    if (state) where.state = state;
    if (userId) where.userId = userId;

    const [wallets, total] = await Promise.all([
      this.prisma.alchemyWallet.findMany({
        where,
        skip,
        take: limit,
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
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.alchemyWallet.count({ where }),
    ]);

    return {
      data: wallets.map((w) => this.serializeBigInt(w)),
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
    const wallet = await this.prisma.alchemyWallet.findUnique({
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
        alchemyTransactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${id} not found`);
    }

    return this.serializeBigInt(wallet);
  }

  /**
   * Get wallets by user ID
   */
  async getWalletsByUser(userId: string) {
    const wallets = await this.prisma.alchemyWallet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return wallets.map((w) => this.serializeBigInt(w));
  }

  /**
   * Get paginated transactions with filters
   */
  async getTransactions(query: QueryAlchemyTransactionsDto) {
    const {
      page = 1,
      limit = 20,
      search,
      state,
      type,
      blockchain,
      network,
      userId,
      walletId,
    } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { transactionHash: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (state) where.state = state;
    if (type) where.type = type;
    if (blockchain) where.blockchain = blockchain;
    if (network) where.network = network;
    if (userId) where.userId = userId;
    if (walletId) where.walletId = walletId;

    const [transactions, total] = await Promise.all([
      this.prisma.alchemyTransaction.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          wallet: {
            select: {
              id: true,
              address: true,
              blockchain: true,
              network: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.alchemyTransaction.count({ where }),
    ]);

    return {
      data: transactions.map((t) => this.serializeBigInt(t)),
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
    const transaction = await this.prisma.alchemyTransaction.findUnique({
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
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return this.serializeBigInt(transaction);
  }

  /**
   * Get gas spending analytics with date range
   */
  async getGasSpending(query: QueryGasSpendingDto) {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      userId,
      blockchain,
      network,
    } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    if (userId) where.userId = userId;
    if (blockchain) where.blockchain = blockchain;
    if (network) where.network = network;

    const [gasSpending, total] = await Promise.all([
      this.prisma.alchemyGasSpending.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      this.prisma.alchemyGasSpending.count({ where }),
    ]);

    // Calculate summary stats manually (since totalGasUsed is a string)
    const allRecords = await this.prisma.alchemyGasSpending.findMany({
      where,
      select: {
        totalGasUsed: true,
        transactionCount: true,
      },
    });

    const totalGasUsed = allRecords
      .reduce((sum, item) => sum + BigInt(item.totalGasUsed || '0'), BigInt(0))
      .toString();

    const totalTransactions = allRecords.reduce(
      (sum, item) => sum + item.transactionCount,
      0,
    );

    return {
      data: gasSpending.map((r) => this.serializeBigInt(r)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalGasUsed,
        totalTransactions,
      },
    };
  }

  /**
   * Get gas spending by user
   */
  async getGasSpendingByUser(userId: string) {
    const records = await this.prisma.alchemyGasSpending.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
    return records.map((r) => this.serializeBigInt(r));
  }

  /**
   * Recursively convert BigInt values to string for JSON serialization
   */
  private serializeBigInt(obj: any): any {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'bigint') {
      return obj.toString();
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.serializeBigInt(item));
    }

    if (typeof obj === 'object') {
      // Handle Date objects
      if (obj instanceof Date) {
        return obj;
      }

      const serializedObj: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          serializedObj[key] = this.serializeBigInt(obj[key]);
        }
      }
      return serializedObj;
    }

    return obj;
  }
}
