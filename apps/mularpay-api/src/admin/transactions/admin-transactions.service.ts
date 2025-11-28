import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryTransactionsDto, ReverseTransactionDto } from '../dto';
import { Prisma, TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { NotificationDispatcherService } from '../../notifications/notification-dispatcher.service';
import { TransactionsService } from '../../transactions/transactions.service';
import {
  CreateWithdrawalConfigDto,
  UpdateWithdrawalConfigDto,
} from '../../transactions/dto';

@Injectable()
export class AdminTransactionsService {
  private readonly logger = new Logger(AdminTransactionsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationDispatcher: NotificationDispatcherService,
    @Inject(forwardRef(() => TransactionsService))
    private transactionsService: TransactionsService,
  ) {}

  /**
   * Get paginated list of transactions with filters
   */
  async getTransactions(query: QueryTransactionsDto) {
    const {
      page = 1,
      limit = 20,
      search,
      userId,
      type,
      status,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      provider,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.TransactionWhereInput = {};

    if (userId) where.userId = userId;
    if (type) where.type = type;
    if (status) where.status = status;
    if (provider) where.provider = provider;

    if (minAmount !== undefined || maxAmount !== undefined) {
      where.amount = {};
      if (minAmount !== undefined) where.amount.gte = new Decimal(minAmount);
      if (maxAmount !== undefined) where.amount.lte = new Decimal(maxAmount);
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Search by user name, email, reference, or description
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { narration: { contains: search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    // Get transactions and total count
    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
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
            },
          },
        },
      }),
      this.prisma.transaction.count({ where }),
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
   * Get transaction statistics
   */
  async getTransactionStats(startDate?: string, endDate?: string) {
    const where: Prisma.TransactionWhereInput = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [totalCount, byType, byStatus, aggregations] = await Promise.all([
      // Total transaction count
      this.prisma.transaction.count({ where }),

      // By type
      this.prisma.transaction.groupBy({
        by: ['type'],
        where,
        _count: true,
        _sum: {
          amount: true,
        },
      }),

      // By status
      this.prisma.transaction.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),

      // Aggregations
      this.prisma.transaction.aggregate({
        where,
        _sum: {
          amount: true,
          fee: true,
        },
        _avg: {
          amount: true,
        },
      }),
    ]);

    const successCount =
      byStatus.find((s) => s.status === TransactionStatus.COMPLETED)?._count ||
      0;
    const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;

    return {
      totalCount,
      totalVolume: aggregations._sum.amount || 0,
      totalFees: aggregations._sum.fee || 0,
      averageAmount: aggregations._avg.amount || 0,
      successRate: successRate.toFixed(2),
      byType: byType.map((item) => ({
        type: item.type,
        count: item._count,
        volume: item._sum.amount || 0,
      })),
      byStatus: byStatus.map((item) => ({
        status: item.status,
        count: item._count,
      })),
    };
  }

  /**
   * Get single transaction details
   */
  async getTransactionById(transactionId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
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
   * Get transaction by reference
   */
  async getTransactionByReference(reference: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { reference },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
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
   * Get pending transactions
   */
  async getPendingTransactions(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          status: TransactionStatus.PENDING,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
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
      this.prisma.transaction.count({
        where: { status: TransactionStatus.PENDING },
      }),
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
   * Get failed transactions
   */
  async getFailedTransactions(
    page: number = 1,
    limit: number = 20,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {
      status: TransactionStatus.FAILED,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
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
      this.prisma.transaction.count({ where }),
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
   * Reverse a transaction
   */
  async reverseTransaction(
    adminUserId: string,
    transactionId: string,
    dto: ReverseTransactionDto,
  ) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { user: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Check if transaction can be reversed
    if (transaction.status !== TransactionStatus.COMPLETED) {
      throw new BadRequestException(
        'Only completed transactions can be reversed',
      );
    }

    // Note: TransactionStatus.REVERSED check removed as enum doesn't have REVERSED value
    // The status is set to REVERSED but we check it before this point

    // Perform reversal in a transaction
    const result = await this.prisma.$transaction(async (prisma) => {
      // Update original transaction status
      const updatedTransaction = await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: TransactionStatus.REVERSED },
      });

      // Get current wallet balance
      const wallet = await prisma.wallet.findFirst({
        where: { userId: transaction.userId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const newBalance = new Decimal(wallet.balance).plus(
        transaction.totalAmount,
      );

      // Update wallet balance
      await prisma.wallet.update({
        where: {
          userId_type: {
            userId: transaction.userId,
            type: 'NAIRA'
          }
        },
        data: {
          balance: newBalance,
          ledgerBalance: newBalance,
        },
      });

      // Create reversal transaction
      const reversalTransaction = await prisma.transaction.create({
        data: {
          userId: transaction.userId,
          type: transaction.type,
          status: TransactionStatus.COMPLETED,
          amount: transaction.amount,
          fee: new Decimal(0),
          totalAmount: transaction.totalAmount,
          balanceBefore: wallet.balance,
          balanceAfter: newBalance,
          currency: transaction.currency,
          description: `Reversal of transaction ${transaction.reference}`,
          narration: dto.reason,
          reference: `REV_${transaction.reference}`,
          metadata: {
            reversedTransactionId: transaction.id,
            reversedBy: adminUserId,
            reason: dto.reason,
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'REVERSE_TRANSACTION',
          resource: 'Transaction',
          resourceId: transactionId,
          metadata: {
            originalReference: transaction.reference,
            reversalReference: reversalTransaction.reference,
            amount: transaction.totalAmount.toString(),
            reason: dto.reason,
          },
        },
      });

      return {
        originalTransaction: updatedTransaction,
        reversalTransaction,
        userId: transaction.userId,
        amount: transaction.totalAmount,
        reference: transaction.reference,
      };
    });

    // Send notification to user about reversal
    this.notificationDispatcher
      .sendNotification({
        userId: result.userId,
        eventType: 'transaction_reversed',
        category: 'TRANSACTION',
        channels: ['EMAIL', 'PUSH', 'IN_APP'],
        title: 'Transaction Reversed',
        message: `Your transaction of ₦${Number(result.amount).toLocaleString()} (Ref: ${result.reference}) has been reversed. The amount has been credited back to your wallet.`,
        data: {
          originalReference: result.reference,
          reversalReference: result.reversalTransaction.reference,
          amount: result.amount.toString(),
          reason: dto.reason,
        },
      })
      .catch((error) => {
        this.logger.error(
          'Failed to send transaction reversal notification',
          error,
        );
      });

    return {
      originalTransaction: result.originalTransaction,
      reversalTransaction: result.reversalTransaction,
    };
  }

  /**
   * Get all withdrawal configurations
   */
  async getAllWithdrawalConfigs() {
    return this.transactionsService.getAllWithdrawalConfigs();
  }

  /**
   * Get withdrawal configuration by ID
   */
  async getWithdrawalConfigById(id: string) {
    return this.transactionsService.getWithdrawalConfigById(id);
  }

  /**
   * Create withdrawal configuration
   */
  async createWithdrawalConfig(dto: CreateWithdrawalConfigDto) {
    return this.transactionsService.createWithdrawalConfig(dto);
  }

  /**
   * Update withdrawal configuration
   */
  async updateWithdrawalConfig(id: string, dto: UpdateWithdrawalConfigDto) {
    return this.transactionsService.updateWithdrawalConfig(id, dto);
  }

  /**
   * Delete withdrawal configuration
   */
  async deleteWithdrawalConfig(id: string) {
    return this.transactionsService.deleteWithdrawalConfig(id);
  }
}
