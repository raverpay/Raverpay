import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  VTUServiceType,
  Prisma,
  CashbackTransactionType,
} from '@prisma/client';
import {
  CashbackCalculation,
  CashbackWalletBalance,
  CashbackTransactionData,
} from './cashback.types';
import { CreateCashbackConfigDto } from './dto/create-cashback-config.dto';
import { UpdateCashbackConfigDto } from './dto/update-cashback-config.dto';

@Injectable()
export class CashbackService {
  private readonly logger = new Logger(CashbackService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== Configuration Management ====================

  /**
   * Get all cashback configurations
   */
  async getAllConfigs() {
    return this.prisma.cashbackConfig.findMany({
      orderBy: [{ serviceType: 'asc' }, { provider: 'asc' }],
    });
  }

  /**
   * Get active cashback configurations (for public API)
   */
  async getActiveConfigs() {
    const configs = await this.prisma.cashbackConfig.findMany({
      where: { isActive: true },
      orderBy: [{ serviceType: 'asc' }, { provider: 'asc' }],
    });

    // Group by service type and provider
    const grouped: Record<string, Record<string, any>> = {};

    for (const config of configs) {
      if (!grouped[config.serviceType]) {
        grouped[config.serviceType] = {};
      }

      const key = config.provider || 'ALL';
      grouped[config.serviceType][key] = {
        percentage: Number(config.percentage),
        minAmount: Number(config.minAmount),
        maxCashback: config.maxCashback ? Number(config.maxCashback) : null,
      };
    }

    return grouped;
  }

  /**
   * Get cashback configuration for specific service type and provider
   */
  async getCashbackConfig(
    serviceType: VTUServiceType,
    provider?: string,
  ): Promise<any | null> {
    // Use raw SQL to avoid enum comparison issues
    const serviceTypeString = serviceType.toString();

    // First try to find provider-specific config
    if (provider) {
      const providerUpper = provider.toUpperCase();
      const providerConfig = await this.prisma.$queryRaw`
        SELECT * FROM "cashback_config"
        WHERE "serviceType"::text = ${serviceTypeString}
        AND "provider" = ${providerUpper}
        AND "isActive" = true
        LIMIT 1
      `;

      if (Array.isArray(providerConfig) && providerConfig.length > 0) {
        return providerConfig[0];
      }
    }

    // Fall back to general config (provider = null)
    const generalConfig = await this.prisma.$queryRaw`
      SELECT * FROM "cashback_config"
      WHERE "serviceType"::text = ${serviceTypeString}
      AND "provider" IS NULL
      AND "isActive" = true
      LIMIT 1
    `;

    if (Array.isArray(generalConfig) && generalConfig.length > 0) {
      return generalConfig[0];
    }

    return null;
  }

  /**
   * Create a new cashback configuration
   */
  async createConfig(dto: CreateCashbackConfigDto) {
    // Check for existing config using raw SQL
    const providerValue = dto.provider ? dto.provider.toUpperCase() : null;
    const serviceTypeString = dto.serviceType.toString();

    const existing = await this.prisma.$queryRaw`
      SELECT * FROM "cashback_config"
      WHERE "serviceType"::text = ${serviceTypeString}
      AND "provider" ${providerValue === null ? Prisma.sql`IS NULL` : Prisma.sql`= ${providerValue}`}
      LIMIT 1
    `;

    if (Array.isArray(existing) && existing.length > 0) {
      throw new BadRequestException(
        'Cashback configuration already exists for this service type and provider',
      );
    }

    return this.prisma.cashbackConfig.create({
      data: {
        serviceType: dto.serviceType,
        percentage: new Prisma.Decimal(dto.percentage),
        isActive: dto.isActive ?? true,
        provider: dto.provider ? dto.provider.toUpperCase() : null,
        minAmount: new Prisma.Decimal(dto.minAmount ?? 0),
        maxCashback: dto.maxCashback
          ? new Prisma.Decimal(dto.maxCashback)
          : null,
        description: dto.description ?? null,
      },
    });
  }

  /**
   * Update an existing cashback configuration
   */
  async updateConfig(id: string, dto: UpdateCashbackConfigDto) {
    const existing = await this.prisma.cashbackConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Cashback configuration not found');
    }

    return this.prisma.cashbackConfig.update({
      where: { id },
      data: {
        ...(dto.percentage !== undefined && {
          percentage: new Prisma.Decimal(dto.percentage),
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.minAmount !== undefined && {
          minAmount: new Prisma.Decimal(dto.minAmount),
        }),
        ...(dto.maxCashback !== undefined && {
          maxCashback: dto.maxCashback
            ? new Prisma.Decimal(dto.maxCashback)
            : null,
        }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  /**
   * Delete (deactivate) a cashback configuration
   */
  async deleteConfig(id: string) {
    const existing = await this.prisma.cashbackConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Cashback configuration not found');
    }

    return this.prisma.cashbackConfig.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ==================== User Cashback Wallet ====================

  /**
   * Get or create cashback wallet for a user
   */
  async getOrCreateWallet(userId: string) {
    let wallet = await this.prisma.cashbackWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.cashbackWallet.create({
        data: {
          userId,
          totalEarned: new Prisma.Decimal(0),
          availableBalance: new Prisma.Decimal(0),
          totalRedeemed: new Prisma.Decimal(0),
          isActive: true,
        },
      });

      this.logger.log(`Created cashback wallet for user ${userId}`);
    }

    return wallet;
  }

  /**
   * Get cashback wallet balance for a user
   */
  async getCashbackBalance(userId: string): Promise<CashbackWalletBalance> {
    const wallet = await this.getOrCreateWallet(userId);

    return {
      availableBalance: Number(wallet.availableBalance),
      totalEarned: Number(wallet.totalEarned),
      totalRedeemed: Number(wallet.totalRedeemed),
    };
  }

  /**
   * Get cashback transaction history for a user
   */
  async getCashbackHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
    type?: CashbackTransactionType,
  ) {
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (type) {
      where.type = type;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.cashbackTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.cashbackTransaction.count({ where }),
    ]);

    return {
      data: transactions.map((tx) => ({
        ...tx,
        amount: Number(tx.amount),
        balanceBefore: Number(tx.balanceBefore),
        balanceAfter: Number(tx.balanceAfter),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== Cashback Calculation ====================

  /**
   * Calculate cashback for a purchase
   */
  async calculateCashback(
    serviceType: VTUServiceType,
    provider: string,
    amount: number,
  ): Promise<CashbackCalculation> {
    const config = await this.getCashbackConfig(serviceType, provider);

    if (!config) {
      return {
        percentage: 0,
        cashbackAmount: 0,
        isEligible: false,
      };
    }

    const minAmount = Number(config.minAmount);
    const percentage = Number(config.percentage);
    const maxCashback = config.maxCashback ? Number(config.maxCashback) : null;

    // Check if amount meets minimum requirement
    if (amount < minAmount) {
      return {
        percentage,
        cashbackAmount: 0,
        isEligible: false,
      };
    }

    // Calculate cashback
    let cashbackAmount = (amount * percentage) / 100;

    // Apply maximum cap if configured
    if (maxCashback && cashbackAmount > maxCashback) {
      cashbackAmount = maxCashback;
    }

    // Round to 2 decimal places
    cashbackAmount = Math.round(cashbackAmount * 100) / 100;

    return {
      percentage,
      cashbackAmount,
      isEligible: true,
    };
  }

  // ==================== Cashback Award ====================

  /**
   * Award cashback to a user after successful purchase
   */
  async awardCashback(
    userId: string,
    vtuOrderId: string,
    serviceType: VTUServiceType,
    provider: string,
    amount: number,
  ) {
    const calculation = await this.calculateCashback(
      serviceType,
      provider,
      amount,
    );

    if (!calculation.isEligible || calculation.cashbackAmount <= 0) {
      this.logger.debug(
        `No cashback awarded for user ${userId} - not eligible`,
      );
      return null;
    }

    // Get wallet
    const wallet = await this.getOrCreateWallet(userId);
    const balanceBefore = Number(wallet.availableBalance);
    const cashbackAmount = calculation.cashbackAmount;
    const balanceAfter = balanceBefore + cashbackAmount;

    // Create transaction record and update wallet in a database transaction
    const [transaction] = await this.prisma.$transaction([
      // Create cashback transaction
      this.prisma.cashbackTransaction.create({
        data: {
          userId,
          type: 'EARNED',
          amount: new Prisma.Decimal(cashbackAmount),
          balanceBefore: new Prisma.Decimal(balanceBefore),
          balanceAfter: new Prisma.Decimal(balanceAfter),
          sourceReference: vtuOrderId,
          description: `Cashback earned from ${serviceType.toLowerCase()} purchase`,
          metadata: {
            serviceType,
            provider,
            purchaseAmount: amount,
            percentage: calculation.percentage,
          },
        },
      }),

      // Update wallet
      this.prisma.cashbackWallet.update({
        where: { userId },
        data: {
          availableBalance: { increment: new Prisma.Decimal(cashbackAmount) },
          totalEarned: { increment: new Prisma.Decimal(cashbackAmount) },
        },
      }),
    ]);

    this.logger.log(
      `Awarded ₦${cashbackAmount} cashback to user ${userId} for ${serviceType}`,
    );

    return transaction;
  }

  // ==================== Cashback Redemption ====================

  /**
   * Redeem cashback for a purchase
   */
  async redeemCashback(
    userId: string,
    amountToRedeem: number,
    vtuOrderId: string,
  ) {
    if (amountToRedeem <= 0) {
      throw new BadRequestException('Redemption amount must be greater than 0');
    }

    // Get wallet
    const wallet = await this.getOrCreateWallet(userId);
    const availableBalance = Number(wallet.availableBalance);

    // Check if user has sufficient cashback
    if (amountToRedeem > availableBalance) {
      throw new BadRequestException(
        `Insufficient cashback balance. Available: ₦${availableBalance}`,
      );
    }

    const balanceBefore = availableBalance;
    const balanceAfter = availableBalance - amountToRedeem;

    // Create transaction record and update wallet
    const [transaction] = await this.prisma.$transaction([
      // Create cashback transaction
      this.prisma.cashbackTransaction.create({
        data: {
          userId,
          type: 'REDEEMED',
          amount: new Prisma.Decimal(amountToRedeem),
          balanceBefore: new Prisma.Decimal(balanceBefore),
          balanceAfter: new Prisma.Decimal(balanceAfter),
          sourceReference: vtuOrderId,
          description: 'Cashback redeemed for purchase',
        },
      }),

      // Update wallet
      this.prisma.cashbackWallet.update({
        where: { userId },
        data: {
          availableBalance: { decrement: new Prisma.Decimal(amountToRedeem) },
          totalRedeemed: { increment: new Prisma.Decimal(amountToRedeem) },
        },
      }),
    ]);

    this.logger.log(`User ${userId} redeemed ₦${amountToRedeem} cashback`);

    return transaction;
  }

  /**
   * Reverse cashback redemption (in case of failed purchase)
   */
  async reverseCashbackRedemption(userId: string, vtuOrderId: string) {
    // Find the redemption transaction
    const redemptionTx = await this.prisma.cashbackTransaction.findFirst({
      where: {
        userId,
        type: 'REDEEMED',
        sourceReference: vtuOrderId,
      },
    });

    if (!redemptionTx) {
      this.logger.warn(
        `No cashback redemption found for order ${vtuOrderId} - nothing to reverse`,
      );
      return null;
    }

    const amountToReverse = Number(redemptionTx.amount);
    const wallet = await this.getOrCreateWallet(userId);
    const balanceBefore = Number(wallet.availableBalance);
    const balanceAfter = balanceBefore + amountToReverse;

    // Create reversal transaction and update wallet
    const [transaction] = await this.prisma.$transaction([
      // Create reversal transaction
      this.prisma.cashbackTransaction.create({
        data: {
          userId,
          type: 'REVERSED',
          amount: new Prisma.Decimal(amountToReverse),
          balanceBefore: new Prisma.Decimal(balanceBefore),
          balanceAfter: new Prisma.Decimal(balanceAfter),
          sourceReference: vtuOrderId,
          description: 'Cashback redemption reversed due to failed purchase',
          metadata: {
            originalTransactionId: redemptionTx.id,
          },
        },
      }),

      // Update wallet
      this.prisma.cashbackWallet.update({
        where: { userId },
        data: {
          availableBalance: { increment: new Prisma.Decimal(amountToReverse) },
          totalRedeemed: { decrement: new Prisma.Decimal(amountToReverse) },
        },
      }),
    ]);

    this.logger.log(
      `Reversed ₦${amountToReverse} cashback redemption for user ${userId}`,
    );

    return transaction;
  }

  // ==================== Analytics ====================

  /**
   * Get cashback analytics (for admin dashboard)
   */
  async getAnalytics() {
    const [totalEarned, totalRedeemed, activeUsers, recentTransactions] =
      await Promise.all([
        // Total cashback earned
        this.prisma.cashbackWallet.aggregate({
          _sum: { totalEarned: true },
        }),

        // Total cashback redeemed
        this.prisma.cashbackWallet.aggregate({
          _sum: { totalRedeemed: true },
        }),

        // Active users with cashback
        this.prisma.cashbackWallet.count({
          where: {
            availableBalance: { gt: 0 },
          },
        }),

        // Recent transactions
        this.prisma.cashbackTransaction.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),
      ]);

    return {
      totalCashbackEarned: Number(totalEarned._sum.totalEarned || 0),
      totalCashbackRedeemed: Number(totalRedeemed._sum.totalRedeemed || 0),
      outstandingBalance:
        Number(totalEarned._sum.totalEarned || 0) -
        Number(totalRedeemed._sum.totalRedeemed || 0),
      activeUsers,
      transactionsLast24Hours: recentTransactions,
    };
  }
}
