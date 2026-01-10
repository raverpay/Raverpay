import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import axios, { AxiosInstance } from 'axios';
import { Decimal } from '@prisma/client/runtime/library';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Crypto Price Service
 * Fetches and stores live crypto prices from CoinGecko
 */
@Injectable()
export class PriceService {
  private readonly logger = new Logger(PriceService.name);
  private readonly httpClient: AxiosInstance;

  // In-memory price cache for faster access
  private priceCache: Map<string, { price: number; updatedAt: Date }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  // CoinGecko API IDs
  private readonly TOKEN_IDS: Record<string, string> = {
    MATIC: 'matic-network', // Legacy, but may still work
    POL: 'polygon-ecosystem-token', // POL (ex-MATIC)
    ETH: 'ethereum',
    USDT: 'tether',
    USDC: 'usd-coin',
    AVAX: 'avalanche-2',
    SOL: 'solana',
  };

  // Alternative IDs for MATIC/POL (try these if primary fails)
  private readonly MATIC_ALTERNATIVE_IDS = [
    'polygon-ecosystem-token', // POL (ex-MATIC) - this is the correct one!
    'polygon',
    'matic-network',
  ];

  constructor(private readonly prisma: PrismaService) {
    this.httpClient = axios.create({
      baseURL: 'https://api.coingecko.com/api/v3',
      timeout: 30000,
    });
  }

  /**
   * Update all token prices from CoinGecko (runs every 5 minutes)
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateAllPrices() {
    try {
      this.logger.log('Updating crypto prices from CoinGecko...');

      // Build list of IDs to fetch (include MATIC alternatives)
      const ids = [
        ...this.MATIC_ALTERNATIVE_IDS,
        this.TOKEN_IDS.ETH,
        this.TOKEN_IDS.USDT,
        this.TOKEN_IDS.USDC,
        this.TOKEN_IDS.AVAX,
        this.TOKEN_IDS.SOL,
      ].join(',');

      const response = await this.httpClient.get('/simple/price', {
        params: {
          ids,
          vs_currencies: 'usd',
        },
      });

      const prices = response.data as Record<string, { usd?: number }>;

      // Update ETH
      const ethPrice = prices[this.TOKEN_IDS.ETH];
      if (ethPrice?.usd) {
        await this.savePrice('ETH', ethPrice.usd);
        this.priceCache.set('ETH', { price: ethPrice.usd, updatedAt: new Date() });
      } else {
        this.logger.warn(`No price data found for ETH`);
      }

      // Update USDT
      const usdtPrice = prices[this.TOKEN_IDS.USDT];
      if (usdtPrice?.usd) {
        await this.savePrice('USDT', usdtPrice.usd);
        this.priceCache.set('USDT', { price: usdtPrice.usd, updatedAt: new Date() });
      } else {
        this.logger.warn(`No price data found for USDT`);
      }

      // Update USDC
      const usdcPrice = prices[this.TOKEN_IDS.USDC];
      if (usdcPrice?.usd) {
        await this.savePrice('USDC', usdcPrice.usd);
        this.priceCache.set('USDC', { price: usdcPrice.usd, updatedAt: new Date() });
      } else {
        this.logger.warn(`No price data found for USDC`);
      }

      // Update AVAX
      const avaxPrice = prices[this.TOKEN_IDS.AVAX];
      if (avaxPrice?.usd) {
        await this.savePrice('AVAX', avaxPrice.usd);
        this.priceCache.set('AVAX', { price: avaxPrice.usd, updatedAt: new Date() });
      }

      // Update SOL
      const solPrice = prices[this.TOKEN_IDS.SOL];
      if (solPrice?.usd) {
        await this.savePrice('SOL', solPrice.usd);
        this.priceCache.set('SOL', { price: solPrice.usd, updatedAt: new Date() });
      }

      // Update MATIC/POL - try alternative IDs
      let maticPrice: number | null = null;

      for (const id of this.MATIC_ALTERNATIVE_IDS) {
        const priceData = prices[id];
        if (priceData?.usd !== undefined) {
          maticPrice = priceData.usd;
          break;
        }
      }

      if (maticPrice !== null) {
        await this.savePrice('MATIC', maticPrice);
        await this.savePrice('POL', maticPrice);
        this.priceCache.set('MATIC', { price: maticPrice, updatedAt: new Date() });
        this.priceCache.set('POL', { price: maticPrice, updatedAt: new Date() });
      } else {
        this.logger.warn(
          `No price data found for MATIC. Tried IDs: ${this.MATIC_ALTERNATIVE_IDS.join(', ')}`,
        );
      }

      this.logger.log('Price update completed successfully');
    } catch (error) {
      this.logger.error('Failed to update prices from CoinGecko', error);
      // Don't throw - allow retries via cron
    }
  }

  /**
   * Get latest price for a token (uses cache first)
   */
  async getLatestPrice(symbol: string): Promise<number | null> {
    // Check in-memory cache first
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() - cached.updatedAt.getTime() < this.CACHE_TTL_MS) {
      return cached.price;
    }

    // Check database
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

    // Update cache
    const priceNum = Number(price.usdPrice);
    this.priceCache.set(symbol, { price: priceNum, updatedAt: new Date(price.fetchedAt) });

    return priceNum;
  }

  /**
   * Get all latest prices (for API endpoint)
   */
  async getAllLatestPrices(): Promise<{
    prices: Record<string, number>;
    updatedAt: string;
  }> {
    const symbols = ['ETH', 'USDC', 'USDT', 'MATIC', 'POL', 'AVAX', 'SOL'];
    const prices: Record<string, number> = {};
    let latestUpdate = new Date(0);

    await Promise.all(
      symbols.map(async (symbol) => {
        const price = await this.getLatestPrice(symbol);
        if (price !== null) {
          prices[symbol] = price;
        }
        
        // Track most recent update
        const cached = this.priceCache.get(symbol);
        if (cached && cached.updatedAt > latestUpdate) {
          latestUpdate = cached.updatedAt;
        }
      }),
    );

    // Default values
    if (!prices['USDC']) prices['USDC'] = 1.0;
    if (!prices['USDT']) prices['USDT'] = 1.0;

    return {
      prices,
      updatedAt: latestUpdate.getTime() > 0 ? latestUpdate.toISOString() : new Date().toISOString(),
    };
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
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
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
          this.logger.log(
            `Cleaned up ${deleted.count} old prices for ${symbol}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old prices', error);
    }
  }
}

