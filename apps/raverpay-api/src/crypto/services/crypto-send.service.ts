import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VenlyService } from '../venly/venly.service';
import { VenlyUserService } from '../venly/venly-user.service';
import { CryptoWalletService } from './crypto-wallet.service';
import { CryptoBalanceService } from './crypto-balance.service';
import {
  CryptoTransactionType,
  TransactionDirection,
  CryptoTransactionStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface SendCryptoParams {
  userId: string;
  tokenSymbol: string;
  toAddress: string;
  amount: string;
  pin: string;
  memo?: string;
}

/**
 * Crypto Send Service
 * Handles outgoing crypto transactions
 */
@Injectable()
export class CryptoSendService {
  private readonly logger = new Logger(CryptoSendService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly venly: VenlyService,
    private readonly venlyUser: VenlyUserService,
    private readonly cryptoWallet: CryptoWalletService,
    private readonly cryptoBalance: CryptoBalanceService,
  ) {}

  /**
   * Send crypto to external address
   */
  async sendCrypto(params: SendCryptoParams) {
    const { userId, tokenSymbol, toAddress, amount, pin, memo } = params;

    try {
      this.logger.log(
        `User ${userId} sending ${amount} ${tokenSymbol} to ${toAddress}`,
      );

      // 1. Validate inputs
      await this.validateSendRequest(params);

      // 2. Get wallet
      const wallet = await this.cryptoWallet.getCryptoWallet(userId);

      if (!wallet.venlyWalletId) {
        throw new Error('Venly wallet ID not found');
      }

      // 3. Check balance
      const hasSufficient = await this.cryptoBalance.hasSufficientBalance(
        userId,
        tokenSymbol,
        Number(amount),
      );

      if (!hasSufficient) {
        throw new BadRequestException(`Insufficient ${tokenSymbol} balance`);
      }

      // 4. Get signing method
      const signingMethod = await this.venlyUser.getSigningMethodHeader(
        userId,
        pin,
      );

      // 5. Execute transaction via Venly (official API format)
      let venlyTransaction;

      if (tokenSymbol === 'MATIC') {
        venlyTransaction = await this.venly.sendMATIC(
          wallet.venlyWalletId,
          toAddress,
          amount,
          signingMethod,
        );
      } else if (tokenSymbol === 'USDT') {
        venlyTransaction = await this.venly.sendUSDT(
          wallet.venlyWalletId,
          toAddress,
          amount,
          signingMethod,
        );
      } else if (tokenSymbol === 'USDC') {
        venlyTransaction = await this.venly.sendUSDC(
          wallet.venlyWalletId,
          toAddress,
          amount,
          signingMethod,
        );
      } else {
        throw new BadRequestException(`Unsupported token: ${tokenSymbol}`);
      }

      this.logger.log(
        `Venly transaction submitted: ${venlyTransaction.transactionHash}`,
      );
      if (venlyTransaction.id) {
        this.logger.log(`Venly transaction ID: ${venlyTransaction.id}`);
      }

      // 6. Get token details
      const tokenBalance = await this.cryptoBalance.getTokenBalance(
        wallet.id,
        tokenSymbol,
      );
      const usdPrice = Number(tokenBalance?.usdPrice || 0);
      const usdValue = Number(amount) * usdPrice;

      // 7. Create transaction record
      const transaction = await this.prisma.cryptoTransaction.create({
        data: {
          reference: `TXN_CRYPTO_${Date.now()}`,
          transactionHash: venlyTransaction.transactionHash,
          userId,
          walletId: wallet.id,
          type: CryptoTransactionType.SEND,
          direction: TransactionDirection.OUTGOING,
          fromAddress: wallet.walletAddress!,
          toAddress,
          tokenSymbol,
          tokenAddress: tokenBalance?.tokenAddress || null,
          tokenDecimals: tokenBalance?.tokenDecimals || 6,
          amount: new Decimal(amount),
          rawAmount: amount, // Can be refined later
          usdValue: new Decimal(usdValue),
          network: 'MATIC',
          status: CryptoTransactionStatus.PENDING,
          memo,
          submittedAt: new Date(),
        },
      });

      this.logger.log(`Transaction created: ${transaction.reference}`);
      this.logger.log(`Transaction hash: ${venlyTransaction.transactionHash}`);

      // 8. Sync balances (async - don't wait)
      this.cryptoBalance.syncBalances(userId).catch((error) => {
        this.logger.error('Failed to sync balances after send', error);
      });

      return {
        transaction,
        transactionHash: venlyTransaction.transactionHash,
        status: 'PENDING',
        message: 'Transaction submitted to blockchain',
      };
    } catch (error) {
      this.logger.error('Failed to send crypto', error);
      throw error;
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(userId: string, transactionId: string) {
    const transaction = await this.prisma.cryptoTransaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
    });

    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }

    return transaction;
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    userId: string,
    params?: { page?: number; limit?: number },
  ) {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    const wallet = await this.cryptoWallet.getCryptoWallet(userId);

    const [transactions, total] = await Promise.all([
      this.prisma.cryptoTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.cryptoTransaction.count({
        where: { walletId: wallet.id },
      }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Validate send request
   */
  private async validateSendRequest(params: SendCryptoParams) {
    const { tokenSymbol, toAddress, amount } = params;

    // Validate token symbol
    const supportedTokens = ['MATIC', 'USDT', 'USDC'];
    if (!supportedTokens.includes(tokenSymbol)) {
      throw new BadRequestException(`Unsupported token: ${tokenSymbol}`);
    }

    // Validate address (basic check)
    if (!toAddress.startsWith('0x') || toAddress.length !== 42) {
      throw new BadRequestException('Invalid wallet address');
    }

    // Validate amount
    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new BadRequestException('Invalid amount');
    }

    // Minimum send amounts
    const minimums: Record<string, number> = {
      MATIC: 0.1,
      USDT: 1,
      USDC: 1,
    };

    if (amountNum < minimums[tokenSymbol]) {
      throw new BadRequestException(
        `Minimum send amount is ${minimums[tokenSymbol]} ${tokenSymbol}`,
      );
    }
  }

  /**
   * Update transaction status (called by webhook or cron)
   */
  async updateTransactionStatus(
    transactionHash: string,
    status: CryptoTransactionStatus,
  ) {
    const transaction = await this.prisma.cryptoTransaction.findUnique({
      where: { transactionHash },
    });

    if (!transaction) {
      this.logger.warn(`Transaction not found: ${transactionHash}`);
      return;
    }

    await this.prisma.cryptoTransaction.update({
      where: { transactionHash },
      data: {
        status,
        confirmedAt:
          status === CryptoTransactionStatus.COMPLETED ? new Date() : undefined,
        hasReachedFinality: status === CryptoTransactionStatus.COMPLETED,
      },
    });

    this.logger.log(
      `Transaction ${transactionHash} status updated to ${status}`,
    );
  }
}
