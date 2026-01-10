import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

interface BlockchainConfigData {
  blockchain: string;
  name: string;
  symbol: string;
  isEnabled: boolean;
  isTestnet: boolean;
  feeLabel: string | null;
  estimatedCost: string | null;
  description: string | null;
  isRecommended: boolean;
  displayOrder: number;
  isCCTPSupported: boolean;
}

// Default blockchain configurations for seeding
const DEFAULT_BLOCKCHAIN_CONFIGS: BlockchainConfigData[] = [
  // Testnets
  {
    blockchain: 'BASE-SEPOLIA',
    name: 'Base Sepolia',
    symbol: 'ETH',
    isEnabled: true,
    isTestnet: true,
    feeLabel: 'Free (Testnet)',
    estimatedCost: '$0.00',
    description: 'Base testnet - no real costs',
    isRecommended: true,
    displayOrder: 1,
    isCCTPSupported: true,
  },
  {
    blockchain: 'OP-SEPOLIA',
    name: 'Optimism Sepolia',
    symbol: 'ETH',
    isEnabled: true,
    isTestnet: true,
    feeLabel: 'Free (Testnet)',
    estimatedCost: '$0.00',
    description: 'Optimism testnet - no real costs',
    isRecommended: false,
    displayOrder: 2,
    isCCTPSupported: true,
  },
  {
    blockchain: 'ARB-SEPOLIA',
    name: 'Arbitrum Sepolia',
    symbol: 'ETH',
    isEnabled: true,
    isTestnet: true,
    feeLabel: 'Free (Testnet)',
    estimatedCost: '$0.00',
    description: 'Arbitrum testnet - no real costs',
    isRecommended: false,
    displayOrder: 3,
    isCCTPSupported: true,
  },
  {
    blockchain: 'MATIC-AMOY',
    name: 'Polygon Amoy',
    symbol: 'POL',
    isEnabled: true,
    isTestnet: true,
    feeLabel: 'Free (Testnet)',
    estimatedCost: '$0.00',
    description: 'Polygon testnet - no real costs',
    isRecommended: false,
    displayOrder: 4,
    isCCTPSupported: true,
  },
  {
    blockchain: 'ETH-SEPOLIA',
    name: 'Ethereum Sepolia',
    symbol: 'ETH',
    isEnabled: false,
    isTestnet: true,
    feeLabel: 'Free (Testnet)',
    estimatedCost: '$0.00',
    description: 'Ethereum testnet - higher gas costs',
    isRecommended: false,
    displayOrder: 5,
    isCCTPSupported: true,
  },
  {
    blockchain: 'AVAX-FUJI',
    name: 'Avalanche Fuji',
    symbol: 'AVAX',
    isEnabled: false,
    isTestnet: true,
    feeLabel: 'Free (Testnet)',
    estimatedCost: '$0.00',
    description: 'Avalanche testnet - no real costs',
    isRecommended: false,
    displayOrder: 6,
    isCCTPSupported: true,
  },
  // Mainnets
  {
    blockchain: 'BASE',
    name: 'Base',
    symbol: 'ETH',
    isEnabled: false,
    isTestnet: false,
    feeLabel: 'Gas Sponsored',
    estimatedCost: '~$0.001',
    description: 'Fast L2 with very low fees',
    isRecommended: true,
    displayOrder: 10,
    isCCTPSupported: true,
  },
  {
    blockchain: 'OP',
    name: 'Optimism',
    symbol: 'ETH',
    isEnabled: false,
    isTestnet: false,
    feeLabel: 'Gas Sponsored',
    estimatedCost: '~$0.001',
    description: 'Fast L2 with low fees',
    isRecommended: false,
    displayOrder: 11,
    isCCTPSupported: true,
  },
  {
    blockchain: 'ARB',
    name: 'Arbitrum',
    symbol: 'ETH',
    isEnabled: false,
    isTestnet: false,
    feeLabel: 'Gas Sponsored',
    estimatedCost: '~$0.02',
    description: 'Popular L2 network',
    isRecommended: false,
    displayOrder: 12,
    isCCTPSupported: true,
  },
  {
    blockchain: 'MATIC',
    name: 'Polygon',
    symbol: 'POL',
    isEnabled: false,
    isTestnet: false,
    feeLabel: 'Gas Sponsored',
    estimatedCost: '~$0.001',
    description: 'Low-cost EVM chain',
    isRecommended: false,
    displayOrder: 13,
    isCCTPSupported: true,
  },
  {
    blockchain: 'ETH',
    name: 'Ethereum',
    symbol: 'ETH',
    isEnabled: false,
    isTestnet: false,
    feeLabel: 'Gas Sponsored',
    estimatedCost: '~$1.00',
    description: 'Ethereum mainnet - higher fees',
    isRecommended: false,
    displayOrder: 14,
    isCCTPSupported: true,
  },
  {
    blockchain: 'AVAX',
    name: 'Avalanche',
    symbol: 'AVAX',
    isEnabled: false,
    isTestnet: false,
    feeLabel: 'Gas Sponsored',
    estimatedCost: '~$0.05',
    description: 'Fast finality chain',
    isRecommended: false,
    displayOrder: 15,
    isCCTPSupported: true,
  },
];

