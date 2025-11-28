import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, TransactionStatus, CryptoOrderType } from '@prisma/client';
import {
  ApproveCryptoDto,
  RejectCryptoDto,
  AdjustCryptoAmountDto,
} from '../dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AdminCryptoService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get crypto orders with filters
   */
  async getCryptoOrders(
    page: number = 1,
    limit: number = 20,
    type?: CryptoOrderType,
    status?: TransactionStatus,
    userId?: string,
    asset?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.CryptoOrderWhereInput = {};

    if (type) where.type = type;
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (asset) where.asset = { contains: asset, mode: 'insensitive' };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [orders, total] = await Promise.all([
      this.prisma.cryptoOrder.findMany({
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
      this.prisma.cryptoOrder.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get pending review orders (sell orders)
   */
  async getPendingReview() {
    const orders = await this.prisma.cryptoOrder.findMany({
      where: {
        type: CryptoOrderType.SELL,
        status: TransactionStatus.PENDING,
      },
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
    });

    return orders.map((order) => ({
      ...order,
      daysPending: Math.floor(
        (Date.now() - order.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      ),
    }));
  }

  /**
   * Get crypto statistics
   */
  async getStats(startDate?: string, endDate?: string) {
    const where: Prisma.CryptoOrderWhereInput = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [totalCount, byType, byAsset, byStatus, aggregations] =
      await Promise.all([
        this.prisma.cryptoOrder.count({ where }),

        this.prisma.cryptoOrder.groupBy({
          by: ['type'],
          where,
          _count: true,
          _sum: { nairaAmount: true },
        }),

        this.prisma.cryptoOrder.groupBy({
          by: ['asset'],
          where,
          _count: true,
          _sum: { cryptoAmount: true, nairaAmount: true },
        }),

        this.prisma.cryptoOrder.groupBy({
          by: ['status'],
          where,
          _count: true,
        }),

        this.prisma.cryptoOrder.aggregate({
          where,
          _sum: { nairaAmount: true, cryptoAmount: true },
          _avg: { nairaAmount: true, rate: true },
        }),
      ]);

    const approvedCount =
      byStatus.find((s) => s.status === TransactionStatus.COMPLETED)?._count ||
      0;
    const approvalRate =
      totalCount > 0 ? ((approvedCount / totalCount) * 100).toFixed(2) : '0';

    return {
      totalCount,
      totalVolumeNGN: aggregations._sum?.nairaAmount || 0,
      totalVolumeCrypto: aggregations._sum?.cryptoAmount || 0,
      averageAmountNGN: aggregations._avg?.nairaAmount || 0,
      averageRate: aggregations._avg?.rate || 0,
      approvalRate,
      byType: byType.map((item) => ({
        type: item.type,
        count: item._count,
        volumeNGN: item._sum?.nairaAmount || 0,
      })),
      byAsset: byAsset.map((item) => ({
        asset: item.asset,
        count: item._count,
        volumeCrypto: item._sum?.cryptoAmount || 0,
        volumeNGN: item._sum?.nairaAmount || 0,
      })),
      byStatus: byStatus.map((item) => ({
        status: item.status,
        count: item._count,
      })),
    };
  }

  /**
   * Get single crypto order
   */
  async getOrderById(orderId: string) {
    const order = await this.prisma.cryptoOrder.findUnique({
      where: { id: orderId },
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

    if (!order) {
      throw new NotFoundException('Crypto order not found');
    }

    return order;
  }

  /**
   * Approve crypto sell order
   */
  async approveOrder(
    adminUserId: string,
    orderId: string,
    dto: ApproveCryptoDto,
  ) {
    const order = await this.prisma.cryptoOrder.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) {
      throw new NotFoundException('Crypto order not found');
    }

    if (order.type !== CryptoOrderType.SELL) {
      throw new BadRequestException('Only SELL orders can be approved');
    }

    if (order.status !== TransactionStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be approved');
    }

    // Perform approval in a transaction
    const result = await this.prisma.$transaction(async (prisma) => {
      // Get wallet
      const wallet = await prisma.wallet.findFirst({
        where: { userId: order.userId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const newBalance = new Decimal(wallet.balance).plus(order.nairaAmount);

      // Update wallet
      await prisma.wallet.update({
        where: {
          userId_type: {
            userId: order.userId,
            type: 'NAIRA'
          }
        },
        data: {
          balance: newBalance,
          ledgerBalance: newBalance,
        },
      });

      // Update order
      const updatedOrder = await prisma.cryptoOrder.update({
        where: { id: orderId },
        data: {
          status: TransactionStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      // Create transaction
      const transaction = await prisma.transaction.create({
        data: {
          userId: order.userId,
          type: 'CRYPTO_SELL',
          status: TransactionStatus.COMPLETED,
          amount: order.nairaAmount,
          fee: new Decimal(0),
          totalAmount: order.nairaAmount,
          balanceBefore: wallet.balance,
          balanceAfter: newBalance,
          currency: 'NGN',
          description: `Crypto sold: ${order.cryptoAmount} ${order.asset}`,
          narration: `Approved by admin`,
          reference: `CRYPTO_SELL_${order.reference}`,
          relatedType: 'crypto_order',
          relatedId: order.id,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'APPROVE_CRYPTO_ORDER',
          resource: 'CryptoOrder',
          resourceId: orderId,
          metadata: {
            orderReference: order.reference,
            nairaAmount: order.nairaAmount.toString(),
            cryptoAmount: order.cryptoAmount.toString(),
            asset: order.asset,
            notes: dto.notes,
          },
        },
      });

      return {
        order: updatedOrder,
        transaction,
      };
    });

    // TODO: Send notification to user

    return result;
  }

  /**
   * Reject crypto sell order
   */
  async rejectOrder(
    adminUserId: string,
    orderId: string,
    dto: RejectCryptoDto,
  ) {
    const order = await this.prisma.cryptoOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Crypto order not found');
    }

    const updatedOrder = await this.prisma.cryptoOrder.update({
      where: { id: orderId },
      data: {
        status: TransactionStatus.FAILED,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'REJECT_CRYPTO_ORDER',
        resource: 'CryptoOrder',
        resourceId: orderId,
        metadata: {
          orderReference: order.reference,
          reason: dto.reason,
          notes: dto.notes,
        },
      },
    });

    // TODO: Send notification to user with reason

    return updatedOrder;
  }

  /**
   * Adjust crypto payout amount
   */
  async adjustAmount(
    adminUserId: string,
    orderId: string,
    dto: AdjustCryptoAmountDto,
  ) {
    const order = await this.prisma.cryptoOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Crypto order not found');
    }

    const updatedOrder = await this.prisma.cryptoOrder.update({
      where: { id: orderId },
      data: {
        nairaAmount: new Decimal(dto.nairaAmount),
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'ADJUST_CRYPTO_AMOUNT',
        resource: 'CryptoOrder',
        resourceId: orderId,
        metadata: {
          orderReference: order.reference,
          previousNairaAmount: order.nairaAmount.toString(),
          newNairaAmount: dto.nairaAmount.toString(),
          reason: dto.reason,
        },
      },
    });

    return updatedOrder;
  }
}
