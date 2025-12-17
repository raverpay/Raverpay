import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CircleApiClient } from '../circle-api.client';
import { CircleConfigService } from '../config/circle.config.service';
import { EntitySecretService } from '../entity/entity-secret.service';
import { CircleWalletService } from '../wallets/circle-wallet.service';
import {
  CircleBlockchain,
  CircleFeeLevel,
  CreateTransferResponse,
} from '../circle.types';
import { CCTPTransferState } from '@prisma/client';
import { randomUUID } from 'crypto';

/**
 * CCTP (Cross-Chain Transfer Protocol) Service
 * Handles native USDC transfers between blockchains
 */
@Injectable()
export class CCTPService {
  private readonly logger = new Logger(CCTPService.name);

  // Supported CCTP chains and their domain identifiers
  private readonly cctpDomains: Record<string, number> = {
    ETH: 0,
    'ETH-SEPOLIA': 0,
    AVAX: 1,
    'AVAX-FUJI': 1,
    OP: 2,
    'OP-SEPOLIA': 2,
    ARB: 3,
    'ARB-SEPOLIA': 3,
    BASE: 6,
    'BASE-SEPOLIA': 6,
    MATIC: 7,
    'MATIC-AMOY': 7,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiClient: CircleApiClient,
    private readonly config: CircleConfigService,
    private readonly entitySecret: EntitySecretService,
    private readonly walletService: CircleWalletService,
  ) {}

