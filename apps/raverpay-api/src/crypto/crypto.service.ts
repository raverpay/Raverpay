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

  async checkTransactionStatus(userId: string, transactionId: string) {
    return this.cryptoSend.checkAndUpdateTransactionStatus(
      userId,
      transactionId,
    );
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
      this.logger.log(
        `Received Venly webhook: ${payload.eventType || 'UNKNOWN'}`,
      );
      this.logger.debug(`Webhook payload: ${JSON.stringify(payload)}`);

      // Extract transaction hash from different possible payload structures
      const transactionHash =
        payload.transactionHash || payload.result?.hash || payload.hash || null;

      if (!transactionHash) {
        this.logger.warn('No transaction hash found in webhook payload');
        return { success: false, error: 'No transaction hash provided' };
      }

      // Handle transaction status updates
      if (
        payload.eventType === 'TRANSACTION_SUCCEEDED' ||
        payload.status === 'SUCCEEDED' ||
        payload.result?.status === 'SUCCEEDED'
      ) {
        await this.cryptoSend.handleTransactionSuccess(
          transactionHash,
          payload,
        );
      } else if (
        payload.eventType === 'TRANSACTION_FAILED' ||
        payload.status === 'FAILED' ||
        payload.result?.status === 'FAILED'
      ) {
        await this.cryptoSend.handleTransactionFailure(
          transactionHash,
          payload,
        );
      } else {
        this.logger.log(
          `Unhandled webhook event type: ${payload.eventType || 'UNKNOWN'}`,
        );
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to process Venly webhook', error);
      return { success: false, error: error.message };
    }
  }
}
