import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, TransactionStatus, VTUServiceType } from '@prisma/client';
import { RefundVTUDto } from '../dto';
import { Decimal } from '@prisma/client/runtime/library';
import { VTPassService } from '../../vtu/services/vtpass.service';

@Injectable()
export class AdminVTUService {
  constructor(
    private prisma: PrismaService,
    private vtpassService: VTPassService,
  ) {}

  /**
   * Get VTU orders with filters
   */
  async getVTUOrders(
    page: number = 1,
    limit: number = 20,
    serviceType?: VTUServiceType,
    status?: TransactionStatus,
    userId?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.VTUOrderWhereInput = {};

    if (serviceType) where.serviceType = serviceType;
    if (status) where.status = status;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [orders, total] = await Promise.all([
      this.prisma.vTUOrder.findMany({
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
      this.prisma.vTUOrder.count({ where }),
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
   * Get VTU statistics
   */
  async getVTUStats(startDate?: string, endDate?: string) {
    const where: Prisma.VTUOrderWhereInput = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [totalCount, byServiceType, byStatus, aggregations] =
      await Promise.all([
        this.prisma.vTUOrder.count({ where }),

        this.prisma.vTUOrder.groupBy({
          by: ['serviceType'],
          where,
          _count: true,
          _sum: { amount: true },
        }),

        this.prisma.vTUOrder.groupBy({
          by: ['status'],
          where,
          _count: true,
        }),

        this.prisma.vTUOrder.aggregate({
          where,
          _sum: { amount: true },
          _avg: { amount: true },
        }),
      ]);

    const successCount =
      byStatus.find((s) => s.status === TransactionStatus.COMPLETED)?._count ||
      0;
    const successRate =
      totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(2) : '0';

    return {
      totalCount,
      totalVolume: aggregations._sum.amount || 0,
      averageAmount: aggregations._avg.amount || 0,
      successRate,
      byServiceType: byServiceType.map((item) => ({
        serviceType: item.serviceType,
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
   * Get failed VTU orders
   */
  async getFailedOrders(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.vTUOrder.findMany({
        where: { status: TransactionStatus.FAILED },
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
      this.prisma.vTUOrder.count({
        where: { status: TransactionStatus.FAILED },
      }),
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
   * Get single VTU order
   */
  async getOrderById(orderId: string) {
    const order = await this.prisma.vTUOrder.findUnique({
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
      throw new NotFoundException('VTU order not found');
    }

    // Get related transaction if exists
    const transaction = order.transactionId
      ? await this.prisma.transaction.findUnique({
          where: { id: order.transactionId },
        })
      : null;

    return {
      order,
      transaction,
    };
  }

  /**
   * Refund VTU order
   */
  async refundOrder(adminUserId: string, orderId: string, dto: RefundVTUDto) {
    const order = await this.prisma.vTUOrder.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) {
      throw new NotFoundException('VTU order not found');
    }

    if (order.status !== TransactionStatus.FAILED) {
      throw new BadRequestException('Only failed orders can be refunded');
    }

    // Perform refund in a transaction
    const result = await this.prisma.$transaction(async (prisma) => {
      // Get wallet
      const wallet = await prisma.wallet.findUnique({
        where: { userId: order.userId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const newBalance = new Decimal(wallet.balance).plus(order.amount);

      // Update wallet
      await prisma.wallet.update({
        where: { userId: order.userId },
        data: {
          balance: newBalance,
          ledgerBalance: newBalance,
        },
      });

      // Create refund transaction
      const refundTransaction = await prisma.transaction.create({
        data: {
          userId: order.userId,
          type: order.serviceType as any, // Map service type to transaction type
          status: TransactionStatus.COMPLETED,
          amount: order.amount,
          fee: new Decimal(0),
          totalAmount: order.amount,
          balanceBefore: wallet.balance,
          balanceAfter: newBalance,
          currency: 'NGN',
          description: `Refund for failed VTU order ${order.reference}`,
          narration: dto.reason,
          reference: `REFUND_${order.reference}`,
          relatedType: 'vtu_order',
          relatedId: order.id,
          metadata: {
            refundedBy: adminUserId,
            reason: dto.reason,
            originalOrderId: order.id,
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'REFUND_VTU_ORDER',
          resource: 'VTUOrder',
          resourceId: orderId,
          metadata: {
            orderReference: order.reference,
            amount: order.amount.toString(),
            reason: dto.reason,
          },
        },
      });

      return {
        order,
        refundTransaction,
      };
    });

    // TODO: Send notification to user

    return result;
  }

  /**
   * Retry failed VTU order
   */
  async retryOrder(adminUserId: string, orderId: string) {
    const order = await this.prisma.vTUOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('VTU order not found');
    }

    if (order.status !== TransactionStatus.FAILED) {
      throw new BadRequestException('Only failed orders can be retried');
    }

    // Update order status to pending for retry
    const updatedOrder = await this.prisma.vTUOrder.update({
      where: { id: orderId },
      data: { status: TransactionStatus.PENDING },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'RETRY_VTU_ORDER',
        resource: 'VTUOrder',
        resourceId: orderId,
        metadata: {
          orderReference: order.reference,
        },
      },
    });

    // TODO: Trigger retry logic with VTU provider

    return updatedOrder;
  }

  /**
   * Mark order as completed (manual)
   */
  async markCompleted(adminUserId: string, orderId: string, notes?: string) {
    const order = await this.prisma.vTUOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('VTU order not found');
    }

    const updatedOrder = await this.prisma.vTUOrder.update({
      where: { id: orderId },
      data: {
        status: TransactionStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'MARK_VTU_COMPLETED',
        resource: 'VTUOrder',
        resourceId: orderId,
        metadata: {
          orderReference: order.reference,
          notes,
        },
      },
    });

    return updatedOrder;
  }

  /**
   * Get VTPass wallet balance
   */
  async getVTPassBalance() {
    return this.vtpassService.getBalance();
  }
}
