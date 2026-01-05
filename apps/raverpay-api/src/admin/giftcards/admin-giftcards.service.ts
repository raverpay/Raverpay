import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, TransactionStatus, GiftCardType } from '@prisma/client';
import { AuditService } from '../../common/services/audit.service';
import { AuditAction } from '../../common/types/audit-log.types';
import {
  ApproveGiftCardDto,
  RejectGiftCardDto,
  AdjustGiftCardAmountDto,
} from '../dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AdminGiftCardsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Get gift card orders with filters
   */
  async getGiftCardOrders(
    page: number = 1,
    limit: number = 20,
    type?: GiftCardType,
    status?: TransactionStatus,
    userId?: string,
    brand?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.GiftCardOrderWhereInput = {};

    if (type) where.type = type;
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (brand) where.brand = { contains: brand, mode: 'insensitive' };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [orders, total] = await Promise.all([
      this.prisma.giftCardOrder.findMany({
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
      this.prisma.giftCardOrder.count({ where }),
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
    const orders = await this.prisma.giftCardOrder.findMany({
      where: {
        type: GiftCardType.SELL,
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
   * Get gift card statistics
   */
  async getStats(startDate?: string, endDate?: string) {
    const where: Prisma.GiftCardOrderWhereInput = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [totalCount, byType, byBrand, byStatus, aggregations] =
      await Promise.all([
        this.prisma.giftCardOrder.count({ where }),

        this.prisma.giftCardOrder.groupBy({
          by: ['type'],
          where,
          _count: true,
          _sum: { amount: true },
        }),

        this.prisma.giftCardOrder.groupBy({
          by: ['brand'],
          where,
          _count: true,
          _sum: { amount: true },
        }),

        this.prisma.giftCardOrder.groupBy({
          by: ['status'],
          where,
          _count: true,
        }),

        this.prisma.giftCardOrder.aggregate({
          where,
          _sum: { amount: true },
          _avg: { amount: true, rate: true },
        }),
      ]);

    const approvedCount =
      byStatus.find((s) => s.status === TransactionStatus.COMPLETED)?._count ||
      0;
    const approvalRate =
      totalCount > 0 ? ((approvedCount / totalCount) * 100).toFixed(2) : '0';

    return {
      totalCount,
      totalVolume: aggregations._sum.amount || 0,
      averageAmount: aggregations._avg.amount || 0,
      averageRate: aggregations._avg.rate || 0,
      approvalRate,
      byType: byType.map((item) => ({
        type: item.type,
        count: item._count,
        volume: item._sum.amount || 0,
      })),
      byBrand: byBrand.map((item) => ({
        brand: item.brand,
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
   * Get single gift card order
   */
  async getOrderById(orderId: string) {
    const order = await this.prisma.giftCardOrder.findUnique({
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
      throw new NotFoundException('Gift card order not found');
    }

    return order;
  }

  /**
   * Approve gift card sell order
   */
  async approveOrder(
    adminUserId: string,
    orderId: string,
    dto: ApproveGiftCardDto,
  ) {
    const order = await this.prisma.giftCardOrder.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) {
      throw new NotFoundException('Gift card order not found');
    }

    if (order.type !== GiftCardType.SELL) {
      throw new BadRequestException('Only SELL orders can be approved');
    }

    if (order.status !== TransactionStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be approved');
    }

    // Perform approval in a transaction
    const result = await this.prisma.$transaction(async (prisma) => {
      // Get wallet
      const wallet = await prisma.wallet.findFirst({
        where: {
          userId: order.userId,
          type: 'NAIRA',
        },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const newBalance = new Decimal(wallet.balance).plus(order.amount);

      // Update wallet
      await prisma.wallet.update({
        where: {
          userId_type: {
            userId: order.userId,
            type: 'NAIRA',
          },
        },
        data: {
          balance: newBalance,
          ledgerBalance: newBalance,
        },
      });

      // Update order
      const updatedOrder = await prisma.giftCardOrder.update({
        where: { id: orderId },
        data: {
          status: TransactionStatus.COMPLETED,
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
          reviewNotes: dto.notes,
          completedAt: new Date(),
        },
      });

      // Create transaction
      const transaction = await prisma.transaction.create({
        data: {
          userId: order.userId,
          type: 'GIFTCARD_SELL',
          status: TransactionStatus.COMPLETED,
          amount: order.amount,
          fee: new Decimal(0),
          totalAmount: order.amount,
          balanceBefore: wallet.balance,
          balanceAfter: newBalance,
          currency: 'NGN',
          description: `Gift card sold: ${order.brand} - ${order.country}`,
          narration: `Approved by admin`,
          reference: `GC_SELL_${order.reference}`,
          relatedType: 'giftcard_order',
          relatedId: order.id,
        },
      });

      return {
        order: updatedOrder,
        transaction,
      };
    });

    // Audit log: Gift card order approved
    await this.auditService.logAdmin(
      AuditAction.GIFTCARD_ORDER_APPROVED,
      adminUserId,
      order.userId,
      {
        orderId,
        orderReference: order.reference,
        amount: order.amount.toString(),
        brand: order.brand,
        country: order.country,
        notes: dto.notes,
        transactionId: result.transaction.id,
      },
    );

    // TODO: Send notification to user

    return result;
  }

  /**
   * Reject gift card sell order
   */
  async rejectOrder(
    adminUserId: string,
    orderId: string,
    dto: RejectGiftCardDto,
  ) {
    const order = await this.prisma.giftCardOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Gift card order not found');
    }

    const updatedOrder = await this.prisma.giftCardOrder.update({
      where: { id: orderId },
      data: {
        status: TransactionStatus.FAILED,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        reviewNotes: dto.notes,
      },
    });

    // Audit log: Gift card order rejected
    await this.auditService.logAdmin(
      AuditAction.GIFTCARD_ORDER_REJECTED,
      adminUserId,
      order.userId,
      {
        orderId,
        orderReference: order.reference,
        amount: order.amount.toString(),
        brand: order.brand,
        reason: dto.reason,
        notes: dto.notes,
      },
    );

    // TODO: Send notification to user with reason

    return updatedOrder;
  }

  /**
   * Adjust gift card payout amount
   */
  async adjustAmount(
    adminUserId: string,
    orderId: string,
    dto: AdjustGiftCardAmountDto,
  ) {
    const order = await this.prisma.giftCardOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Gift card order not found');
    }

    const updatedOrder = await this.prisma.giftCardOrder.update({
      where: { id: orderId },
      data: {
        amount: new Decimal(dto.amount),
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'ADJUST_GIFTCARD_AMOUNT',
        resource: 'GiftCardOrder',
        resourceId: orderId,
        metadata: {
          orderReference: order.reference,
          previousAmount: order.amount.toString(),
          newAmount: dto.amount.toString(),
          reason: dto.reason,
        },
      },
    });

    return updatedOrder;
  }
}