@Injectable()
export class BlockchainConfigService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainConfigService.name);
  private cache: Map<string, BlockchainConfigData> = new Map();
  private cacheLastUpdated: Date | null = null;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultConfigs();
    await this.refreshCache();
  }

  /**
   * Seed default blockchain configurations if none exist
   */
  async seedDefaultConfigs(): Promise<void> {
    try {
      const existingCount = await this.prisma.blockchainConfig.count();

      if (existingCount === 0) {
        this.logger.log('Seeding default blockchain configurations...');

        for (const config of DEFAULT_BLOCKCHAIN_CONFIGS) {
          await this.prisma.blockchainConfig.create({
            data: config,
          });
        }

        this.logger.log(
          `Seeded ${DEFAULT_BLOCKCHAIN_CONFIGS.length} blockchain configurations`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to seed blockchain configurations:', error);
    }
  }

  /**
   * Refresh the in-memory cache from database
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async refreshCache(): Promise<void> {
    try {
      const configs = await this.prisma.blockchainConfig.findMany({
        orderBy: { displayOrder: 'asc' },
      });

      this.cache.clear();
      for (const config of configs) {
        this.cache.set(config.blockchain, config);
      }
      this.cacheLastUpdated = new Date();

      this.logger.debug(
        `Refreshed blockchain config cache with ${configs.length} entries`,
      );
    } catch (error) {
      this.logger.error('Failed to refresh blockchain config cache:', error);
    }
  }

  /**
   * Check if cache needs refresh
   */
  private isCacheStale(): boolean {
    if (!this.cacheLastUpdated) return true;
    return Date.now() - this.cacheLastUpdated.getTime() > this.CACHE_TTL_MS;
  }

  /**
   * Get all blockchain configurations
   */
  async getAll(): Promise<BlockchainConfigData[]> {
    if (this.isCacheStale()) {
      await this.refreshCache();
    }
    return Array.from(this.cache.values()).sort(
      (a, b) => a.displayOrder - b.displayOrder,
    );
  }

  /**
   * Get enabled blockchains
   */
  async getEnabledBlockchains(): Promise<string[]> {
    const configs = await this.getAll();
    return configs.filter((c) => c.isEnabled).map((c) => c.blockchain);
  }

  /**
   * Get configuration for a specific blockchain
   */
  async getConfig(blockchain: string): Promise<BlockchainConfigData | null> {
    if (this.isCacheStale()) {
      await this.refreshCache();
    }
    return this.cache.get(blockchain) || null;
  }

  /**
   * Check if a blockchain is enabled
   */
  async isBlockchainEnabled(blockchain: string): Promise<boolean> {
    const config = await this.getConfig(blockchain);
    return config?.isEnabled ?? false;
  }

  /**
   * Update blockchain configuration
   */
  async updateConfig(
    blockchain: string,
    updates: Partial<Omit<BlockchainConfigData, 'blockchain'>>,
  ): Promise<BlockchainConfigData> {
    const updated = await this.prisma.blockchainConfig.update({
      where: { blockchain },
      data: updates,
    });

    // Update cache
    this.cache.set(blockchain, updated);

    this.logger.log(`Updated blockchain config: ${blockchain}`);

    return updated;
  }

  /**
   * Enable a blockchain
   */
  async enableBlockchain(blockchain: string): Promise<void> {
    await this.updateConfig(blockchain, { isEnabled: true });
    this.logger.log(`Enabled blockchain: ${blockchain}`);
  }

  /**
   * Disable a blockchain
   */
  async disableBlockchain(blockchain: string): Promise<void> {
    await this.updateConfig(blockchain, { isEnabled: false });
    this.logger.log(`Disabled blockchain: ${blockchain}`);
  }

  /**
   * Get blockchains for display (enabled only + sorted)
   */
  async getBlockchainsForDisplay(): Promise<BlockchainConfigData[]> {
    const configs = await this.getAll();
    return configs.filter((c) => c.isEnabled);
  }

  /**
   * Get CCTP-supported blockchains
   */
  async getCCTPSupportedBlockchains(): Promise<string[]> {
    const configs = await this.getAll();
    return configs
      .filter((c) => c.isEnabled && c.isCCTPSupported)
      .map((c) => c.blockchain);
  }
}
