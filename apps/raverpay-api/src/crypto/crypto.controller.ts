import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { CryptoService } from './crypto.service';
import {
  CreateCryptoWalletDto,
  SendCryptoDto,
  ConvertCryptoDto,
  GetConversionQuoteDto,
} from './dto';

@Controller('v1/crypto')
export class CryptoController {
  constructor(private readonly cryptoService: CryptoService) {}

  // ============================================
  // WALLET MANAGEMENT
  // ============================================

  /**
   * Initialize crypto wallet
   * POST /v1/crypto/wallet/initialize
   */
  @Post('wallet/initialize')
  @UseGuards(JwtAuthGuard)
  async initializeWallet(
    @GetUser('id') userId: string,
    @Body() dto: CreateCryptoWalletDto,
  ) {
    return this.cryptoService.initializeCryptoWallet(userId, dto);
  }

  /**
   * Get crypto wallet details
   * GET /v1/crypto/wallet
   */
  @Get('wallet')
  @UseGuards(JwtAuthGuard)
  async getWallet(@GetUser('id') userId: string) {
    return this.cryptoService.getCryptoWalletDetails(userId);
  }

  /**
   * Get deposit info (address + QR)
   * GET /v1/crypto/deposit-info
   */
  @Get('deposit-info')
  @UseGuards(JwtAuthGuard)
  async getDepositInfo(@GetUser('id') userId: string) {
    return this.cryptoService.getDepositInfo(userId);
  }

  // ============================================
  // BALANCES
  // ============================================

  /**
   * Sync balances from blockchain
   * POST /v1/crypto/wallet/sync
   */
  @Post('wallet/sync')
  @UseGuards(JwtAuthGuard)
  async syncBalances(@GetUser('id') userId: string) {
    return this.cryptoService.syncBalances(userId);
  }

  /**
   * Get balance for specific token
   * GET /v1/crypto/balance/:token
   */
  @Get('balance/:token')
  @UseGuards(JwtAuthGuard)
  async getTokenBalance(
    @GetUser('id') userId: string,
    @Param('token') token: string,
  ) {
    return this.cryptoService.getTokenBalance(userId, token);
  }

  // ============================================
  // TRANSACTIONS
  // ============================================

  /**
   * Send crypto to external address
   * POST /v1/crypto/send
   */
  @Post('send')
  @UseGuards(JwtAuthGuard)
  async sendCrypto(@GetUser('id') userId: string, @Body() dto: SendCryptoDto) {
    return this.cryptoService.sendCrypto(userId, dto);
  }

  /**
   * Get transaction history
   * GET /v1/crypto/transactions
   */
  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  async getTransactions(
    @GetUser('id') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.cryptoService.getTransactionHistory(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });
  }

  /**
   * Get transaction details
   * GET /v1/crypto/transactions/:id
   */
  @Get('transactions/:id')
  @UseGuards(JwtAuthGuard)
  async getTransaction(
    @GetUser('id') userId: string,
    @Param('id') transactionId: string,
  ) {
    return this.cryptoService.getTransactionDetails(userId, transactionId);
  }

  // ============================================
  // CONVERSIONS (Crypto → Naira)
  // ============================================

  /**
   * Get conversion quote
   * POST /v1/crypto/convert/quote
   */
  @Post('convert/quote')
  @UseGuards(JwtAuthGuard)
  async getConversionQuote(
    @GetUser('id') userId: string,
    @Body() dto: GetConversionQuoteDto,
  ) {
    return this.cryptoService.getConversionQuote(userId, dto);
  }

  /**
   * Request conversion
   * POST /v1/crypto/convert
   */
  @Post('convert')
  @UseGuards(JwtAuthGuard)
  async requestConversion(
    @GetUser('id') userId: string,
    @Body() dto: ConvertCryptoDto,
  ) {
    return this.cryptoService.requestConversion(userId, dto);
  }

  /**
   * Get conversion history
   * GET /v1/crypto/conversions
   */
  @Get('conversions')
  @UseGuards(JwtAuthGuard)
  async getConversions(
    @GetUser('id') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.cryptoService.getConversionHistory(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });
  }

  // ============================================
  // EXCHANGE RATES
  // ============================================

  /**
   * Get current exchange rate
   * GET /v1/crypto/exchange-rate
   */
  @Get('exchange-rate')
  async getExchangeRate() {
    return this.cryptoService.getCurrentExchangeRate();
  }

  // ============================================
  // WEBHOOKS (Public - No Auth)
  // ============================================

  /**
   * Venly webhook endpoint
   * POST /v1/crypto/webhooks/venly
   */
  @Post('webhooks/venly')
  @HttpCode(HttpStatus.OK)
  async handleVenlyWebhook(@Body() payload: any) {
    return this.cryptoService.handleVenlyWebhook(payload);
  }
}
