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
  }): Promise<{ transactionId: string; reference: string; state: string }> {
    const {
      userId,
      walletId,
      destinationAddress,
      amount,
      blockchain,
      feeLevel = 'MEDIUM',
      memo,
    } = params;

    // Get wallet
    const wallet = await this.walletService.getWallet(walletId, userId);

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new BadRequestException('Invalid amount');
    }

    // Get USDC token address
    const usdcTokenAddress = this.config.getUsdcTokenAddress(wallet.blockchain);
    if (!usdcTokenAddress) {
      throw new BadRequestException(
        `USDC not supported on ${wallet.blockchain}`,
      );
    }

    // Check balance
    const balance = await this.walletService.getUsdcBalance(
      wallet.circleWalletId,
    );
    if (parseFloat(balance) < amountNum) {
      throw new BadRequestException('Insufficient USDC balance');
    }

    try {
      // Generate entity secret ciphertext
      const entitySecretCiphertext =
        await this.entitySecret.generateEntitySecretCiphertext();

      // Generate idempotency key and reference
      const idempotencyKey = this.apiClient.generateIdempotencyKey();
      const reference = `CIR-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

      const request: CreateTransferRequest = {
        idempotencyKey,
        entitySecretCiphertext,
        walletId: wallet.circleWalletId,
        destinationAddress,
        amounts: [amount],
        tokenAddress: usdcTokenAddress,
        blockchain: (blockchain || wallet.blockchain) as CircleBlockchain,
        feeLevel,
        refId: reference,
      };

      this.logger.log(
        `Creating transfer: ${amount} USDC from ${wallet.address} to ${destinationAddress}`,
      );

      const response = await this.apiClient.post<CreateTransferResponse>(
        '/developer/transactions/transfer',
        request,
      );

      const transaction = response.data;

      // Save to database
      const dbTransaction = await this.prisma.circleTransaction.create({
        data: {
          reference,
          circleTransactionId: transaction.id,
          userId,
          walletId: wallet.id,
          type: CircleTransactionType.TRANSFER,
          state: transaction.state as CircleTransactionState,
          sourceAddress: wallet.address,
          destinationAddress,
          tokenAddress: usdcTokenAddress,
          blockchain: wallet.blockchain,
          amounts: [amount],
          feeLevel,
          refId: memo,
        },
      });

      this.logger.log(
        `Transfer created: ${transaction.id} (${reference}) - State: ${transaction.state}`,
      );

      return {
        transactionId: dbTransaction.id, // Return database ID, not Circle transaction ID
        reference,
        state: transaction.state,
      };
    } catch (error) {
      this.logger.error('Failed to create transfer:', error);
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
