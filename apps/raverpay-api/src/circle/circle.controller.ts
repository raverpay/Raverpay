import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CircleWalletService } from './wallets/circle-wallet.service';
import { CircleTransactionService } from './transactions/circle-transaction.service';
import { CCTPService } from './transactions/cctp.service';
import { CircleConfigService } from './config/circle.config.service';
import {
  CreateCircleWalletDto,
  UpdateWalletDto,
  TransferUsdcDto,
  EstimateFeeDto,
  CCTPTransferDto,
  CCTPEstimateDto,
  TransactionQueryDto,
  CCTPQueryDto,
  ValidateAddressDto,
} from './dto';
import { CircleBlockchain, CircleFeeLevel } from './circle.types';
import {
  CircleTransactionState,
  CircleTransactionType,
  CCTPTransferState,
} from '@prisma/client';

interface AuthRequest {
  user: { userId: string };
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
      userId: req.user.userId,
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
    const wallets = await this.walletService.getUserWallets(req.user.userId);

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
    const wallet = await this.walletService.getWallet(id, req.user.userId);

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
  async getWalletBalance(@Request() req: AuthRequest, @Param('id') id: string) {
    const wallet = await this.walletService.getWallet(id, req.user.userId);
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
          symbol: b.token.symbol,
          name: b.token.name,
          amount: b.amount,
          decimals: b.token.decimals,
          isNative: b.token.isNative,
          tokenAddress: b.token.tokenAddress,
        })),
      },
    };
  }

  /**
   * Get USDC balance for wallet
   * GET /circle/wallets/:id/usdc-balance
   */
  @Get('wallets/:id/usdc-balance')
  async getUsdcBalance(@Request() req: AuthRequest, @Param('id') id: string) {
    const wallet = await this.walletService.getWallet(id, req.user.userId);
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
      req.user.userId,
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
    const wallet = await this.walletService.getWallet(id, req.user.userId);
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
      userId: req.user.userId,
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
      req.user.userId,
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
      req.user.userId,
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
    await this.walletService.getWallet(dto.walletId, req.user.userId);

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
    await this.transactionService.cancelTransaction(id, req.user.userId);

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
    await this.transactionService.accelerateTransaction(id, req.user.userId);

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
      userId: req.user.userId,
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
    const transfers = await this.cctpService.getUserTransfers(req.user.userId, {
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
    const transfer = await this.cctpService.getTransfer(id, req.user.userId);

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
    await this.cctpService.cancelTransfer(id, req.user.userId);

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
      },
    };
  }
}
