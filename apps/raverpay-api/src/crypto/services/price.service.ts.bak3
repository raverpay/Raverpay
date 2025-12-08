import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import axios, { AxiosInstance } from 'axios';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Crypto Price Service
 * Fetches and stores live crypto prices from CoinGecko
 */
@Injectable()
export class PriceService {
  private readonly logger = new Logger(PriceService.name);
  private readonly httpClient: AxiosInstance;

  // CoinGecko API IDs
  private readonly TOKEN_IDS = {
    MATIC: 'matic-network',
    USDT: 'tether',
    USDC: 'usd-coin',
  };

  constructor(private readonly prisma: PrismaService) {
    this.httpClient = axios.create({
      baseURL: 'https://api.coingecko.com/api/v3',
      timeout: 30000,
    });
  }

  /**
   * Update all token prices from CoinGecko
   */
  async updateAllPrices() {
    try {
      this.logger.log('Fetching prices from CoinGecko...');

      const ids = Object.values(this.TOKEN_IDS).join(',');

      const response = await this.httpClient.get('/simple/price', {
        params: {
          ids,
          vs_currencies: 'usd',
        },
      });

      const prices = response.data;

      // Update each token price
      for (const [symbol, coinGeckoId] of Object.entries(this.TOKEN_IDS)) {
        const priceData = prices[coinGeckoId];

        if (priceData && priceData.usd) {
          await this.savePrice(symbol, priceData.usd);
        }
      }

      this.logger.log('Prices updated successfully');
    } catch (error) {
      this.logger.error('Failed to update prices from CoinGecko', error);
      // Don't throw - allow retries via cron
    }
  }

  /**
   * Get latest price for a token
   */
  async getLatestPrice(symbol: string) {
    const price = await this.prisma.cryptoPrice.findFirst({
      where: { symbol },
      orderBy: { fetchedAt: 'desc' },
    });

    if (!price) {
      // Default prices for stablecoins
      if (symbol === 'USDT' || symbol === 'USDC') {
        return 1.0;
      }
      return null;
    }

    return Number(price.usdPrice);
  }

  /**
   * Get all latest prices
   */
  async getAllLatestPrices() {
    const symbols = Object.keys(this.TOKEN_IDS);

    const prices = await Promise.all(
      symbols.map(async (symbol) => {
        const price = await this.getLatestPrice(symbol);
        return {
          symbol,
          usdPrice: price,
        };
      }),
    );

    return prices;
  }

  /**
   * Get price history for a token
   */
  async getPriceHistory(symbol: string, limit = 100) {
    return this.prisma.cryptoPrice.findMany({
      where: { symbol },
      orderBy: { fetchedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Save price to database
   */
  private async savePrice(symbol: string, usdPrice: number) {
    await this.prisma.cryptoPrice.create({
      data: {
        symbol,
        usdPrice: new Decimal(usdPrice),
        source: 'coingecko',
        fetchedAt: new Date(),
      },
    });

    this.logger.debug(`Saved price for ${symbol}: $${usdPrice}`);
  }

  /**
   * Calculate USD value
   */
  async calculateUsdValue(symbol: string, amount: number): Promise<number> {
    const price = await this.getLatestPrice(symbol);

    if (!price) {
      return 0;
    }

    return amount * price;
  }

  /**
   * Cleanup old prices (keep last 1000 records per token)
   */
  async cleanupOldPrices() {
    try {
      const symbols = Object.keys(this.TOKEN_IDS);

      for (const symbol of symbols) {
        // Get IDs of prices to keep (latest 1000)
        const toKeep = await this.prisma.cryptoPrice.findMany({
          where: { symbol },
          orderBy: { fetchedAt: 'desc' },
          take: 1000,
          select: { id: true },
        });

        const keepIds = toKeep.map((p) => p.id);

        // Delete older prices
        const deleted = await this.prisma.cryptoPrice.deleteMany({
          where: {
            symbol,
            id: { notIn: keepIds },
          },
        });

        if (deleted.count > 0) {
          this.logger.log(`Cleaned up ${deleted.count} old prices for ${symbol}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old prices', error);
    }
  }
}
