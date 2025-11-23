import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, TransactionStatus } from '@prisma/client';
import { AdjustWalletDto } from '../dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AdminWalletsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get wallets with filters
   */
  async getWallets(
    page: number = 1,
    limit: number = 20,
    search?: string,
    minBalance?: number,
    maxBalance?: number,
    isLocked?: boolean,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.WalletWhereInput = {};

    if (isLocked !== undefined) where.isLocked = isLocked;

    if (minBalance !== undefined || maxBalance !== undefined) {
      where.balance = {};
      if (minBalance !== undefined) where.balance.gte = new Decimal(minBalance);
      if (maxBalance !== undefined) where.balance.lte = new Decimal(maxBalance);
    }

    // Search by user's name, email, or phone
    if (search) {
      where.user = {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [wallets, total] = await Promise.all([
      this.prisma.wallet.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              kycTier: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.wallet.count({ where }),
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
   * Get wallet statistics
   */
  async getWalletStats() {
    const [totalWallets, aggregations, lockedCount] = await Promise.all([
      this.prisma.wallet.count(),

      this.prisma.wallet.aggregate({
        _sum: { balance: true },
        _avg: { balance: true },
        _max: { balance: true },
      }),

      this.prisma.wallet.count({
        where: { isLocked: true },
      }),
    ]);

    // Get top 10 wallets by balance
    const topWallets = await this.prisma.wallet.findMany({
      take: 10,
      orderBy: { balance: 'desc' },
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

    return {
      totalWallets,
      totalBalance: aggregations._sum.balance || 0,
      averageBalance: aggregations._avg.balance || 0,
      maxBalance: aggregations._max.balance || 0,
      lockedWallets: lockedCount,
      topWallets,
    };
  }

  /**
   * Get wallet details by user ID
   */
  async getWalletByUserId(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            kycTier: true,
            status: true,
          },
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Get recent transactions
    const recentTransactions = await this.prisma.transaction.findMany({
      where: { userId },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    return {
      wallet,
      recentTransactions,
    };
  }

  /**
   * Adjust wallet balance
   */
  async adjustBalance(
    adminUserId: string,
    userId: string,
    dto: AdjustWalletDto,
  ) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const amount = new Decimal(dto.amount);
    const newBalance =
      dto.type === 'credit'
        ? new Decimal(wallet.balance).plus(amount)
        : new Decimal(wallet.balance).minus(amount);

    if (newBalance.lessThan(0)) {
      throw new Error('Insufficient balance for debit');
    }

    // Perform adjustment in a transaction
    const result = await this.prisma.$transaction(async (prisma) => {
      // Update wallet
      const updatedWallet = await prisma.wallet.update({
        where: { userId },
        data: {
          balance: newBalance,
          ledgerBalance: newBalance,
        },
      });

      // Create transaction record
      const transaction = await prisma.transaction.create({
        data: {
          userId,
          type: dto.type === 'credit' ? 'DEPOSIT' : 'WITHDRAWAL',
          status: TransactionStatus.COMPLETED,
          amount,
          fee: new Decimal(0),
          totalAmount: amount,
          balanceBefore: wallet.balance,
          balanceAfter: newBalance,
          currency: 'NGN',
          description: `Admin ${dto.type} - ${dto.reason}`,
          narration: dto.reason,
          reference: `ADMIN_${dto.type.toUpperCase()}_${Date.now()}`,
          metadata: {
            adjustedBy: adminUserId,
            reason: dto.reason,
            type: dto.type,
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'ADJUST_WALLET_BALANCE',
          resource: 'Wallet',
          resourceId: wallet.id,
          metadata: {
            userId,
            type: dto.type,
            amount: amount.toString(),
            reason: dto.reason,
            previousBalance: wallet.balance.toString(),
            newBalance: newBalance.toString(),
          },
        },
      });

      return {
        wallet: updatedWallet,
        transaction,
      };
    });

    // TODO: Send notification to user

    return result;
  }

  /**
   * Reset spending limits
   */
  async resetLimits(adminUserId: string, userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const updatedWallet = await this.prisma.wallet.update({
      where: { userId },
      data: {
        dailySpent: 0,
        monthlySpent: 0,
        lastResetAt: new Date(),
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'RESET_WALLET_LIMITS',
        resource: 'Wallet',
        resourceId: wallet.id,
        metadata: {
          userId,
          previousDailySpent: wallet.dailySpent.toString(),
          previousMonthlySpent: wallet.monthlySpent.toString(),
        },
      },
    });

    return updatedWallet;
  }
}
