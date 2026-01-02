import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Circle Configuration Service
 * Manages Circle API configuration and environment settings
 */
import { ChainMetadata, CircleBlockchain } from '../circle.types';

@Injectable()
export class CircleConfigService {
  private readonly logger = new Logger(CircleConfigService.name);

  // API configuration
  readonly apiKey: string;
  readonly apiBaseUrl: string;
  readonly environment: 'testnet' | 'mainnet';

  // Entity secret configuration
  readonly entitySecret: string;

  // Webhook configuration
  readonly webhookSecret?: string;

  // Default blockchain settings
  readonly defaultBlockchain: string;
  readonly defaultAccountType: 'SCA' | 'EOA';

  constructor(private readonly configService: ConfigService) {
    // Load API configuration
    this.apiKey = this.configService.get<string>('CIRCLE_API_KEY') || '';
    this.environment =
      (this.configService.get<string>('CIRCLE_ENVIRONMENT') as
        | 'testnet'
        | 'mainnet') || 'testnet';

    this.apiBaseUrl =
      this.configService.get<string>('CIRCLE_API_BASE_URL') ||
      (this.environment === 'testnet'
        ? 'https://api-sandbox.circle.com/v1/w3s'
        : 'https://api.circle.com/v1/w3s');

    // Load entity secret
    this.entitySecret =
      this.configService.get<string>('CIRCLE_ENTITY_SECRET') || '';

    // Load webhook configuration
    this.webhookSecret = this.configService.get<string>(
      'CIRCLE_WEBHOOK_SECRET',
    );

    // Default blockchain settings based on environment
    this.defaultBlockchain =
      this.environment === 'testnet' ? 'BASE-SEPOLIA' : 'BASE';
    this.defaultAccountType = 'SCA';

    // Validate configuration
    this.validateConfiguration();
  }

  /**
   * Validate that required configuration is present
   */
  private validateConfiguration(): void {
    const missingVars: string[] = [];

    if (!this.apiKey) {
      missingVars.push('CIRCLE_API_KEY');
    }

    if (!this.entitySecret) {
      missingVars.push('CIRCLE_ENTITY_SECRET');
    }

    if (missingVars.length > 0) {
      this.logger.warn(
        `Missing Circle configuration: ${missingVars.join(', ')}. Circle integration may not work properly.`,
      );
    } else {
      this.logger.log(
        `Circle configuration loaded successfully (${this.environment})`,
      );
    }
  }

  /**
   * Check if Circle integration is properly configured
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey && this.entitySecret);
  }

  /**
   * Get the full API URL for an endpoint
   */
  getApiUrl(endpoint: string): string {
    const base = this.apiBaseUrl.replace(/\/$/, '');
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
  }

  /**
   * Get authorization header value
   */
  getAuthHeader(): string {
    return `Bearer ${this.apiKey}`;
  }

  /**
   * Get the appropriate blockchain based on environment
   */
  getBlockchain(preferredBlockchain?: string): string {
    if (preferredBlockchain) {
      // If testnet, ensure we use testnet blockchain
      if (this.environment === 'testnet') {
        const testnetMap: Record<string, string> = {
          MATIC: 'MATIC-AMOY',
          ETH: 'ETH-SEPOLIA',
          AVAX: 'AVAX-FUJI',
          ARB: 'ARB-SEPOLIA',
          BASE: 'BASE-SEPOLIA',
          OP: 'OP-SEPOLIA',
          SOL: 'SOL-DEVNET',
        };
        return testnetMap[preferredBlockchain] || preferredBlockchain;
      }
      return preferredBlockchain;
    }
    return this.defaultBlockchain;
  }

  /**
   * Get supported blockchains for current environment
   */
  getSupportedBlockchains(): string[] {
    if (this.environment === 'testnet') {
      return ['BASE-SEPOLIA', 'OP-SEPOLIA', 'ARB-SEPOLIA', 'MATIC-AMOY'];
    }
    return ['BASE', 'OP', 'ARB', 'MATIC'];
  }

  /**
   * Get metadata for all supported chains or a specific one
   */
  getChainMetadata(): ChainMetadata[] {
    const isTestnet = this.environment === 'testnet';

    const chains: ChainMetadata[] = [
      // Base (Recommended)
      {
        blockchain: isTestnet ? 'BASE-SEPOLIA' : 'BASE',
        name: isTestnet ? 'Base Sepolia' : 'Base',
        symbol: 'ETH',
        isTestnet,
        isSupported: true,
        isRecommended: true,
        feeLabel: 'Free (Sponsored)',
        estimatedCost: '$0.00',
        description: 'Fastest & Cheapest. Recommended for all transactions.',
      },
      // Optimism
      {
        blockchain: isTestnet ? 'OP-SEPOLIA' : 'OP',
        name: isTestnet ? 'Optimism Sepolia' : 'Optimism',
        symbol: 'ETH',
        isTestnet,
        isSupported: true,
        isRecommended: false,
        feeLabel: 'Free (Sponsored)',
        estimatedCost: '$0.00',
        description: 'Fast, secure Layer 2 network.',
      },
      // Arbitrum
      {
        blockchain: isTestnet ? 'ARB-SEPOLIA' : 'ARB',
        name: isTestnet ? 'Arbitrum Sepolia' : 'Arbitrum One',
        symbol: 'ETH',
        isTestnet,
        isSupported: true,
        isRecommended: false,
        feeLabel: 'Free (Sponsored)',
        estimatedCost: '$0.00',
        description: 'Leading Layer 2 scaling solution.',
      },
      // Polygon
      {
        blockchain: isTestnet ? 'MATIC-AMOY' : 'MATIC',
        name: isTestnet ? 'Polygon Amoy' : 'Polygon PoS',
        symbol: 'MATIC',
        isTestnet,
        isSupported: true,
        isRecommended: false,
        feeLabel: 'Free (Sponsored)',
        estimatedCost: '$0.00',
        description: 'Established chain with low fees.',
      },
    ];

    return chains;
  }

  /**
   * Get metadata for a specific blockchain
   */
  getSingleChainMetadata(blockchain: string): ChainMetadata | undefined {
    return this.getChainMetadata().find((c) => c.blockchain === blockchain);
  }

  /**
   * Get USDC token address for a blockchain
   */
  getUsdcTokenAddress(blockchain: string): string | null {
    // USDC token addresses by blockchain
    const usdcAddresses: Record<string, string> = {
      // Mainnet
      MATIC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      ARB: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      BASE: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      OP: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      // Testnet
      'MATIC-AMOY': '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
      'ARB-SEPOLIA': '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
      'BASE-SEPOLIA': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      'OP-SEPOLIA': '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
    };

    return usdcAddresses[blockchain] || null;
  }
}
