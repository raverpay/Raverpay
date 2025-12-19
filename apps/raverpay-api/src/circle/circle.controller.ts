import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  CCTPTransferState,
  CircleTransactionState,
  CircleTransactionType,
} from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CircleBlockchain, CircleFeeLevel } from './circle.types';
import { CircleConfigService } from './config/circle.config.service';
import {
  CCTPEstimateDto,
  CCTPQueryDto,
  CCTPTransferDto,
  CreateCircleWalletDto,
  EstimateFeeDto,
  TransactionQueryDto,
  TransferUsdcDto,
  UpdateWalletDto,
  ValidateAddressDto,
} from './dto';
import {
  PaymasterFeeEstimate,
  PaymasterService,
  SponsoredTransactionResponse,
} from './paymaster/paymaster.service';
import { CCTPService } from './transactions/cctp.service';
import { CircleTransactionService } from './transactions/circle-transaction.service';
import { CircleWalletService } from './wallets/circle-wallet.service';

interface AuthRequest {
  user: { id: string; email: string; role: string };
}

/**
 * Circle Controller
 * API endpoints for Circle wallet and transaction management
 */
@Controller('circle')
@UseGuards(JwtAuthGuard)
export class CircleController {
  constructor(
    private readonly walletService: CircleWalletService,
    private readonly transactionService: CircleTransactionService,
    private readonly cctpService: CCTPService,
    private readonly configService: CircleConfigService,
    private readonly paymasterService: PaymasterService,
  ) {}

  // ============================================
  // WALLET ENDPOINTS
  // ============================================

  /**
   * Create a new Circle wallet for the user
   * POST /circle/wallets
   */
  @Post('wallets')
  async createWallet(
    @Request() req: AuthRequest,
    @Body() dto: CreateCircleWalletDto,
  ) {
    const wallet = await this.walletService.createWallet({
      userId: req.user.id,
      blockchain: dto.blockchain as CircleBlockchain,
      accountType: dto.accountType,
      name: dto.name,
    });

    return {
      success: true,
      data: {
        walletId: wallet.id,
        address: wallet.address,
        blockchain: wallet.blockchain,
        accountType: wallet.accountType,
        state: wallet.state,
      },
    };
  }

  /**
   * Get user's Circle wallets
   * GET /circle/wallets
   */
  @Get('wallets')
  async getWallets(@Request() req: AuthRequest) {
    const wallets = await this.walletService.getUserWallets(req.user.id);

    return {
      success: true,
      data: wallets.map((w) => ({
        id: w.id,
        address: w.address,
        blockchain: w.blockchain,
        accountType: w.accountType,
        state: w.state,
        name: w.name,
        createdAt: w.createdAt,
      })),
    };
  }

  /**
   * Get a specific wallet
   * GET /circle/wallets/:id
   */
  @Get('wallets/:id')
  async getWallet(@Request() req: AuthRequest, @Param('id') id: string) {
    const wallet = await this.walletService.getWallet(id, req.user.id);

    return {
      success: true,
      data: wallet,
    };
  }

  /**
   * Get wallet balance
   * GET /circle/wallets/:id/balance
   */
  @Get('wallets/:id/balance')
  @Header(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate',
  )
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async getWalletBalance(@Request() req: AuthRequest, @Param('id') id: string) {
    const wallet = await this.walletService.getWallet(id, req.user.id);
    const balances = await this.walletService.getWalletBalance(
      wallet.circleWalletId,
    );

    return {
      success: true,
      data: {
        walletId: wallet.id,
        address: wallet.address,
        blockchain: wallet.blockchain,
        balances: balances.map((b) => ({
          token: {
            id: b.token.id,
            name: b.token.name,
            symbol: b.token.symbol,
            decimals: b.token.decimals,
            isNative: b.token.isNative,
            tokenAddress: b.token.tokenAddress,
            blockchain: b.token.blockchain,
          },
          amount: b.amount,
          updateDate: b.updateDate,
        })),
      },
    };
  }

