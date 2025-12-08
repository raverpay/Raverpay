import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

interface SetExchangeRateParams {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  platformFeePercent: number;
  setBy: string; // Admin user ID
  source?: string;
  notes?: string;
  expiresAt?: Date;
}

/**
 * Exchange Rate Service
 * Manages USD → NGN exchange rates (admin controlled)
 */
@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Set new exchange rate (admin only)
   */
  async setExchangeRate(params: SetExchangeRateParams) {
    const {
      fromCurrency,
      toCurrency,
      rate,
      platformFeePercent,
      setBy,
      source,
      notes,
      expiresAt,
    } = params;

    try {
      // Deactivate previous rates
      await this.prisma.exchangeRate.updateMany({
        where: {
          fromCurrency,
          toCurrency,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      // Create new rate
      const exchangeRate = await this.prisma.exchangeRate.create({
        data: {
          fromCurrency,
          toCurrency,
          rate: new Decimal(rate),
          platformFeePercent: new Decimal(platformFeePercent),
          isActive: true,
          setBy,
          setAt: new Date(),
          expiresAt,
          source: source || 'manual',
          notes,
        },
      });

      this.logger.log(
        `Exchange rate set: ${fromCurrency}/${toCurrency} = ${rate} (Fee: ${platformFeePercent}%)`,
      );

      return exchangeRate;
    } catch (error) {
      this.logger.error('Failed to set exchange rate', error);
      throw error;
    }
  }

  /**
   * Get current active exchange rate
   */
  async getCurrentRate(fromCurrency: string, toCurrency: string) {
    const exchangeRate = await this.prisma.exchangeRate.findFirst({
      where: {
        fromCurrency,
        toCurrency,
        isActive: true,
      },
      orderBy: { setAt: 'desc' },
    });

    return exchangeRate;
  }

  /**
   * Get USD → NGN rate
   */
  async getUsdToNgnRate() {
    return this.getCurrentRate('USD', 'NGN');
  }

  /**
   * Get all exchange rates (for admin)
   */
  async getAllRates(params?: {
    page?: number;
    limit?: number;
    includeInactive?: boolean;
  }) {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    const where = params?.includeInactive ? {} : { isActive: true };

    const [rates, total] = await Promise.all([
      this.prisma.exchangeRate.findMany({
        where,
        orderBy: { setAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.exchangeRate.count({ where }),
    ]);

    return {
      rates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get rate history
   */
  async getRateHistory(fromCurrency: string, toCurrency: string, limit = 30) {
    return this.prisma.exchangeRate.findMany({
      where: {
        fromCurrency,
        toCurrency,
      },
      orderBy: { setAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Deactivate rate
   */
  async deactivateRate(rateId: string) {
    return this.prisma.exchangeRate.update({
      where: { id: rateId },
      data: { isActive: false },
    });
  }

  /**
   * Calculate conversion with fee
   */
  calculateConversion(
    amount: number,
    rate: number,
    feePercent: number,
  ): {
    grossAmount: number;
    feeAmount: number;
    netAmount: number;
  } {
    const grossAmount = amount * rate;
    const feeAmount = (grossAmount * feePercent) / 100;
    const netAmount = grossAmount - feeAmount;

    return {
      grossAmount,
      feeAmount,
      netAmount,
    };
  }
}
