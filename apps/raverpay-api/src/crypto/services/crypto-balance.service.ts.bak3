import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VenlyService } from '../venly/venly.service';
import { CryptoWalletService } from './crypto-wallet.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Crypto Balance Service
 * Handles balance synchronization from blockchain
 */
@Injectable()
export class CryptoBalanceService {
  private readonly logger = new Logger(CryptoBalanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly venly: VenlyService,
    private readonly cryptoWallet: CryptoWalletService,
  ) {}

  /**
   * Sync balances from blockchain for a user's wallet
   * Uses official Venly API
   */
  async syncBalances(userId: string) {
    try {
      const wallet = await this.cryptoWallet.getCryptoWallet(userId);

      if (!wallet.venlyWalletId) {
        throw new Error('Venly wallet ID not found');
      }

      this.logger.log(`Syncing balances for wallet: ${wallet.id}`);

      // Get native balance (MATIC) from Venly
      const nativeBalance = await this.venly.getWalletBalance(wallet.venlyWalletId);

      // Get token balances (USDT, USDC) from Venly
      const tokenBalances = await this.venly.getTokenBalances(wallet.venlyWalletId);

      // Update MATIC balance
      await this.updateNativeBalance(wallet.id, nativeBalance);

      // Update token balances (USDT, USDC)
      await this.updateTokenBalances(wallet.id, tokenBalances);

      this.logger.log(`Balances synced successfully for wallet: ${wallet.id}`);

      // Return updated balances
      return this.getBalances(wallet.id);
    } catch (error) {
      this.logger.error(`Failed to sync balances for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Get all balances for a wallet
   */
  async getBalances(walletId: string) {
    return this.prisma.cryptoBalance.findMany({
      where: { walletId },
      orderBy: { usdValue: 'desc' },
    });
  }

  /**
   * Get specific token balance
   */
  async getTokenBalance(walletId: string, tokenSymbol: string) {
    return this.prisma.cryptoBalance.findUnique({
      where: {
        walletId_tokenSymbol: {
          walletId,
          tokenSymbol,
        },
      },
    });
  }

  /**
   * Update native token balance (MATIC)
   * Uses official Venly API response format
   */
  private async updateNativeBalance(walletId: string, nativeBalance: any) {
    const balance = Number(nativeBalance.balance) || 0;
    const rawBalance = nativeBalance.rawBalance || '0';
    const usdPrice = nativeBalance.exchange?.usdPrice || 0;
    const usdValue = nativeBalance.exchange?.usdBalanceValue || 0;

    await this.prisma.cryptoBalance.upsert({
      where: {
        walletId_tokenSymbol: {
          walletId,
          tokenSymbol: 'MATIC',
        },
      },
      update: {
        balance: new Decimal(balance),
        rawBalance,
        usdPrice: new Decimal(usdPrice),
        usdValue: new Decimal(usdValue),
        lastUpdated: new Date(),
      },
      create: {
        walletId,
        tokenSymbol: 'MATIC',
        tokenAddress: null,
        tokenDecimals: 18,
        balance: new Decimal(balance),
        rawBalance,
        usdPrice: new Decimal(usdPrice),
        usdValue: new Decimal(usdValue),
      },
    });

    this.logger.debug(`Updated MATIC balance: ${balance} (USD: $${usdValue})`);
  }

  /**
   * Update token balances (USDT, USDC)
   * Uses official Venly API response format
   */
  private async updateTokenBalances(walletId: string, tokenBalances: any[]) {
    const USDT_ADDRESS =
      process.env.POLYGON_USDT_ADDRESS?.toLowerCase() ||
      '0xc2132d05d31c914a87c6611c10748aeb04b58e8f';
    const USDC_ADDRESS =
      process.env.POLYGON_USDC_ADDRESS?.toLowerCase() ||
      '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';

    for (const tokenBalance of tokenBalances) {
      const tokenAddress = tokenBalance.tokenAddress.toLowerCase();

      let tokenSymbol: string | null = null;

      if (tokenAddress === USDT_ADDRESS) {
        tokenSymbol = 'USDT';
      } else if (tokenAddress === USDC_ADDRESS) {
        tokenSymbol = 'USDC';
      }

      // Only track USDT and USDC
      if (!tokenSymbol) {
        continue;
      }

      const balance = Number(tokenBalance.balance) || 0;
      const rawBalance = tokenBalance.rawBalance || '0';
      const decimals = tokenBalance.decimals || 6;
      const usdPrice = tokenBalance.exchange?.usdPrice || 0;
      const usdValue = tokenBalance.exchange?.usdBalanceValue || 0;

      await this.prisma.cryptoBalance.upsert({
        where: {
          walletId_tokenSymbol: {
            walletId,
            tokenSymbol,
          },
        },
        update: {
          balance: new Decimal(balance),
          rawBalance,
          tokenDecimals: decimals,
          usdPrice: new Decimal(usdPrice),
          usdValue: new Decimal(usdValue),
          lastUpdated: new Date(),
        },
        create: {
          walletId,
          tokenSymbol,
          tokenAddress: tokenBalance.tokenAddress,
          tokenDecimals: decimals,
          balance: new Decimal(balance),
          rawBalance,
          usdPrice: new Decimal(usdPrice),
          usdValue: new Decimal(usdValue),
        },
      });

      this.logger.debug(`Updated ${tokenSymbol} balance: ${balance} (USD: $${usdValue})`);
    }
  }

  /**
   * Update USD values for all balances
   */
  private async updateUsdValues(walletId: string) {
    const balances = await this.prisma.cryptoBalance.findMany({
      where: { walletId },
    });

    for (const balance of balances) {
      // Get latest price
      const price = await this.getLatestPrice(balance.tokenSymbol);

      if (price) {
        const usdValue = Number(balance.balance) * Number(price);

        await this.prisma.cryptoBalance.update({
          where: { id: balance.id },
          data: {
            usdPrice: new Decimal(price),
            usdValue: new Decimal(usdValue),
          },
        });
      }
    }
  }

  /**
   * Get latest price for a token
   */
  private async getLatestPrice(tokenSymbol: string): Promise<number> {
    // Get latest price from database
    const latestPrice = await this.prisma.cryptoPrice.findFirst({
      where: { symbol: tokenSymbol },
      orderBy: { fetchedAt: 'desc' },
    });

    if (latestPrice) {
      return Number(latestPrice.usdPrice);
    }

    // Default prices for stablecoins
    if (tokenSymbol === 'USDT' || tokenSymbol === 'USDC') {
      return 1.0;
    }

    return 0;
  }

  /**
   * Check if user has sufficient balance
   */
  async hasSufficientBalance(
    userId: string,
    tokenSymbol: string,
    amount: number,
  ): Promise<boolean> {
    const wallet = await this.cryptoWallet.getCryptoWallet(userId);
    const balance = await this.getTokenBalance(wallet.id, tokenSymbol);

    if (!balance) {
      return false;
    }

    return Number(balance.balance) >= amount;
  }

  /**
   * Get total portfolio value in USD
   */
  async getTotalPortfolioValue(userId: string): Promise<number> {
    const wallet = await this.cryptoWallet.getCryptoWallet(userId);

    const balances = await this.prisma.cryptoBalance.findMany({
      where: { walletId: wallet.id },
    });

    return balances.reduce((sum, balance) => sum + Number(balance.usdValue || 0), 0);
  }
}
