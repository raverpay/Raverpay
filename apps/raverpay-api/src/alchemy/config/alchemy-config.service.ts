import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Network configuration interface
 */
export interface AlchemyNetworkConfig {
  rpcUrl: string;
  blockchain: string;
  network: string;
  chainId: number;
  nativeToken: string;
  usdcAddress: string;
  usdtAddress?: string;
  isTestnet: boolean;
  blockExplorerUrl: string;
}

/**
 * Alchemy Configuration Service
 *
 * Centralized configuration management for Alchemy integration
 * - RPC URLs for different networks
 * - Network-specific configurations (chain IDs, token addresses)
 * - API keys and Gas Manager policy IDs
 * - Supported blockchains and networks
 */
@Injectable()
export class AlchemyConfigService {
  private readonly logger = new Logger(AlchemyConfigService.name);

  constructor(private readonly configService: ConfigService) {
    this.logger.log('Alchemy configuration service initialized');
  }

  /**
   * Get RPC URL for a specific blockchain and network
   * @param blockchain - Blockchain name (POLYGON, ARBITRUM, BASE)
   * @param network - Network name (mainnet, sepolia, amoy)
   * @returns RPC URL
   */
  getRpcUrl(blockchain: string, network: string): string {
    const envKey = `ALCHEMY_DEV_${blockchain.toUpperCase()}_${network.toUpperCase()}_RPC`;
    const rpcUrl = this.configService.get<string>(envKey);

    if (!rpcUrl) {
      this.logger.error(`RPC URL not configured for ${blockchain}-${network}`);
      throw new Error(
        `RPC URL not configured for ${blockchain}-${network}. Please set ${envKey} in environment variables.`,
      );
    }

    return rpcUrl;
  }

  /**
   * Get Alchemy API key
   * @param environment - Environment (dev or prod)
   * @returns API key
   */
  getApiKey(environment: 'dev' | 'prod' = 'dev'): string {
    const envKey =
      environment === 'dev' ? 'ALCHEMY_DEV_API_KEY' : 'ALCHEMY_PROD_API_KEY';
    const apiKey = this.configService.get<string>(envKey);

    if (!apiKey) {
      this.logger.error(`Alchemy API key not configured for ${environment}`);
      throw new Error(
        `Alchemy API key not configured. Please set ${envKey} in environment variables.`,
      );
    }

    return apiKey;
  }

  /**
   * Get Gas Manager policy ID
   * @param environment - Environment (dev or prod)
   * @returns Gas Manager policy ID
   */
  getGasPolicyId(environment: 'dev' | 'prod' = 'dev'): string {
    const envKey =
      environment === 'dev'
        ? 'ALCHEMY_DEV_GAS_POLICY_ID'
        : 'ALCHEMY_PROD_GAS_POLICY_ID';
    const policyId = this.configService.get<string>(envKey);

    if (!policyId) {
      this.logger.error(
        `Gas Manager policy ID not configured for ${environment}`,
      );
      throw new Error(
        `Gas Manager policy ID not configured. Please set ${envKey} in environment variables.`,
      );
    }

    return policyId;
  }

  /**
   * Get webhook signing secret
   * @returns Webhook signing secret
   */
  getWebhookSigningSecret(): string {
    const secret = this.configService.get<string>(
      'ALCHEMY_WEBHOOK_SIGNING_SECRET',
    );

    if (!secret) {
      this.logger.warn('Webhook signing secret not configured');
      // Don't throw error - webhooks might not be set up yet
      return '';
    }

    return secret;
  }