  /**
   * Get USDC balance for wallet
   * GET /circle/wallets/:id/usdc-balance
   */
  @Get('wallets/:id/usdc-balance')
  @Header(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate',
  )
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async getUsdcBalance(@Request() req: AuthRequest, @Param('id') id: string) {
    const wallet = await this.walletService.getWallet(id, req.user.id);
    const balance = await this.walletService.getUsdcBalance(
      wallet.circleWalletId,
    );

    return {
      success: true,
      data: {
        walletId: wallet.id,
        address: wallet.address,
        blockchain: wallet.blockchain,
        usdcBalance: balance,
        usdcTokenAddress: this.configService.getUsdcTokenAddress(
          wallet.blockchain,
        ),
      },
    };
  }

  /**
   * Get deposit info for receiving USDC
   * GET /circle/wallets/deposit-info
   */
  @Get('wallets/deposit-info')
  async getDepositInfo(
    @Request() req: AuthRequest,
    @Query('blockchain') blockchain?: string,
  ) {
    const depositInfo = await this.walletService.getDepositInfo(
      req.user.id,
      blockchain,
    );

    return {
      success: true,
      data: depositInfo,
    };
  }

  /**
   * Update wallet metadata
   * PUT /circle/wallets/:id
   */
  @Put('wallets/:id')
  async updateWallet(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateWalletDto,
  ) {
    const wallet = await this.walletService.getWallet(id, req.user.id);
    const updated = await this.walletService.updateWallet(
      wallet.circleWalletId,
      dto,
    );

    return {
      success: true,
      data: updated,
    };
  }

  // ============================================
  // TRANSACTION ENDPOINTS
  // ============================================