  /**
   * Initiate a CCTP cross-chain transfer
   * Burns USDC on source chain, mints on destination chain
   */
  async initiateTransfer(params: {
    userId: string;
    sourceWalletId: string;
    destinationAddress: string;
    destinationChain: CircleBlockchain;
    amount: string;
    transferType?: 'STANDARD' | 'FAST';
    feeLevel?: CircleFeeLevel;
  }): Promise<{
    reference: string;
    transferId: string;
    state: CCTPTransferState;
  }> {
    const {
      userId,
      sourceWalletId,
      destinationAddress,
      destinationChain,
      amount,
      transferType = 'STANDARD',
      feeLevel = 'MEDIUM',
    } = params;

    // Get source wallet
    const sourceWallet = await this.walletService.getWallet(
      sourceWalletId,
      userId,
    );

    // Validate chains support CCTP
    if (!this.isCCTPSupported(sourceWallet.blockchain)) {
      throw new BadRequestException(
        `Source chain ${sourceWallet.blockchain} does not support CCTP`,
      );
    }

    if (!this.isCCTPSupported(destinationChain)) {
      throw new BadRequestException(
        `Destination chain ${destinationChain} does not support CCTP`,
      );
    }

    // Validate same chain is not allowed
    if (
      this.cctpDomains[sourceWallet.blockchain] ===
      this.cctpDomains[destinationChain]
    ) {
      throw new BadRequestException(
        'Source and destination chains must be different',
      );
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new BadRequestException('Invalid amount');
    }

    // Check balance
    const balance = await this.walletService.getUsdcBalance(
      sourceWallet.circleWalletId,
    );
    if (parseFloat(balance) < amountNum) {
      throw new BadRequestException('Insufficient USDC balance');
    }

    try {
      // Generate reference
      const reference = `CCTP-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

      // Create CCTP transfer record first
      const cctpTransfer = await this.prisma.circleCCTPTransfer.create({
        data: {
          reference,
          userId,
          sourceWalletId: sourceWallet.id,
          sourceChain: sourceWallet.blockchain,
          destinationChain,
          destinationAddress,
          amount,
          transferType,
          state: CCTPTransferState.INITIATED,
        },
      });

      // Generate entity secret ciphertext
      const entitySecretCiphertext =
        await this.entitySecret.generateEntitySecretCiphertext();

      // Generate idempotency key
      const idempotencyKey = this.apiClient.generateIdempotencyKey();

      // Get USDC token address on source chain
      const usdcTokenAddress = this.config.getUsdcTokenAddress(
        sourceWallet.blockchain,
      );

      // Create burn transaction (first step of CCTP)
      const burnRequest = {
        idempotencyKey,
        entitySecretCiphertext,
        walletId: sourceWallet.circleWalletId,
        destinationAddress,
        amounts: [amount],
        tokenAddress: usdcTokenAddress,
        blockchain: sourceWallet.blockchain,
        feeLevel,
        refId: reference,
        // CCTP-specific parameters
        destinationDomain: this.cctpDomains[destinationChain],
      };

      this.logger.log(
        `Initiating CCTP transfer: ${amount} USDC from ${sourceWallet.blockchain} to ${destinationChain}`,
      );

      // For CCTP, we use a special endpoint or include CCTP parameters
      // This initiates the burn on the source chain
      const response = await this.apiClient.post<CreateTransferResponse>(
        '/developer/transactions/transfer',
        burnRequest,
      );

      // Update CCTP transfer with burn transaction ID
      await this.prisma.circleCCTPTransfer.update({
        where: { id: cctpTransfer.id },
        data: {
          burnTransactionId: response.data.id,
          state: CCTPTransferState.BURN_PENDING,
        },
      });

      this.logger.log(
        `CCTP transfer initiated: ${reference} - Burn transaction: ${response.data.id}`,
      );

      return {
        reference,
        transferId: cctpTransfer.id,
        state: CCTPTransferState.BURN_PENDING,
      };
    } catch (error) {
      this.logger.error('Failed to initiate CCTP transfer:', error);
      throw error;
    }
  }

  /**
   * Get CCTP transfer by ID
   */
  async getTransfer(transferId: string, userId?: string) {
    const transfer = await this.prisma.circleCCTPTransfer.findFirst({
      where: {
        id: transferId,
        ...(userId && { userId }),
      },
    });

    if (!transfer) {
      throw new NotFoundException('CCTP transfer not found');
    }

    return transfer;
  }

  /**
   * Get CCTP transfer by reference
   */
  async getTransferByReference(reference: string) {
    const transfer = await this.prisma.circleCCTPTransfer.findUnique({
      where: { reference },
    });

    if (!transfer) {
      throw new NotFoundException('CCTP transfer not found');
    }

    return transfer;
  }

  /**
   * Get user's CCTP transfers
   */
  async getUserTransfers(
    userId: string,
    params?: {
      state?: CCTPTransferState;
      limit?: number;
      offset?: number;
    },
  ) {
    const { state, limit = 20, offset = 0 } = params || {};

    return this.prisma.circleCCTPTransfer.findMany({
      where: {
        userId,
        ...(state && { state }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Check if a blockchain supports CCTP
   */
  isCCTPSupported(blockchain: string): boolean {
    return blockchain in this.cctpDomains;
  }

  /**
   * Get CCTP domain ID for a blockchain
   */
  getCCTPDomain(blockchain: string): number | null {
    return this.cctpDomains[blockchain] || null;
  }

  /**
   * Get supported CCTP chains
   */
  getSupportedChains(): string[] {
    const environment = this.config.environment;

    if (environment === 'testnet') {
      return [
        'ETH-SEPOLIA',
        'AVAX-FUJI',
        'OP-SEPOLIA',
        'ARB-SEPOLIA',
        'BASE-SEPOLIA',
        'MATIC-AMOY',
      ];
    }

    return ['ETH', 'AVAX', 'OP', 'ARB', 'BASE', 'MATIC'];
  }

  /**
   * Update transfer state based on burn transaction completion
   */
  async updateBurnStatus(
    transferId: string,
    burnTxHash: string,
    attestationHash?: string,
  ): Promise<void> {
    await this.prisma.circleCCTPTransfer.update({
      where: { id: transferId },
      data: {
        burnTransactionHash: burnTxHash,
        attestationHash,
        state: attestationHash
          ? CCTPTransferState.ATTESTATION_RECEIVED
          : CCTPTransferState.BURN_CONFIRMED,
        burnConfirmedAt: new Date(),
        ...(attestationHash && { attestationReceivedAt: new Date() }),
      },
    });

    this.logger.log(
      `CCTP burn confirmed: ${transferId} - TxHash: ${burnTxHash}`,
    );
  }

  /**
   * Update transfer state after mint completion
   */
  async updateMintStatus(
    transferId: string,
    mintTxHash: string,
    mintTransactionId: string,
  ): Promise<void> {
    await this.prisma.circleCCTPTransfer.update({
      where: { id: transferId },
      data: {
        mintTransactionHash: mintTxHash,
        mintTransactionId,
        state: CCTPTransferState.COMPLETED,
        mintConfirmedAt: new Date(),
        completedAt: new Date(),
      },
    });

    this.logger.log(
      `CCTP transfer completed: ${transferId} - Mint TxHash: ${mintTxHash}`,
    );
  }

  /**
   * Mark transfer as failed
   */
  async markTransferFailed(
    transferId: string,
    errorCode: string,
    errorMessage: string,
  ): Promise<void> {
    await this.prisma.circleCCTPTransfer.update({
      where: { id: transferId },
      data: {
        state: CCTPTransferState.FAILED,
        errorCode,
        errorMessage,
      },
    });

    this.logger.error(`CCTP transfer failed: ${transferId} - ${errorMessage}`);
  }

  /**
   * Cancel a pending transfer
   */
  async cancelTransfer(transferId: string, userId: string): Promise<void> {
    const transfer = await this.getTransfer(transferId, userId);

    // Only transfers in early states can be cancelled
    const cancellableStates: CCTPTransferState[] = [
      CCTPTransferState.INITIATED,
      CCTPTransferState.BURN_PENDING,
    ];
    if (!cancellableStates.includes(transfer.state)) {
      throw new BadRequestException(
        'Transfer cannot be cancelled at this stage',
      );
    }

    await this.prisma.circleCCTPTransfer.update({
      where: { id: transferId },
      data: { state: CCTPTransferState.CANCELLED },
    });

    this.logger.log(`CCTP transfer cancelled: ${transferId}`);
  }

  /**
   * Estimate CCTP transfer fee
   * Includes source chain gas + attestation service fee
   */
  estimateFee(params: {
    sourceChain: string;
    destinationChain: string;
    amount: string;
    transferType?: 'STANDARD' | 'FAST';
  }): {
    sourceFee: string;
    attestationFee: string;
    totalFee: string;
    estimatedTime: string;
  } {
    const {
      sourceChain,
      destinationChain,
      // amount is received but not used in current implementation
      transferType = 'STANDARD',
    } = params;

    // Validate chains
    if (!this.isCCTPSupported(sourceChain)) {
      throw new BadRequestException(
        `Source chain ${sourceChain} does not support CCTP`,
      );
    }
    if (!this.isCCTPSupported(destinationChain)) {
      throw new BadRequestException(
        `Destination chain ${destinationChain} does not support CCTP`,
      );
    }

    // These are estimates - in production, you'd fetch from Circle's API
    const sourceFee = '0.50'; // $0.50 for source chain gas
    const attestationFee = transferType === 'FAST' ? '1.00' : '0.00'; // Fast transfer has a fee
    const totalFee = (
      parseFloat(sourceFee) + parseFloat(attestationFee)
    ).toFixed(2);
    const estimatedTime =
      transferType === 'FAST' ? '~1-3 minutes' : '~15-30 minutes';

    return {
      sourceFee,
      attestationFee,
      totalFee,
      estimatedTime,
    };
  }
}
