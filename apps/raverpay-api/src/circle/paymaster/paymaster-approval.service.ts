import { Injectable, Logger } from '@nestjs/common';
import { CircleApiClient } from '../circle-api.client';
import { CircleConfigService } from '../config/circle.config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CircleBlockchain } from '../circle.types';

/**
 * Paymaster Approval Service
 * Handles USDC approvals for Paymaster contract
 */
@Injectable()
export class PaymasterApprovalService {
  private readonly logger = new Logger(PaymasterApprovalService.name);

  // Paymaster addresses (same as in PaymasterServiceV2)
  private readonly PAYMASTER_ADDRESSES = {
    mainnet: '0x0578cFB241215b77442a541325d6A4E6dFE700Ec',
    testnet: '0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966',
  };

  constructor(
    private readonly circleApi: CircleApiClient,
    private readonly config: CircleConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Approve Paymaster to spend USDC for a wallet
   * This is a one-time operation per wallet
   */
  async approvePaymaster(params: {
    walletId: string;
    blockchain: CircleBlockchain;
  }) {
    const { walletId, blockchain } = params;

    this.logger.log(
      `Approving Paymaster for wallet ${walletId} on ${blockchain}`,
    );

    // Get wallet details
    const wallet = await this.prisma.circleWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (wallet.accountType !== 'SCA') {
      throw new Error('Only SCA wallets support Paymaster');
    }

    // Get addresses
    const paymasterAddress = this.getPaymasterAddress(blockchain);
    const usdcAddress = this.config.getUsdcTokenAddress(blockchain);

    if (!usdcAddress) {
      throw new Error(`USDC not supported on ${blockchain}`);
    }

    // Create approval transaction via Circle API
    // This approves the Paymaster to spend unlimited USDC
    const approvalAmount =
      '115792089237316195423570985008687907853269984665640564039457584007913129639935'; // Max uint256

    try {
      // Generate entity secret ciphertext
      const entitySecretCiphertext = await this.circleApi.post<{
        ciphertext: string;
      }>('/developer/entitySecrets/generate', {});

      // Use Circle's transfer API with approve function
      // This creates an ERC-20 approve transaction
      const response = await this.circleApi.post<{ id: string }>(
        '/developer/transactions/transfer',
        {
          idempotencyKey: this.circleApi.generateIdempotencyKey(),
          entitySecretCiphertext: entitySecretCiphertext.data.ciphertext,
          walletId: wallet.circleWalletId,
          destinationAddress: paymasterAddress,
          amounts: [approvalAmount],
          tokenAddress: usdcAddress,
          blockchain,
          feeLevel: 'MEDIUM',
          refId: `PAYMASTER_APPROVAL_${Date.now()}`,
        },
      );

      this.logger.log(
        `Approval transaction created: ${response.data?.id || 'unknown'}`,
      );

      return {
        success: true,
        transactionId: response.data?.id,
        paymasterAddress,
        message: 'Paymaster approval transaction submitted',
      };
    } catch (error) {
      this.logger.error(`Failed to approve Paymaster: ${error.message}`);
      throw new Error(`Failed to approve Paymaster: ${error.message}`);
    }
  }

  /**
   * Check if wallet has approved Paymaster
   * This checks the on-chain allowance
   */
  async checkApproval(params: {
    walletId: string;
    blockchain: CircleBlockchain;
  }): Promise<{
    isApproved: boolean;
    allowance: string;
    paymasterAddress: string;
  }> {
    const { walletId, blockchain } = params;

    const wallet = await this.prisma.circleWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const paymasterAddress = this.getPaymasterAddress(blockchain);
    const usdcAddress = this.config.getUsdcTokenAddress(blockchain);

    if (!usdcAddress) {
      throw new Error(`USDC not supported on ${blockchain}`);
    }

    try {
      // Query the allowance from Circle API or blockchain
      // For now, we'll return a placeholder
      // In production, you'd query the actual on-chain allowance

      this.logger.log(
        `Checking approval for wallet ${walletId} on ${blockchain}`,
      );

      // TODO: Implement actual allowance check via Circle API or RPC
      // For now, return false to trigger approval flow
      return {
        isApproved: false,
        allowance: '0',
        paymasterAddress,
      };
    } catch (error) {
      this.logger.error(`Failed to check approval: ${error.message}`);
      throw new Error(`Failed to check approval: ${error.message}`);
    }
  }

  /**
   * Get Paymaster address for blockchain
   */
  private getPaymasterAddress(blockchain: CircleBlockchain): string {
    const isTestnet =
      blockchain.includes('SEPOLIA') ||
      blockchain.includes('FUJI') ||
      blockchain.includes('AMOY') ||
      blockchain.includes('TESTNET');

    return isTestnet
      ? this.PAYMASTER_ADDRESSES.testnet
      : this.PAYMASTER_ADDRESSES.mainnet;
  }
}
