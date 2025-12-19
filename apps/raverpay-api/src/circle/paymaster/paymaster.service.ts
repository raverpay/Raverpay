import { Injectable, Logger } from '@nestjs/common';
import { CircleConfigService } from '../config/circle.config.service';
import { CircleApiClient } from '../circle-api.client';
import { EntitySecretService } from '../entity/entity-secret.service';
import { CircleBlockchain, CircleFeeLevel } from '../circle.types';

/**
 * Paymaster Configuration per blockchain
 */
interface PaymasterConfig {
  blockchain: CircleBlockchain;
  paymasterAddress: string;
  supportedTokens: string[];
  surchargePercent: number; // 10% surcharge on some chains
  minGasPrice?: string;
  maxGasPrice?: string;
}

/**
 * Sponsored transaction request
 */
export interface SponsoredTransactionRequest {
  walletId: string;
  destinationAddress: string;
  amount: string;
  blockchain: CircleBlockchain;
  feeLevel?: CircleFeeLevel;
  memo?: string;
}

/**
 * Sponsored transaction response
 */
export interface SponsoredTransactionResponse {
  transactionId: string;
  circleTransactionId: string;
  state: string;
  gasPaidInUsdc: string;
  estimatedGas: string;
  surcharge: string;
  totalUsdcFee: string;
}

/**
 * Fee estimate for sponsored transaction
 */
export interface PaymasterFeeEstimate {
  estimatedGasInNative: string;
  estimatedGasInUsdc: string;
  surchargePercent: number;
  surchargeAmount: string;
  totalFeeInUsdc: string;
  feeLevel: CircleFeeLevel;
  blockchain: CircleBlockchain;
}

/**
 * Paymaster Service
 *
 * Handles gas fee sponsorship using Circle's Paymaster functionality.
 * Allows users to pay gas fees in USDC instead of native tokens (ETH, MATIC, etc.)
 *
 * Key features:
 * - Estimate gas fees in USDC
 * - Submit transactions with USDC gas payment
 * - 10% surcharge on some chains (as per Circle's policy)
 * - Support for ERC-4337 smart contract wallets
 *
 * @see https://developers.circle.com/w3s/docs/paymaster
 */
@Injectable()
export class PaymasterService {
  private readonly logger = new Logger(PaymasterService.name);

  /**
   * Paymaster configurations per blockchain
   * Note: Paymaster is currently supported on:
   * - Polygon (MATIC/MATIC-AMOY)
   * - Arbitrum (ARB/ARB-SEPOLIA)
   * - Base
   *
   * Surcharge: 10% on most chains
   */
  private readonly paymasterConfigs: Record<string, PaymasterConfig> = {
    MATIC: {
      blockchain: 'MATIC',
      paymasterAddress: '0x...', // Will be populated from Circle API
      supportedTokens: ['USDC'],
      surchargePercent: 10,
    },
    'MATIC-AMOY': {
      blockchain: 'MATIC-AMOY',
      paymasterAddress: '0x...',
      supportedTokens: ['USDC'],
      surchargePercent: 10,
    },
    ARB: {
      blockchain: 'ARB',
      paymasterAddress: '0x...',
      supportedTokens: ['USDC'],
      surchargePercent: 10,
    },
    'ARB-SEPOLIA': {
      blockchain: 'ARB-SEPOLIA',
      paymasterAddress: '0x...',
      supportedTokens: ['USDC'],
      surchargePercent: 10,
    },
  };

  constructor(
    private readonly config: CircleConfigService,
    private readonly apiClient: CircleApiClient,
    private readonly entitySecretService: EntitySecretService,
  ) {}

  /**
   * Check if Paymaster is supported for a given blockchain
   */
  isPaymasterSupported(blockchain: CircleBlockchain): boolean {
    return blockchain in this.paymasterConfigs;
  }

  /**
   * Get supported blockchains for Paymaster
   */
  getSupportedBlockchains(): CircleBlockchain[] {
    return Object.keys(this.paymasterConfigs) as CircleBlockchain[];
  }

  /**
   * Get Paymaster configuration for a blockchain
   */
  getPaymasterConfig(blockchain: CircleBlockchain): PaymasterConfig | null {
    return this.paymasterConfigs[blockchain] || null;
  }

