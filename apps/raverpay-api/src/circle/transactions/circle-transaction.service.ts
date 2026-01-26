import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CircleTransactionState, CircleTransactionType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CircleApiClient } from '../circle-api.client';
import {
  CircleBlockchain,
  CircleFeeLevel,
  CircleTransaction,
  CreateTransferRequest,
  CreateTransferResponse,
  EstimateFeeRequest,
  EstimateFeeResponse,
} from '../circle.types';
import { CircleConfigService } from '../config/circle.config.service';
import { EntitySecretService } from '../entity/entity-secret.service';
import { CircleWalletService } from '../wallets/circle-wallet.service';
import { FeeConfigurationService } from '../fees/fee-configuration.service';
import { FeeRetryService } from '../fees/fee-retry.service';
import { AuditService } from '../../common/services/audit.service';
import { AuditAction, AuditStatus } from '../../common/types/audit-log.types';

/**
 * Circle Transaction Service
 * Handles USDC transfers and transaction management
 */
@Injectable()
export class CircleTransactionService {
  private readonly logger = new Logger(CircleTransactionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiClient: CircleApiClient,
    private readonly config: CircleConfigService,
    private readonly entitySecret: EntitySecretService,
    private readonly walletService: CircleWalletService,
    private readonly feeConfigService: FeeConfigurationService,
    private readonly feeRetryService: FeeRetryService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a USDC transfer transaction
   */
  async createTransfer(params: {
    userId: string;
    walletId: string;
    destinationAddress: string;
    amount: string;
    blockchain?: CircleBlockchain;
    feeLevel?: CircleFeeLevel;
    memo?: string;
    tokenId?: string;
    tokenAddress?: string;
  }): Promise<{ transactionId: string; reference: string; state: string }> {
    const {
      userId,
      walletId,
      destinationAddress,
      amount,
      blockchain,
      feeLevel = 'MEDIUM',
      memo,
      tokenId,
      tokenAddress: customTokenAddress,
    } = params;

    // Get wallet
    const wallet = await this.walletService.getWallet(walletId, userId);

    // Validate blockchain support (network enabled check)
    const supportedChains = this.config.getSupportedBlockchains();
    if (!supportedChains.includes(wallet.blockchain)) {
      throw new BadRequestException(
        `Network "${wallet.blockchain}" is not currently enabled. Available networks: ${supportedChains.join(', ')}`,
      );
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new BadRequestException('Invalid amount');
    }

    // Calculate service fee
    const serviceFee = await this.feeConfigService.calculateFee(amountNum);
    const totalRequired = amountNum + serviceFee;

    this.logger.log(
      `Transfer requested: ${amount} USDC + ${serviceFee} USDC fee = ${totalRequired} USDC total`,
    );

    // Get token address/ID
    const usdcTokenAddress = this.config.getUsdcTokenAddress(wallet.blockchain);

    // Determine which token to use
    // If tokenId is provided, we use it (highest priority)
    // If customTokenAddress is provided, we use it
    // Otherwise default to USDC
    const activeTokenAddress =
      customTokenAddress || (tokenId ? undefined : usdcTokenAddress);

    if (!tokenId && !activeTokenAddress) {
      throw new BadRequestException(
        `Token not specified and USDC not supported on ${wallet.blockchain}`,
      );
    }

    // Skip balance check and fee for native/other tokens for now if tokenId is provided
    // to keep it simple for gas funding
    const isUsdc =
      !tokenId &&
      (!activeTokenAddress || activeTokenAddress === usdcTokenAddress);

    if (isUsdc) {
      // Check balance (must have amount + fee)
      const balance = await this.walletService.getUsdcBalance(
        wallet.circleWalletId,
      );
      const balanceNum = parseFloat(balance);

      if (balanceNum < totalRequired) {
        throw new BadRequestException(
          `Insufficient balance. Required: ${totalRequired.toFixed(6)} USDC (${amount} + ${serviceFee.toFixed(6)} fee), Available: ${balance} USDC`,
        );
      }
    }

    // Get fee collection wallet for this blockchain
    const collectionWallet = await this.feeConfigService.getCollectionWallet(
      wallet.blockchain,
    );

    if (serviceFee > 0 && !collectionWallet) {
      this.logger.warn(
        `No collection wallet configured for ${wallet.blockchain}, proceeding without fee`,
      );
    }

    try {
      // Generate entity secret ciphertext
      const entitySecretCiphertext =
        await this.entitySecret.generateEntitySecretCiphertext();

      // Generate idempotency key and reference
      const idempotencyKey = this.apiClient.generateIdempotencyKey();
      const reference = `CIR-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

      // STEP 1: Execute main transfer (User → Recipient)
      const mainTransferRequest: CreateTransferRequest = {
        idempotencyKey,
        entitySecretCiphertext,
        walletId: wallet.circleWalletId,
        destinationAddress,
        amounts: [amount],
        tokenAddress: activeTokenAddress ?? undefined,
        tokenId: tokenId,
        blockchain: (blockchain || wallet.blockchain) as CircleBlockchain,
        feeLevel,
        refId: reference,
      };

      this.logger.log(
        `Creating main transfer: ${amount} USDC from ${wallet.address} to ${destinationAddress}`,
      );

      // Audit log: USDC transfer initiated
      const auditStartTime = Date.now();
      await this.auditService.logCrypto(
        AuditAction.USDC_TRANSFER_INITIATED,
        userId,
        {
          walletId: wallet.id,
          walletAddress: wallet.address,
          destinationAddress,
          amount,
          serviceFee,
          totalAmount: totalRequired.toString(),
          blockchain: blockchain || wallet.blockchain,
          feeLevel,
          reference,
          memo,
        },
      );

      let mainTransfer: CreateTransferResponse;
      try {
        const response = await this.apiClient.post<CreateTransferResponse>(
          '/developer/transactions/transfer',
          mainTransferRequest,
        );
        mainTransfer = response.data;
      } catch (error) {
        this.logger.error('Main transfer failed:', error);
        throw new BadRequestException(
          `Transfer failed: ${error.message || 'Unknown error'}`,
        );
      }

      this.logger.log(
        `Main transfer created: ${mainTransfer.id} - State: ${mainTransfer.state}`,
      );

      // STEP 2: Execute fee transfer (User → Company) if applicable
      let feeCollected = false;
      let feeTransfer: CreateTransferResponse | null = null;

      if (serviceFee > 0 && collectionWallet) {
        try {
          const feeIdempotencyKey = this.apiClient.generateIdempotencyKey();
          const feeEntitySecretCiphertext =
            await this.entitySecret.generateEntitySecretCiphertext();

          const feeTransferRequest: CreateTransferRequest = {
            idempotencyKey: feeIdempotencyKey,
            entitySecretCiphertext: feeEntitySecretCiphertext,
            walletId: wallet.circleWalletId,
            destinationAddress: collectionWallet,
            amounts: [serviceFee.toString()],
            tokenAddress: usdcTokenAddress ?? undefined,
            blockchain: (blockchain || wallet.blockchain) as CircleBlockchain,
            feeLevel,
            refId: `FEE-${reference}`,
          };

          this.logger.log(
            `Creating fee transfer: ${serviceFee} USDC from ${wallet.address} to ${collectionWallet}`,
          );

          const feeResponse = await this.apiClient.post<CreateTransferResponse>(
            '/developer/transactions/transfer',
            feeTransferRequest,
          );

          feeTransfer = feeResponse.data;
          feeCollected = true;

          this.logger.log(
            `Fee transfer created: ${feeTransfer.id} - State: ${feeTransfer.state}`,
          );
        } catch (feeError: any) {
          // Fee collection failed - log but don't fail main transaction
          this.logger.error('Fee collection failed:', {
            error: feeError.message,
            mainTransferId: mainTransfer.id,
            fee: serviceFee,
          });

          // Queue for retry (don't await to avoid blocking)
          this.feeRetryService
            .queueFeeRetry({
              walletId: wallet.circleWalletId,
              collectionWallet,
              fee: serviceFee.toString(),
              mainTransferId: mainTransfer.id,
            })
            .catch((err) =>
              this.logger.error('Failed to queue fee retry:', err),
            );
        }
      }

      // STEP 3: Save transaction record to database
      const dbTransaction = await this.prisma.circleTransaction.create({
        data: {
          reference,
          circleTransactionId: mainTransfer.id,
          userId,
          walletId: wallet.id,
          type: CircleTransactionType.TRANSFER,
          state: mainTransfer.state as CircleTransactionState,
          sourceAddress: wallet.address,
          destinationAddress,
          tokenAddress: usdcTokenAddress,
          blockchain: wallet.blockchain,
          amounts: [amount],
          feeLevel,
          refId: memo,
          // Fee fields
          serviceFee: serviceFee > 0 ? serviceFee.toString() : null,
          feeCollected,
          totalAmount: totalRequired.toString(),
          mainTransferId: mainTransfer.id,
          feeTransferId: feeTransfer?.id || null,
        },
      });

      this.logger.log(
        `Transaction saved: ${dbTransaction.id} (${reference}) - Fee collected: ${feeCollected}`,
      );

      // Audit log: USDC transfer completed
      await this.auditService.logCrypto(
        AuditAction.USDC_TRANSFER_COMPLETED,
        userId,
        {
          transactionId: dbTransaction.id,
          circleTransactionId: mainTransfer.id,
          reference,
          walletId: wallet.id,
          walletAddress: wallet.address,
          destinationAddress,
          amount,
          serviceFee,
          totalAmount: totalRequired.toString(),
          blockchain: wallet.blockchain,
          feeLevel,
          feeCollected,
          state: mainTransfer.state,
          executionTimeMs: Date.now() - auditStartTime,
        },
      );

      return {
        transactionId: dbTransaction.id, // Return database ID, not Circle transaction ID
        reference,
        state: mainTransfer.state,
      };
    } catch (error) {
      this.logger.error('Failed to create transfer:', error);

      // Audit log: USDC transfer failed
      await this.auditService.logCrypto(
        AuditAction.USDC_TRANSFER_FAILED,
        userId,
        {
          walletId,
          walletAddress: wallet?.address,
          destinationAddress,
          amount,
          blockchain: blockchain || wallet?.blockchain,
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
        },
        undefined,
        AuditStatus.FAILURE,
      );

      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string, userId?: string) {
    const transaction = await this.prisma.circleTransaction.findFirst({
      where: {
        id: transactionId,
        ...(userId && { userId }),
      },
      include: {
        wallet: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  /**
   * Get transaction by reference
   */
  async getTransactionByReference(reference: string) {
    const transaction = await this.prisma.circleTransaction.findUnique({
      where: { reference },
      include: { wallet: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  /**
   * Get transaction from Circle API
   */
  async getTransactionFromCircle(
    circleTransactionId: string,
  ): Promise<CircleTransaction> {
    try {
      const response = await this.apiClient.get<{
        transaction: CircleTransaction;
      }>(`/transactions/${circleTransactionId}`);
      return response.data.transaction;
    } catch (error) {
      this.logger.error(
        `Failed to get transaction from Circle ${circleTransactionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get user's transactions
   */
  async getUserTransactions(
    userId: string,
    params?: {
      type?: CircleTransactionType;
      state?: CircleTransactionState;
      limit?: number;
      offset?: number;
    },
  ) {
    const { type, state, limit = 20, offset = 0 } = params || {};

    return this.prisma.circleTransaction.findMany({
      where: {
        userId,
        ...(type && { type }),
        ...(state && { state }),
      },
      include: { wallet: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Estimate transfer fee
   */
  async estimateFee(params: {
    walletId: string;
    destinationAddress: string;
    amount: string;
    blockchain?: CircleBlockchain;
  }): Promise<EstimateFeeResponse> {
    const { walletId, destinationAddress, amount, blockchain } = params;

    // Get wallet from database
    const wallet = await this.prisma.circleWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const usdcTokenAddress = this.config.getUsdcTokenAddress(wallet.blockchain);

    const request: EstimateFeeRequest = {
      walletId: wallet.circleWalletId,
      destinationAddress,
      amounts: [amount],
      tokenAddress: usdcTokenAddress || undefined,
      blockchain: (blockchain || wallet.blockchain) as CircleBlockchain,
    };

    try {
      const response = await this.apiClient.post<EstimateFeeResponse>(
        '/transactions/transfer/estimateFee',
        request,
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to estimate fee:', error);
      throw error;
    }
  }

  /**
   * Cancel a pending transaction
   */
  async cancelTransaction(
    transactionId: string,
    userId: string,
  ): Promise<void> {
    const transaction = await this.getTransaction(transactionId, userId);

    // Only pending transactions can be cancelled
    if (!['INITIATED', 'QUEUED'].includes(transaction.state)) {
      throw new BadRequestException(
        'Only pending transactions can be cancelled',
      );
    }

    try {
      // Generate entity secret ciphertext
      const entitySecretCiphertext =
        await this.entitySecret.generateEntitySecretCiphertext();

      const idempotencyKey = this.apiClient.generateIdempotencyKey();

      await this.apiClient.post(
        `/transactions/${transaction.circleTransactionId}/cancel`,
        {
          idempotencyKey,
          entitySecretCiphertext,
        },
      );

      // Update database
      await this.prisma.circleTransaction.update({
        where: { id: transactionId },
        data: {
          state: CircleTransactionState.CANCELLED,
          cancelledDate: new Date(),
        },
      });

      this.logger.log(`Transaction cancelled: ${transactionId}`);
    } catch (error) {
      this.logger.error(
        `Failed to cancel transaction ${transactionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Accelerate a stuck transaction
   */
  async accelerateTransaction(
    transactionId: string,
    userId: string,
  ): Promise<void> {
    const transaction = await this.getTransaction(transactionId, userId);

    // Only stuck or sent transactions can be accelerated
    if (!['SENT', 'STUCK'].includes(transaction.state)) {
      throw new BadRequestException(
        'Only sent or stuck transactions can be accelerated',
      );
    }

    try {
      // Generate entity secret ciphertext
      const entitySecretCiphertext =
        await this.entitySecret.generateEntitySecretCiphertext();

      const idempotencyKey = this.apiClient.generateIdempotencyKey();

      await this.apiClient.post(
        `/transactions/${transaction.circleTransactionId}/accelerate`,
        {
          idempotencyKey,
          entitySecretCiphertext,
        },
      );

      this.logger.log(`Transaction accelerated: ${transactionId}`);
    } catch (error) {
      this.logger.error(
        `Failed to accelerate transaction ${transactionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Sync transaction state from Circle
   */
  async syncTransaction(circleTransactionId: string): Promise<void> {
    try {
      const circleTransaction =
        await this.getTransactionFromCircle(circleTransactionId);

      await this.prisma.circleTransaction.updateMany({
        where: { circleTransactionId },
        data: {
          state: circleTransaction.state as CircleTransactionState,
          transactionHash: circleTransaction.txHash,
          blockNumber: circleTransaction.blockHeight,
          blockHash: circleTransaction.blockHash,
          networkFee: circleTransaction.networkFee,
          networkFeeUsd: circleTransaction.networkFeeUsd,
          firstConfirmDate: circleTransaction.firstConfirmDate
            ? new Date(circleTransaction.firstConfirmDate)
            : undefined,
          errorMessage: circleTransaction.errorDetails?.message,
          errorCode: circleTransaction.errorDetails?.code,
          errorReason: circleTransaction.errorReason,
        },
      });

      this.logger.log(
        `Transaction synced: ${circleTransactionId} - State: ${circleTransaction.state}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to sync transaction ${circleTransactionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * List transactions from Circle API
   */
  async listTransactionsFromCircle(params?: {
    walletIds?: string[];
    txHash?: string;
    state?: string;
    from?: string;
    to?: string;
    pageSize?: number;
    pageBefore?: string;
    pageAfter?: string;
  }): Promise<CircleTransaction[]> {
    try {
      const response = await this.apiClient.get<{
        transactions: CircleTransaction[];
      }>('/transactions', params);
      return response.data.transactions;
    } catch (error) {
      this.logger.error('Failed to list transactions from Circle:', error);
      throw error;
    }
  }

  /**
   * Validate destination address
   */
  async validateAddress(
    address: string,
    blockchain: CircleBlockchain,
  ): Promise<boolean> {
    try {
      const response = await this.apiClient.post<{ isValid: boolean }>(
        '/transactions/validateAddress',
        { address, blockchain },
      );
      return response.data.isValid;
    } catch (error) {
      this.logger.error('Failed to validate address:', error);
      return false;
    }
  }
}
