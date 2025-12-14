import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, TransactionStatus } from '@prisma/client';
import { AdjustWalletDto } from '../dto';
import { Decimal } from '@prisma/client/runtime/library';
import { NotificationDispatcherService } from '../../notifications/notification-dispatcher.service';
import { WalletService } from '../../wallet/wallet.service';

@Injectable()
export class AdminWalletsService {
  constructor(
    private prisma: PrismaService,
    private notificationDispatcher: NotificationDispatcherService,
    private walletService: WalletService,
  ) {}

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
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        userId,
        type: 'NAIRA',
      },
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
    const amount = new Decimal(dto.amount);

    // Perform adjustment in a transaction with pessimistic locking and serializable isolation
    const maxRetries = 3;
    let retryCount = 0;
    let result: { wallet: any; transaction: any; walletId: string } | undefined;

    while (retryCount < maxRetries) {
      try {
        result = await this.prisma.$transaction(
          async (tx) => {
            // Lock wallet with SELECT FOR UPDATE
            const walletRows = await tx.$queryRaw<
              Array<{ id: string; balance: Decimal; ledgerBalance: Decimal }>
            >`
              SELECT id, balance, "ledgerBalance"
              FROM "wallets"
              WHERE "userId" = ${userId} AND type = 'NAIRA'
              FOR UPDATE
            `;

            if (!walletRows || walletRows.length === 0) {
              throw new NotFoundException('Wallet not found');
            }

            const wallet = walletRows[0];
            const balanceBefore = new Decimal(wallet.balance.toString());
            const balanceAfter =
              dto.type === 'credit'
                ? balanceBefore.plus(amount)
                : balanceBefore.minus(amount);

            // Check balance inside transaction
            if (balanceAfter.lessThan(0)) {
              throw new BadRequestException(
                `Insufficient balance for debit. Current balance: ₦${balanceBefore.toFixed(2)}, Required: ₦${amount.toFixed(2)}`,
              );
            }

            // Update wallet
            const updatedWallet = await tx.wallet.update({
              where: {
                userId_type: {
                  userId,
                  type: 'NAIRA',
                },
              },
              data: {
                balance: balanceAfter,
                ledgerBalance: balanceAfter,
              },
            });

            // Create transaction record
            const transaction = await tx.transaction.create({
              data: {
                userId,
                type: dto.type === 'credit' ? 'DEPOSIT' : 'WITHDRAWAL',
                status: TransactionStatus.COMPLETED,
                amount,
                fee: new Decimal(0),
                totalAmount: amount,
                balanceBefore,
                balanceAfter,
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
            await tx.auditLog.create({
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
                  previousBalance: balanceBefore.toString(),
                  newBalance: balanceAfter.toString(),
                },
              },
            });

            return {
              wallet: updatedWallet,
              transaction,
              walletId: wallet.id,
            };
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            maxWait: 10000, // 10 seconds
            timeout: 20000, // 20 seconds
          },
        );

        // Success, break out of retry loop
        break;
      } catch (error: any) {
        // Check if it's a serialization conflict
        if (
          error.code === 'P2010' ||
          error.code === '40001' ||
          (error.message && error.message.includes('serialization'))
        ) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw new BadRequestException(
              'Transaction conflict. Please try again.',
            );
          }
          // Exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, retryCount) * 100),
          );
          continue;
        }
        // Not a serialization conflict, throw immediately
        throw error;
      }
    }

    if (!result) {
      throw new BadRequestException(
        'Failed to adjust wallet balance after retries.',
      );
    }

    // Invalidate wallet cache after successful transaction
    await this.walletService.invalidateWalletCache(userId);
    await this.walletService.invalidateTransactionCache(userId);

    // TODO: Send notification to user

    return {
      wallet: result.wallet,
      transaction: result.transaction,
    };
  }

  /**
   * Lock a wallet
   */
  async lockWallet(adminUserId: string, userId: string, reason: string) {
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        userId,
        type: 'NAIRA',
      },
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
      throw new NotFoundException('Wallet not found');
    }

    const updatedWallet = await this.prisma.wallet.update({
      where: {
        userId_type: {
          userId,
          type: 'NAIRA',
        },
      },
      data: {
        isLocked: true,
        lockedReason: reason,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'LOCK_WALLET',
        resource: 'Wallet',
        resourceId: wallet.id,
        metadata: {
          userId,
          reason,
          lockedBy: adminUserId,
        },
      },
    });

    // Send notification to user about wallet lock
    await this.notificationDispatcher.sendNotification({
      userId,
      eventType: 'wallet_locked_admin',
      category: 'SECURITY',
      channels: ['EMAIL', 'PUSH', 'IN_APP'],
      title: 'Wallet Locked',
      message: `Your wallet has been locked by an administrator. ${reason}`,
      data: {
        reason,
      },
    });

    return updatedWallet;
  }

  /**
   * Unlock a wallet
   */
  async unlockWallet(adminUserId: string, userId: string, reason: string) {
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        userId,
        type: 'NAIRA',
      },
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
      throw new NotFoundException('Wallet not found');
    }

    if (!wallet.isLocked) {
      throw new Error('Wallet is not locked');
    }

    const updatedWallet = await this.prisma.wallet.update({
      where: {
        userId_type: {
          userId,
          type: 'NAIRA',
        },
      },
      data: {
        isLocked: false,
        lockedReason: null,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'UNLOCK_WALLET',
        resource: 'Wallet',
        resourceId: wallet.id,
        metadata: {
          userId,
          reason,
          previousLockReason: wallet.lockedReason,
          unlockedBy: adminUserId,
        },
      },
    });

    // Send notification to user about wallet unlock
    await this.notificationDispatcher.sendNotification({
      userId,
      eventType: 'wallet_unlocked_admin',
      category: 'SECURITY',
      channels: ['EMAIL', 'PUSH', 'IN_APP'],
      title: 'Wallet Unlocked',
      message: reason,
      data: {
        reason,
      },
    });

    return updatedWallet;
  }

  /**
   * Reset spending limits
   */
  async resetLimits(adminUserId: string, userId: string) {
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        userId,
        type: 'NAIRA',
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const updatedWallet = await this.prisma.wallet.update({
      where: {
        userId_type: {
          userId,
          type: 'NAIRA',
        },
      },
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
