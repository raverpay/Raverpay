import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CircleBlockchain } from '../circle.types';

export interface FeeConfig {
  enabled: boolean;
  percentage: number; // e.g., 0.5 for 0.5%
  minFeeUsdc: number; // e.g., 0.0625 for minimum fee
  collectionWallets: Record<string, string>; // blockchain => wallet address
}

const DEFAULT_FEE_CONFIG: FeeConfig = {
  enabled: true,
  percentage: 0.5,
  minFeeUsdc: 0.0625, // ~₦100 at ₦1,600/$
  collectionWallets: {
    'BASE-MAINNET': '',
    'OP-MAINNET': '',
    'ARB-MAINNET': '',
    'MATIC-POLYGON': '',
    'BASE-SEPOLIA': '',
    'OP-SEPOLIA': '',
    'ARB-SEPOLIA': '',
    'MATIC-AMOY': '',
  },
};

const SYSTEM_CONFIG_KEY = 'CIRCLE_FEE_CONFIG';

/**
 * Fee Configuration Service
 * Manages transaction fee configuration stored in SystemConfig table
 */
@Injectable()
export class FeeConfigurationService {
  private readonly logger = new Logger(FeeConfigurationService.name);
  private cachedConfig: FeeConfig | null = null;
  private lastFetchTime = 0;
  private readonly CACHE_TTL = 60000; // 1 minute cache

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get current fee configuration
   */
  async getFeeConfig(): Promise<FeeConfig> {
    // Check cache
    const now = Date.now();
    if (this.cachedConfig && now - this.lastFetchTime < this.CACHE_TTL) {
      return this.cachedConfig;
    }

    try {
      const configRecord = await this.prisma.systemConfig.findUnique({
        where: { key: SYSTEM_CONFIG_KEY },
      });

      if (!configRecord) {
        // Initialize with default config
        this.logger.log('Fee config not found, initializing with defaults');
        const initialized = await this.initializeFeeConfig();
        this.cachedConfig = initialized;
        this.lastFetchTime = now;
        return initialized;
      }

      const config = configRecord.value as unknown as FeeConfig;
      this.cachedConfig = config;
      this.lastFetchTime = now;
      return config;
    } catch (error) {
      this.logger.error('Failed to get fee config:', error);
      return DEFAULT_FEE_CONFIG;
    }
  }

  /**
   * Initialize fee config (internal method to avoid recursion)
   */
  private async initializeFeeConfig(): Promise<FeeConfig> {
    try {
      // Use upsert to handle race conditions where multiple requests try to create at once
      const record = await this.prisma.systemConfig.upsert({
        where: { key: SYSTEM_CONFIG_KEY },
        create: {
          key: SYSTEM_CONFIG_KEY,
          value: DEFAULT_FEE_CONFIG as any,
        },
        update: {}, // Don't update if already exists
      });

      return record.value as unknown as FeeConfig;
    } catch (error) {
      this.logger.error('Failed to initialize fee config:', error);
      return DEFAULT_FEE_CONFIG;
    }
  }

  /**
   * Update fee configuration
   */
  async updateFeeConfig(
    config: Partial<FeeConfig>,
    updatedBy?: string,
  ): Promise<FeeConfig> {
    try {
      // Get current config from cache or DB without triggering initialization
      let currentConfig: FeeConfig;

      if (this.cachedConfig) {
        currentConfig = this.cachedConfig;
      } else {
        const configRecord = await this.prisma.systemConfig.findUnique({
          where: { key: SYSTEM_CONFIG_KEY },
        });
        currentConfig =
          (configRecord?.value as unknown as FeeConfig) || DEFAULT_FEE_CONFIG;
      }

      const newConfig: FeeConfig = { ...currentConfig, ...config };

      // Validate config
      if (newConfig.percentage < 0 || newConfig.percentage > 100) {
        throw new Error('Fee percentage must be between 0 and 100');
      }

      if (newConfig.minFeeUsdc < 0) {
        throw new Error('Minimum fee cannot be negative');
      }

      await this.prisma.systemConfig.upsert({
        where: { key: SYSTEM_CONFIG_KEY },
        create: {
          key: SYSTEM_CONFIG_KEY,
          value: newConfig as any,
          updatedBy,
        },
        update: {
          value: newConfig as any,
          updatedBy,
        },
      });

      // Clear cache to force refresh on next read
      this.cachedConfig = newConfig;
      this.lastFetchTime = Date.now();

      this.logger.log(
        `Fee config updated: ${newConfig.percentage}%, min ${newConfig.minFeeUsdc} USDC`,
      );

      return newConfig;
    } catch (error) {
      this.logger.error('Failed to update fee config:', error);
      throw error;
    }
  }

  /**
   * Calculate fee for a given amount
   */
  async calculateFee(amount: number): Promise<number> {
    if (amount <= 0) {
      return 0;
    }

    const config = await this.getFeeConfig();

    if (!config.enabled) {
      return 0;
    }

    // Calculate percentage-based fee
    const calculatedFee = amount * (config.percentage / 100);

    // Apply minimum fee
    const finalFee = Math.max(calculatedFee, config.minFeeUsdc);

    // Round to 6 decimals for USDC precision
    return Number(finalFee.toFixed(6));
  }

  /**
   * Check if fees are enabled
   */
  async isEnabled(): Promise<boolean> {
    const config = await this.getFeeConfig();
    return config.enabled;
  }

  /**
   * Get collection wallet for a specific blockchain
   */
  async getCollectionWallet(blockchain: string): Promise<string | null> {
    const config = await this.getFeeConfig();
    const wallet = config.collectionWallets[blockchain];

    if (!wallet || wallet.trim() === '') {
      this.logger.warn(
        `No collection wallet configured for blockchain: ${blockchain}`,
      );
      return null;
    }

    return wallet;
  }

  /**
   * Validate that collection wallets are configured for all chains
   */
  async validateCollectionWallets(
    blockchains: string[],
  ): Promise<{ valid: boolean; missing: string[] }> {
    const config = await this.getFeeConfig();
    const missing: string[] = [];

    for (const blockchain of blockchains) {
      const wallet = config.collectionWallets[blockchain];
      if (!wallet || wallet.trim() === '') {
        missing.push(blockchain);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Clear cache (useful after updates)
   */
  clearCache(): void {
    this.cachedConfig = null;
    this.lastFetchTime = 0;
  }
}