  /**
   * Transfer USDC
   * POST /circle/transactions/transfer
   * Note: Consider adding PIN verification for production
   */
  @Post('transactions/transfer')
  async transferUsdc(
    @Request() req: AuthRequest,
    @Body() dto: TransferUsdcDto,
  ) {
    const result = await this.transactionService.createTransfer({
      userId: req.user.id,
      walletId: dto.walletId,
      destinationAddress: dto.destinationAddress,
      amount: dto.amount,
      feeLevel: dto.feeLevel as CircleFeeLevel,
      memo: dto.memo,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get user's transactions
   * GET /circle/transactions
   */
  @Get('transactions')
  async getTransactions(
    @Request() req: AuthRequest,
    @Query() query: TransactionQueryDto,
  ) {
    const transactions = await this.transactionService.getUserTransactions(
      req.user.id,
      {
        type: query.type as CircleTransactionType,
        state: query.state as CircleTransactionState,
        limit: query.limit,
        offset: query.offset,
      },
    );

    return {
      success: true,
      data: transactions,
    };
  }

  /**
   * Get a specific transaction
   * GET /circle/transactions/:id
   */
  @Get('transactions/:id')
  async getTransaction(@Request() req: AuthRequest, @Param('id') id: string) {
    const transaction = await this.transactionService.getTransaction(
      id,
      req.user.id,
    );

    return {
      success: true,
      data: transaction,
    };
  }

  /**
   * Estimate transfer fee
   * POST /circle/transactions/estimate-fee
   */
  @Post('transactions/estimate-fee')
  async estimateFee(@Request() req: AuthRequest, @Body() dto: EstimateFeeDto) {
    // Verify wallet belongs to user
    await this.walletService.getWallet(dto.walletId, req.user.id);

    const estimate = await this.transactionService.estimateFee({
      walletId: dto.walletId,
      destinationAddress: dto.destinationAddress,
      amount: dto.amount,
      blockchain: dto.blockchain as CircleBlockchain,
    });

    return {
      success: true,
      data: estimate,
    };
  }

  /**
   * Cancel a pending transaction
   * POST /circle/transactions/:id/cancel
   */
  @Post('transactions/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelTransaction(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    await this.transactionService.cancelTransaction(id, req.user.id);

    return {
      success: true,
      message: 'Transaction cancelled',
    };
  }

  /**
   * Accelerate a stuck transaction
   * POST /circle/transactions/:id/accelerate
   */
  @Post('transactions/:id/accelerate')
  @HttpCode(HttpStatus.OK)
  async accelerateTransaction(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    await this.transactionService.accelerateTransaction(id, req.user.id);

    return {
      success: true,
      message: 'Transaction accelerated',
    };
  }

  /**
   * Validate an address
   * POST /circle/transactions/validate-address
   */
  @Post('transactions/validate-address')
  async validateAddress(@Body() dto: ValidateAddressDto) {
    const isValid = await this.transactionService.validateAddress(
      dto.address,
      dto.blockchain as CircleBlockchain,
    );

    return {
      success: true,
      data: { isValid },
    };
  }

  // ============================================
  // CCTP ENDPOINTS
  // ============================================

  /**
   * Initiate a CCTP cross-chain transfer
   * POST /circle/cctp/transfer
   * Note: Consider adding PIN verification for production
   */
  @Post('cctp/transfer')
  async initiateCCTPTransfer(
    @Request() req: AuthRequest,
    @Body() dto: CCTPTransferDto,
  ) {
    const result = await this.cctpService.initiateTransfer({
      userId: req.user.id,
      sourceWalletId: dto.sourceWalletId,
      destinationAddress: dto.destinationAddress,
      destinationChain: dto.destinationChain as CircleBlockchain,
      amount: dto.amount,
      transferType: dto.transferType,
      feeLevel: dto.feeLevel as CircleFeeLevel,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get user's CCTP transfers
   * GET /circle/cctp/transfers
   */
  @Get('cctp/transfers')
  async getCCTPTransfers(
    @Request() req: AuthRequest,
    @Query() query: CCTPQueryDto,
  ) {
    const transfers = await this.cctpService.getUserTransfers(req.user.id, {
      state: query.state as CCTPTransferState,
      limit: query.limit,
      offset: query.offset,
    });

    return {
      success: true,
      data: transfers,
    };
  }

  /**
   * Get a specific CCTP transfer
   * GET /circle/cctp/transfers/:id
   */
  @Get('cctp/transfers/:id')
  async getCCTPTransfer(@Request() req: AuthRequest, @Param('id') id: string) {
    const transfer = await this.cctpService.getTransfer(id, req.user.id);

    return {
      success: true,
      data: transfer,
    };
  }

  /**
   * Cancel a pending CCTP transfer
   * POST /circle/cctp/transfers/:id/cancel
   */
  @Post('cctp/transfers/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelCCTPTransfer(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    await this.cctpService.cancelTransfer(id, req.user.id);

    return {
      success: true,
      message: 'CCTP transfer cancelled',
    };
  }

  /**
   * Estimate CCTP transfer fee
   * POST /circle/cctp/estimate-fee
   */
  @Post('cctp/estimate-fee')
  estimateCCTPFee(@Body() dto: CCTPEstimateDto) {
    const estimate = this.cctpService.estimateFee({
      sourceChain: dto.sourceChain,
      destinationChain: dto.destinationChain,
      amount: dto.amount,
      transferType: dto.transferType,
    });

    return {
      success: true,
      data: estimate,
    };
  }

  /**
   * Get supported CCTP chains
   * GET /circle/cctp/chains
   */
  @Get('cctp/chains')
  getSupportedCCTPChains() {
    const chains = this.cctpService.getSupportedChains();

    return {
      success: true,
      data: { chains },
    };
  }

  // ============================================
  // PAYMASTER ENDPOINTS
  // ============================================

  /**
   * Get Paymaster configuration
   * GET /circle/paymaster/config
   */
  @Get('paymaster/config')
  getPaymasterConfig() {
    return {
      success: true,
      data: {
        supportedBlockchains: this.paymasterService.getSupportedBlockchains(),
        surchargePercent: 10, // Default 10% surcharge
        description:
          'Pay gas fees in USDC instead of native tokens. Requires SCA wallet type.',
      },
    };
  }

  /**
   * Check if a wallet supports Paymaster
   * GET /circle/paymaster/compatible/:walletId
   */
  @Get('paymaster/compatible/:walletId')
  async checkPaymasterCompatibility(
    @Request() req: AuthRequest,
    @Param('walletId') walletId: string,
  ) {
    // Verify wallet belongs to user
    await this.walletService.getWallet(walletId, req.user.id);

    const isCompatible =
      await this.paymasterService.isWalletPaymasterCompatible(walletId);

    return {
      success: true,
      data: {
        walletId,
        isPaymasterCompatible: isCompatible,
        message: isCompatible
          ? 'Wallet supports Paymaster. Gas fees can be paid in USDC.'
          : 'Wallet does not support Paymaster. EOA wallets require native tokens for gas.',
      },
    };
  }

  /**
   * Estimate Paymaster fee in USDC
   * POST /circle/paymaster/estimate-fee
   */
  @Post('paymaster/estimate-fee')
  async estimatePaymasterFee(
    @Request() req: AuthRequest,
    @Body() dto: EstimateFeeDto,
  ): Promise<{ success: boolean; data: PaymasterFeeEstimate }> {
    // Verify wallet belongs to user
    await this.walletService.getWallet(dto.walletId, req.user.id);

    const estimate = await this.paymasterService.estimateFeeInUsdc(
      dto.walletId,
      dto.destinationAddress,
      dto.amount,
      dto.blockchain as CircleBlockchain,
    );

    return {
      success: true,
      data: estimate,
    };
  }

  /**
   * Create a sponsored transaction (gas paid in USDC)
   * POST /circle/paymaster/transfer
   * Note: Consider adding PIN verification for production
   */
  @Post('paymaster/transfer')
  async createSponsoredTransfer(
    @Request() req: AuthRequest,
    @Body() dto: TransferUsdcDto,
  ): Promise<{ success: boolean; data: SponsoredTransactionResponse }> {
    // Verify wallet belongs to user
    await this.walletService.getWallet(dto.walletId, req.user.id);

    const wallet = await this.walletService.getWallet(
      dto.walletId,
      req.user.id,
    );

    const result = await this.paymasterService.createSponsoredTransaction({
      walletId: dto.walletId,
      destinationAddress: dto.destinationAddress,
      amount: dto.amount,
      blockchain: wallet.blockchain as CircleBlockchain,
      feeLevel: dto.feeLevel as CircleFeeLevel,
      memo: dto.memo,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get Paymaster usage stats for a wallet
   * GET /circle/paymaster/stats/:walletId
   */
  @Get('paymaster/stats/:walletId')
  async getPaymasterStats(
    @Request() req: AuthRequest,
    @Param('walletId') walletId: string,
  ) {
    // Verify wallet belongs to user
    await this.walletService.getWallet(walletId, req.user.id);

    const stats = await this.paymasterService.getPaymasterUsageStats(walletId);

    return {
      success: true,
      data: stats,
    };
  }

  // ============================================
  // CONFIG ENDPOINTS
  // ============================================

  /**
   * Get Circle configuration for client
   * GET /circle/config
   */
  @Get('config')
  getConfig() {
    return {
      success: true,
      data: {
        environment: this.configService.environment,
        supportedBlockchains: this.configService.getSupportedBlockchains(),
        defaultBlockchain: this.configService.defaultBlockchain,
        defaultAccountType: this.configService.defaultAccountType,
        isConfigured: this.configService.isConfigured(),
        paymasterSupported: this.paymasterService.getSupportedBlockchains(),
      },
    };
  }
}