  /**
   * Estimate gas fee in USDC for a transaction
   *
   * @param walletId - The Circle wallet ID
   * @param destinationAddress - The recipient address
   * @param amount - The USDC amount to send
   * @param blockchain - The blockchain to use
   * @param feeLevel - The fee level (LOW, MEDIUM, HIGH)
   * @returns Fee estimate in USDC
   */
  async estimateFeeInUsdc(
    walletId: string,
    destinationAddress: string,
    amount: string,
    blockchain: CircleBlockchain,
    feeLevel: CircleFeeLevel = 'MEDIUM',
  ): Promise<PaymasterFeeEstimate> {
    if (!this.isPaymasterSupported(blockchain)) {
      throw new Error(`Paymaster not supported for blockchain: ${blockchain}`);
    }

    const config = this.paymasterConfigs[blockchain];

    try {
      // Get entity secret ciphertext
      const entitySecretCiphertext =
        await this.entitySecretService.generateEntitySecretCiphertext();

      // Call Circle API to estimate gas
      const response = await this.apiClient.post<{
        baseFee: string;
        priorityFee: string;
        maxFee: string;
        estimatedGas: string;
      }>('/transactions/estimateFee', {
        walletId,
        destinationAddress,
        amount: [
          { amount, tokenId: this.config.getUsdcTokenAddress(blockchain) },
        ],
        blockchain,
        feeLevel,
        entitySecretCiphertext,
      });

      const { baseFee, maxFee, estimatedGas } = response.data;

      // Calculate USDC equivalent
      // In a real implementation, this would use current gas prices and token prices
      // For now, we use the native fee as USDC (simplified)
      const estimatedGasInUsdc = maxFee;
      const surchargeAmount = (
        (parseFloat(estimatedGasInUsdc) * config.surchargePercent) /
        100
      ).toFixed(6);
      const totalFeeInUsdc = (
        parseFloat(estimatedGasInUsdc) + parseFloat(surchargeAmount)
      ).toFixed(6);

      return {
        estimatedGasInNative: estimatedGas,
        estimatedGasInUsdc,
        surchargePercent: config.surchargePercent,
        surchargeAmount,
        totalFeeInUsdc,
        feeLevel,
        blockchain,
      };
    } catch (error) {
      this.logger.error(`Failed to estimate Paymaster fee: ${error}`);
      throw error;
    }
  }

  /**
   * Create a transaction with gas paid in USDC (Paymaster)
   *
   * For SCA (Smart Contract Account) wallets, the gas fee is automatically
   * deducted from the USDC balance using the Paymaster.
   *
   * @param request - The sponsored transaction request
   * @returns Transaction details with USDC fee breakdown
   */
  async createSponsoredTransaction(
    request: SponsoredTransactionRequest,
  ): Promise<SponsoredTransactionResponse> {
    const {
      walletId,
      destinationAddress,
      amount,
      blockchain,
      feeLevel = 'MEDIUM',
      memo,
    } = request;

    if (!this.isPaymasterSupported(blockchain)) {
      throw new Error(`Paymaster not supported for blockchain: ${blockchain}`);
    }

    try {
      // First, estimate the fee
      const feeEstimate = await this.estimateFeeInUsdc(
        walletId,
        destinationAddress,
        amount,
        blockchain,
        feeLevel,
      );

      // Get entity secret ciphertext
      const entitySecretCiphertext =
        await this.entitySecretService.generateEntitySecretCiphertext();

      // Create transaction with Paymaster
      // Note: For SCA wallets, Circle automatically uses Paymaster when available
      const response = await this.apiClient.post<{
        transaction: {
          id: string;
          state: string;
        };
      }>('/developer/transactions/transfer', {
        walletId,
        destinationAddress,
        amounts: [
          { amount, tokenId: this.config.getUsdcTokenAddress(blockchain) },
        ],
        blockchain,
        feeLevel,
        entitySecretCiphertext,
        refId: memo,
        // Enable Paymaster for gas payment in USDC
        gasOptions: {
          paymaster: true,
          paymasterToken: 'USDC',
        },
      });

      const { id, state } = response.data.transaction;

      return {
        transactionId: id,
        circleTransactionId: id,
        state,
        gasPaidInUsdc: feeEstimate.estimatedGasInUsdc,
        estimatedGas: feeEstimate.estimatedGasInNative,
        surcharge: feeEstimate.surchargeAmount,
        totalUsdcFee: feeEstimate.totalFeeInUsdc,
      };
    } catch (error) {
      this.logger.error(`Failed to create sponsored transaction: ${error}`);
      throw error;
    }
  }

  /**
   * Check if a wallet supports Paymaster (requires SCA wallet type)
   *
   * Only Smart Contract Account (SCA) wallets can use Paymaster.
   * EOA wallets require native tokens for gas.
   *
   * @param walletId - The wallet ID to check
   * @returns Whether the wallet supports Paymaster
   */
  async isWalletPaymasterCompatible(walletId: string): Promise<boolean> {
    try {
      const response = await this.apiClient.get<{
        wallet: {
          accountType: 'EOA' | 'SCA';
        };
      }>(`/developer/wallets/${walletId}`);

      return response.data.wallet.accountType === 'SCA';
    } catch (error) {
      this.logger.error(
        `Failed to check wallet Paymaster compatibility: ${error}`,
      );
      return false;
    }
  }

  /**
   * Get Paymaster usage stats for a wallet
   *
   * @param walletId - The wallet ID
   * @returns Usage statistics
   */
  async getPaymasterUsageStats(walletId: string): Promise<{
    totalTransactions: number;
    totalGasPaidUsdc: string;
    totalSurchargeUsdc: string;
    averageGasPerTx: string;
  }> {
    // This would query the database for Paymaster usage
    // For now, return placeholder data
    return {
      totalTransactions: 0,
      totalGasPaidUsdc: '0',
      totalSurchargeUsdc: '0',
      averageGasPerTx: '0',
    };
  }
}