  /**
   * Get complete network configuration
   * @param blockchain - Blockchain name
   * @param network - Network name
   * @returns Network configuration object
   */
  getNetworkConfig(
    blockchain: string,
    network: string,
  ): AlchemyNetworkConfig {
    const key = `${blockchain}-${network}`;

    // Network configurations
    const configs: Record<string, AlchemyNetworkConfig> = {
      // ============================================
      // PRODUCTION NETWORKS
      // ============================================
      'POLYGON-mainnet': {
        rpcUrl: this.getRpcUrl('POLYGON', 'mainnet'),
        blockchain: 'POLYGON',
        network: 'mainnet',
        chainId: 137,
        nativeToken: 'POL',
        usdcAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC on Polygon PoS
        usdtAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT on Polygon PoS
        isTestnet: false,
        blockExplorerUrl: 'https://polygonscan.com',
      },
      'ARBITRUM-mainnet': {
        rpcUrl: this.getRpcUrl('ARBITRUM', 'mainnet'),
        blockchain: 'ARBITRUM',
        network: 'mainnet',
        chainId: 42161,
        nativeToken: 'ETH',
        usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC on Arbitrum One
        usdtAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // USDT on Arbitrum One
        isTestnet: false,
        blockExplorerUrl: 'https://arbiscan.io',
      },
      'BASE-mainnet': {
        rpcUrl: this.getRpcUrl('BASE', 'mainnet'),
        blockchain: 'BASE',
        network: 'mainnet',
        chainId: 8453,
        nativeToken: 'ETH',
        usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
        isTestnet: false,
        blockExplorerUrl: 'https://basescan.org',
      },

      // ============================================
      // TESTNET NETWORKS
      // ============================================
      'BASE-sepolia': {
        rpcUrl: this.getRpcUrl('BASE', 'sepolia'),
        blockchain: 'BASE',
        network: 'sepolia',
        chainId: 84532,
        nativeToken: 'ETH',
        usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
        isTestnet: true,
        blockExplorerUrl: 'https://sepolia.basescan.org',
      },
      'POLYGON-amoy': {
        rpcUrl: this.getRpcUrl('POLYGON', 'amoy'),
        blockchain: 'POLYGON',
        network: 'amoy',
        chainId: 80002,
        nativeToken: 'POL',
        usdcAddress: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', // USDC on Polygon Amoy
        isTestnet: true,
        blockExplorerUrl: 'https://amoy.polygonscan.com',
      },
      'ARBITRUM-sepolia': {
        rpcUrl: this.getRpcUrl('ARBITRUM', 'sepolia'),
        blockchain: 'ARBITRUM',
        network: 'sepolia',
        chainId: 421614,
        nativeToken: 'ETH',
        usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // USDC on Arbitrum Sepolia
        isTestnet: true,
        blockExplorerUrl: 'https://sepolia.arbiscan.io',
      },
    };

    const config = configs[key];

    if (!config) {
      this.logger.error(`Network config not found for ${key}`);
      throw new Error(
        `Network configuration not found for ${blockchain}-${network}`,
      );
    }

    return config;
  }

  /**
   * Get all supported blockchains
   * @returns Array of blockchain names
   */
  getSupportedBlockchains(): string[] {
    return ['POLYGON', 'ARBITRUM', 'BASE'];
  }

  /**
   * Get supported networks for a specific blockchain
   * @param blockchain - Blockchain name
   * @returns Array of network names
   */
  getSupportedNetworks(blockchain: string): string[] {
    const networks: Record<string, string[]> = {
      POLYGON: ['mainnet', 'amoy'],
      ARBITRUM: ['mainnet', 'sepolia'],
      BASE: ['mainnet', 'sepolia'],
    };

    const supportedNetworks = networks[blockchain];

    if (!supportedNetworks) {
      this.logger.error(`Blockchain ${blockchain} not supported`);
      throw new Error(`Blockchain ${blockchain} is not supported`);
    }

    return supportedNetworks;
  }

  /**
   * Check if a blockchain-network combination is valid
   * @param blockchain - Blockchain name
   * @param network - Network name
   * @returns True if valid, false otherwise
   */
  isValidNetwork(blockchain: string, network: string): boolean {
    try {
      const supportedNetworks = this.getSupportedNetworks(blockchain);
      return supportedNetworks.includes(network);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get default network for a blockchain
   * @param blockchain - Blockchain name
   * @returns Default network name
   */
  getDefaultNetwork(blockchain: string): string {
    // Default to testnet for development
    const defaults: Record<string, string> = {
      POLYGON: 'amoy',
      ARBITRUM: 'sepolia',
      BASE: 'sepolia',
    };

    return defaults[blockchain] || 'sepolia';
  }

  /**
   * Get environment (dev or prod)
   * @returns Current environment
   */
  getEnvironment(): 'dev' | 'prod' {
    const env = this.configService.get<string>('NODE_ENV');
    return env === 'production' ? 'prod' : 'dev';
  }

  /**
   * Check if webhooks are configured
   * @returns True if webhook signing secret is configured
   */
  areWebhooksConfigured(): boolean {
    const secret = this.configService.get<string>(
      'ALCHEMY_WEBHOOK_SIGNING_SECRET',
    );
    return !!secret && secret.length > 0;
  }

  /**
   * Log current configuration (for debugging)
   * Note: Does not log sensitive information like API keys
   */
  logConfiguration(): void {
    this.logger.log('=== Alchemy Configuration ===');
    this.logger.log(`Environment: ${this.getEnvironment()}`);
    this.logger.log(
      `Supported Blockchains: ${this.getSupportedBlockchains().join(', ')}`,
    );
    this.logger.log(`Webhooks Configured: ${this.areWebhooksConfigured()}`);

    // Log network availability (without exposing URLs)
    for (const blockchain of this.getSupportedBlockchains()) {
      const networks = this.getSupportedNetworks(blockchain);
      this.logger.log(`${blockchain} networks: ${networks.join(', ')}`);
    }

    this.logger.log('============================');
  }
}
