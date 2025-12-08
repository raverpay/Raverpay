import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoWalletService } from './crypto-wallet.service';
import { CryptoBalanceService } from './crypto-balance.service';
import {
  ConversionStatus,
  WalletType,
  TransactionType,
  TransactionStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface ConvertCryptoParams {
  userId: string;
  tokenSymbol: string;
  amount: string;
  pin: string;
}

/**
 * Crypto Conversion Service
 * Handles crypto → Naira conversions
 */
@Injectable()
export class ConversionService {
  private readonly logger = new Logger(ConversionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoWallet: CryptoWalletService,
    private readonly cryptoBalance: CryptoBalanceService,
  ) {}

  /**
   * Get conversion quote (preview before confirming)
   */
  async getConversionQuote(
    userId: string,
    tokenSymbol: string,
    amount: string,
  ) {
    try {
      const amountNum = Number(amount);

      if (isNaN(amountNum) || amountNum <= 0) {
        throw new BadRequestException('Invalid amount');
      }

      // Check if supported
      if (!['USDT', 'USDC'].includes(tokenSymbol)) {
        throw new BadRequestException(
          'Only USDT and USDC can be converted to Naira',
        );
      }

      // Check balance
      const hasSufficient = await this.cryptoBalance.hasSufficientBalance(
        userId,
        tokenSymbol,
        amountNum,
      );

      if (!hasSufficient) {
        throw new BadRequestException(`Insufficient ${tokenSymbol} balance`);
      }

      // Get crypto price (USDT/USDC ≈ $1)
      const usdValue = amountNum * 1.0;

      // Get current exchange rate
      const exchangeRate = await this.getActiveExchangeRate();

      // Calculate Naira amount
      const nairaAmount = usdValue * Number(exchangeRate.rate);
      const feePercent = Number(exchangeRate.platformFeePercent);
      const feeAmount = (nairaAmount * feePercent) / 100;
      const netNaira = nairaAmount - feeAmount;

      return {
        tokenSymbol,
        cryptoAmount: amountNum,
        usdValue,
        exchangeRate: Number(exchangeRate.rate),
        feePercent,
        feeAmount,
        nairaAmount,
        netNaira,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // Quote valid for 5 minutes
      };
    } catch (error) {
      this.logger.error('Failed to get conversion quote', error);
      throw error;
    }
  }

  /**
   * Request conversion (execute)
   */
  async requestConversion(params: ConvertCryptoParams) {
    const { userId, tokenSymbol, amount, pin } = params;

    try {
      this.logger.log(
        `User ${userId} converting ${amount} ${tokenSymbol} to Naira`,
      );

      // Get quote
      const quote = await this.getConversionQuote(userId, tokenSymbol, amount);

      // Get wallets
      const cryptoWallet = await this.cryptoWallet.getCryptoWallet(userId);
      const nairaWallet = await this.prisma.wallet.findFirst({
        where: { userId, type: WalletType.NAIRA },
      });

      if (!nairaWallet) {
        throw new BadRequestException('Naira wallet not found');
      }

      // Verify PIN
      const venlyUser = await this.prisma.venlyUser.findUnique({
        where: { userId },
      });

      if (!venlyUser) {
        throw new BadRequestException('Crypto wallet not properly initialized');
      }

      // Create conversion record
      const conversion = await this.prisma.cryptoConversion.create({
        data: {
          reference: `TXN_CRYPTO_CONVERT_${Date.now()}`,
          userId,
          tokenSymbol,
          cryptoAmount: new Decimal(amount),
          usdValue: new Decimal(quote.usdValue),
          nairaAmount: new Decimal(quote.nairaAmount),
          exchangeRate: new Decimal(quote.exchangeRate),
          feePercent: new Decimal(quote.feePercent),
          feeAmount: new Decimal(quote.feeAmount),
          netNaira: new Decimal(quote.netNaira),
          status: ConversionStatus.PROCESSING,
          requiresApproval: false, // Can add approval logic for large amounts
        },
      });

      // Process conversion in transaction
      await this.processConversion(
        conversion.id,
        cryptoWallet.id,
        nairaWallet.id,
      );

      this.logger.log(`Conversion completed: ${conversion.reference}`);

      return {
        conversion,
        message: 'Conversion successful! Naira credited to your wallet.',
      };
    } catch (error) {
      this.logger.error('Failed to process conversion', error);
      throw error;
    }
  }

  /**
   * Process conversion (internal)
   */
  private async processConversion(
    conversionId: string,
    cryptoWalletId: string,
    nairaWalletId: string,
  ) {
    const conversion = await this.prisma.cryptoConversion.findUnique({
      where: { id: conversionId },
    });

    if (!conversion) {
      throw new Error('Conversion not found');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        // 1. Deduct from crypto wallet (just tracking, not actual blockchain transfer)
        const cryptoBalance = await tx.cryptoBalance.findFirst({
          where: {
            walletId: cryptoWalletId,
            tokenSymbol: conversion.tokenSymbol,
          },
        });

        if (!cryptoBalance) {
          throw new Error('Token balance not found');
        }

        const newCryptoBalance =
          Number(cryptoBalance.balance) - Number(conversion.cryptoAmount);

        if (newCryptoBalance < 0) {
          throw new BadRequestException('Insufficient balance');
        }

        await tx.cryptoBalance.update({
          where: { id: cryptoBalance.id },
          data: {
            balance: new Decimal(newCryptoBalance),
          },
        });

        // 2. Credit Naira wallet
        const nairaWallet = await tx.wallet.findFirst({
          where: { id: nairaWalletId },
        });

        if (!nairaWallet) {
          throw new Error('Naira wallet not found');
        }

        const newNairaBalance =
          Number(nairaWallet.balance) + Number(conversion.netNaira);

        await tx.wallet.update({
          where: { id: nairaWalletId },
          data: {
            balance: new Decimal(newNairaBalance),
            ledgerBalance: new Decimal(newNairaBalance),
          },
        });

        // 3. Create Naira transaction record
        const nairaTransaction = await tx.transaction.create({
          data: {
            reference: `${conversion.reference}_NAIRA`,
            userId: conversion.userId,
            type: TransactionType.CRYPTO_TO_NAIRA,
            status: TransactionStatus.COMPLETED,
            amount: conversion.netNaira,
            fee: conversion.feeAmount,
            totalAmount: conversion.nairaAmount,
            balanceBefore: nairaWallet.balance,
            balanceAfter: new Decimal(newNairaBalance),
            currency: 'NGN',
            description: `Converted ${conversion.cryptoAmount} ${conversion.tokenSymbol} to Naira`,
            completedAt: new Date(),
          },
        });

        // 4. Update conversion status
        await tx.cryptoConversion.update({
          where: { id: conversionId },
          data: {
            status: ConversionStatus.COMPLETED,
            nairaTransactionId: nairaTransaction.id,
            completedAt: new Date(),
          },
        });
      });

      this.logger.log(
        `Conversion processed successfully: ${conversion.reference}`,
      );
    } catch (error) {
      // Mark conversion as failed
      await this.prisma.cryptoConversion.update({
        where: { id: conversionId },
        data: {
          status: ConversionStatus.FAILED,
        },
      });

      this.logger.error(`Conversion failed: ${conversion.reference}`, error);
      throw error;
    }
  }

  /**
   * Get conversion history
   */
  async getConversionHistory(
    userId: string,
    params?: { page?: number; limit?: number },
  ) {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    const [conversions, total] = await Promise.all([
      this.prisma.cryptoConversion.findMany({
        where: { userId },
        orderBy: { requestedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.cryptoConversion.count({
        where: { userId },
      }),
    ]);

    return {
      conversions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get active exchange rate
   */
  private async getActiveExchangeRate() {
    const exchangeRate = await this.prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: 'USD',
        toCurrency: 'NGN',
        isActive: true,
      },
      orderBy: { setAt: 'desc' },
    });

    if (!exchangeRate) {
      throw new BadRequestException(
        'Exchange rate not configured. Please contact support.',
      );
    }

    return exchangeRate;
  }
}
