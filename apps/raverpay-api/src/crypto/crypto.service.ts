import { Injectable, Logger } from '@nestjs/common';
import { CryptoWalletService } from './services/crypto-wallet.service';
import { CryptoBalanceService } from './services/crypto-balance.service';
import { CryptoSendService } from './services/crypto-send.service';
import { ConversionService } from './services/conversion.service';
import { ExchangeRateService } from './services/exchange-rate.service';
import { PriceService } from './services/price.service';
import {
  CreateCryptoWalletDto,
  SendCryptoDto,
  ConvertCryptoDto,
  GetConversionQuoteDto,
} from './dto';

/**
 * Main Crypto Service
 * Orchestrates all crypto wallet operations
 */
@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);

  constructor(
    private readonly cryptoWallet: CryptoWalletService,
    private readonly cryptoBalance: CryptoBalanceService,
    private readonly cryptoSend: CryptoSendService,
    private readonly conversion: ConversionService,
    private readonly exchangeRate: ExchangeRateService,
    private readonly price: PriceService,
  ) {}

  // ============================================
  // WALLET OPERATIONS
  // ============================================

  async initializeCryptoWallet(userId: string, dto: CreateCryptoWalletDto) {
    return this.cryptoWallet.initializeCryptoWallet({
      userId,
      pin: dto.pin,
    });
  }

  async getCryptoWalletDetails(userId: string) {
    return this.cryptoWallet.getCryptoWalletDetails(userId);
  }

  async getDepositInfo(userId: string) {
    return this.cryptoWallet.getDepositInfo(userId);
  }

  // ============================================
  // BALANCE OPERATIONS
  // ============================================

  async syncBalances(userId: string) {
    return this.cryptoBalance.syncBalances(userId);
  }

  async getTokenBalance(userId: string, tokenSymbol: string) {
    const wallet = await this.cryptoWallet.getCryptoWallet(userId);
    return this.cryptoBalance.getTokenBalance(wallet.id, tokenSymbol);
  }

  // ============================================
  // SEND OPERATIONS
  // ============================================

  async sendCrypto(userId: string, dto: SendCryptoDto) {
    return this.cryptoSend.sendCrypto({
      userId,
      tokenSymbol: dto.tokenSymbol,
      toAddress: dto.toAddress,
      amount: dto.amount,
      pin: dto.pin,
      memo: dto.memo,
    });
  }

  async getTransactionHistory(
    userId: string,
    params?: { page?: number; limit?: number },
  ) {
    return this.cryptoSend.getTransactionHistory(userId, params);
  }

  async getTransactionDetails(userId: string, transactionId: string) {
    return this.cryptoSend.getTransaction(userId, transactionId);
  }

  // ============================================
  // CONVERSION OPERATIONS
  // ============================================

  async getConversionQuote(userId: string, dto: GetConversionQuoteDto) {
    return this.conversion.getConversionQuote(
      userId,
      dto.tokenSymbol,
      dto.amount,
    );
  }

  async requestConversion(userId: string, dto: ConvertCryptoDto) {
    return this.conversion.requestConversion({
      userId,
      tokenSymbol: dto.tokenSymbol,
      amount: dto.amount,
      pin: dto.pin,
    });
  }

  async getConversionHistory(
    userId: string,
    params?: { page?: number; limit?: number },
  ) {
    return this.conversion.getConversionHistory(userId, params);
  }

  // ============================================
  // EXCHANGE RATE OPERATIONS
  // ============================================

  async getCurrentExchangeRate() {
    const rate = await this.exchangeRate.getUsdToNgnRate();

    if (!rate) {
      return {
        rate: 0,
        message: 'Exchange rate not configured',
      };
    }

    return {
      fromCurrency: rate.fromCurrency,
      toCurrency: rate.toCurrency,
      rate: Number(rate.rate),
      platformFeePercent: Number(rate.platformFeePercent),
      setAt: rate.setAt,
      source: rate.source,
    };
  }

  // ============================================
  // WEBHOOK HANDLER
  // ============================================

  async handleVenlyWebhook(payload: any) {
    try {
      this.logger.log(`Received Venly webhook: ${payload.eventType}`);

      // Log webhook for debugging
      // await this.prisma.cryptoWebhookLog.create({
      //   data: {
      //     eventType: payload.eventType,
      //     payload: payload,
      //     transactionHash: payload.transactionHash,
      //     processed: false,
      //   },
      // });

      // Handle different webhook events
      // TODO: Implement webhook processing logic

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to process Venly webhook', error);
      return { success: false, error: error.message };
    }
  }
}
