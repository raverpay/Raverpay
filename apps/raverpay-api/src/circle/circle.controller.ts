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
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
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
import { UserControlledWalletService } from './user-controlled/user-controlled-wallet.service';
import { ModularWalletService } from './modular/modular-wallet.service';
import { FeeConfigurationService } from './fees/fee-configuration.service';
import { FeeRetryService } from './fees/fee-retry.service';

interface AuthRequest {
  user: { id: string; email: string; role: string };
}

/**
 * Circle Controller
 * API endpoints for Circle wallet and transaction management
 */
@Controller('circle')
@UseGuards(JwtAuthGuard)
@ApiTags('Circle')
@ApiBearerAuth('JWT-auth')
export class CircleController {
  constructor(
    private readonly walletService: CircleWalletService,
    private readonly transactionService: CircleTransactionService,
    private readonly cctpService: CCTPService,
    private readonly configService: CircleConfigService,
    private readonly paymasterService: PaymasterService,
    private readonly userControlledWalletService: UserControlledWalletService,
    private readonly modularWalletService: ModularWalletService,
    private readonly feeConfigService: FeeConfigurationService,
    private readonly feeRetryService: FeeRetryService,
  ) {}

  // ============================================
  // WALLET ENDPOINTS
  // ============================================

  /**
   * Get supported blockchains
   * GET /circle/chains
   */
  @Get('chains')
  @ApiOperation({
    summary: 'Get supported blockchains',
    description: 'Retrieve list of supported blockchains with metadata',
  })
  @ApiResponse({ status: 200, description: 'Chains retrieved successfully' })
  getSupportedChains() {
    return {
      success: true,
      data: {
        chains: this.configService.getChainMetadata(),
      },
    };
  }

  /**
   * Create a new Circle wallet for the user
   * POST /circle/wallets
   */
  @Post('wallets')
  @ApiOperation({
    summary: 'Create Circle wallet',
    description: 'Create a new USDC wallet on specified blockchain',
  })
  @ApiResponse({ status: 201, description: 'Wallet created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({
    summary: 'Get user wallets',
    description: 'Retrieve all Circle wallets for authenticated user',
  })
  @ApiResponse({ status: 200, description: 'Wallets retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getWallets(@Request() req: AuthRequest) {
    // Fetch developer-controlled wallets
    const devWallets = await this.walletService.getUserWallets(req.user.id);

    // Fetch user-controlled wallets
    const userWallets =
      await this.userControlledWalletService.getUserControlledWallets(
        req.user.id,
      );

    // Fetch modular wallets
    const modularWallets = await this.modularWalletService.getUserWallets(
      req.user.id,
    );

    return {
      success: true,
      data: [
        // Developer-controlled wallets
        ...devWallets.map((w) => ({
          id: w.id,
          address: w.address,
          blockchain: w.blockchain,
          accountType: w.accountType,
          state: w.state,
          name: w.name,
          custodyType: w.custodyType,
          type: 'DEVELOPER',
          createdAt: w.createdAt,
        })),
        // User-controlled wallets
        ...userWallets.map((w) => ({
          id: w.id,
          address: w.address,
          blockchain: w.blockchain,
          accountType: w.accountType,
          state: w.state,
          name: w.name,
          custodyType: w.custodyType,
          type: 'USER',
          createdAt: w.createdAt,
        })),
        // Modular wallets
        ...modularWallets.map((w) => ({
          id: w.id,
          address: w.address,
          blockchain: w.blockchain,
          state: w.state,
          name: w.name,
          type: 'MODULAR',
          createdAt: w.createdAt,
        })),
      ],
    };
  }

  /**
   * Get a specific wallet
   * GET /circle/wallets/:id
   */
  @Get('wallets/:id')
  @ApiOperation({
    summary: 'Get wallet details',
    description: 'Retrieve details of a specific Circle wallet',
  })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  @ApiResponse({ status: 200, description: 'Wallet retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
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
  @ApiOperation({
    summary: 'Get wallet balance',
    description: 'Retrieve all token balances for a wallet',
  })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
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
  @ApiOperation({
    summary: 'Get USDC balance',
    description: 'Get USDC token balance for a specific wallet',
  })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  @ApiResponse({ status: 200, description: 'USDC balance retrieved' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
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
  @ApiOperation({
    summary: 'Get deposit info',
    description:
      'Get wallet address and deposit instructions for receiving USDC',
  })
  @ApiQuery({
    name: 'blockchain',
    required: false,
    description: 'Blockchain to get deposit info for',
  })
  @ApiResponse({ status: 200, description: 'Deposit info retrieved' })
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
  @ApiOperation({
    summary: 'Update wallet',
    description: 'Update wallet name or metadata',
  })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  @ApiResponse({ status: 200, description: 'Wallet updated successfully' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
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
  @ApiOperation({
    summary: 'Transfer USDC',
    description: 'Send USDC to another address on the same blockchain',
  })
  @ApiResponse({ status: 200, description: 'Transfer initiated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or insufficient balance',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
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
  @ApiOperation({
    summary: 'Get transactions',
    description: 'Retrieve transaction history with optional filters',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by transaction type',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    description: 'Filter by transaction state',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of results',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Pagination offset',
  })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
  })
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
  @ApiOperation({
    summary: 'Get transaction details',
    description: 'Retrieve details of a specific Circle transaction',
  })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction retrieved' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
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
  @ApiOperation({
    summary: 'Estimate transaction fee',
    description: 'Calculate estimated gas fee for a USDC transfer',
  })
  @ApiResponse({ status: 200, description: 'Fee estimated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
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
  @ApiOperation({
    summary: 'Cancel transaction',
    description: 'Cancel a pending Circle transaction',
  })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction cancelled' })
  @ApiResponse({ status: 400, description: 'Transaction cannot be cancelled' })
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
  @ApiOperation({
    summary: 'Accelerate transaction',
    description: 'Speed up a stuck transaction by increasing gas fee',
  })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction accelerated' })
  @ApiResponse({
    status: 400,
    description: 'Transaction cannot be accelerated',
  })
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
  @ApiOperation({
    summary: 'Validate blockchain address',
    description: 'Check if an address is valid for the specified blockchain',
  })
  @ApiResponse({ status: 200, description: 'Address validated' })
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
  @ApiOperation({
    summary: 'CCTP cross-chain transfer',
    description:
      'Transfer USDC across different blockchains using Circle CCTP protocol',
  })
  @ApiResponse({
    status: 200,
    description: 'CCTP transfer initiated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or insufficient balance',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
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
  @ApiOperation({
    summary: 'Get CCTP transfers',
    description: 'Retrieve user CCTP cross-chain transfer history',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    description: 'Filter by transfer state',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of results',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Pagination offset',
  })
  @ApiResponse({ status: 200, description: 'CCTP transfers retrieved' })
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
  @ApiOperation({
    summary: 'Get CCTP transfer details',
    description: 'Retrieve details of a specific CCTP transfer',
  })
  @ApiParam({ name: 'id', description: 'CCTP transfer ID' })
  @ApiResponse({ status: 200, description: 'CCTP transfer retrieved' })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
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
  @ApiOperation({
    summary: 'Cancel CCTP transfer',
    description: 'Cancel a pending CCTP cross-chain transfer',
  })
  @ApiParam({ name: 'id', description: 'CCTP transfer ID' })
  @ApiResponse({ status: 200, description: 'CCTP transfer cancelled' })
  @ApiResponse({ status: 400, description: 'Transfer cannot be cancelled' })
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
  @ApiOperation({
    summary: 'Estimate CCTP fee',
    description: 'Calculate estimated fee for CCTP cross-chain transfer',
  })
  @ApiResponse({ status: 200, description: 'Fee estimated' })
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
  @ApiOperation({
    summary: 'Get supported CCTP chains',
    description: 'List all blockchains that support Circle CCTP protocol',
  })
  @ApiResponse({ status: 200, description: 'Supported chains retrieved' })
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
  @ApiOperation({
    summary: 'Get Paymaster config',
    description: 'Retrieve Paymaster configuration and supported blockchains',
  })
  @ApiResponse({ status: 200, description: 'Configuration retrieved' })
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
  @ApiOperation({
    summary: 'Check Paymaster compatibility',
    description: 'Check if wallet supports paying gas fees in USDC',
  })
  @ApiParam({ name: 'walletId', description: 'Wallet ID to check' })
  @ApiResponse({ status: 200, description: 'Compatibility checked' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
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
  @ApiOperation({
    summary: 'Estimate Paymaster fee',
    description:
      'Calculate gas fee in USDC for Paymaster-sponsored transaction',
  })
  @ApiResponse({ status: 200, description: 'Fee estimated in USDC' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or wallet not compatible',
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
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
  @ApiOperation({
    summary: 'Paymaster transfer',
    description:
      'Transfer USDC with gas fees paid in USDC instead of native tokens (SCA wallets only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Sponsored transfer created successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input, insufficient balance, or wallet not compatible',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
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
  @ApiOperation({
    summary: 'Get Paymaster stats',
    description: 'Retrieve Paymaster usage statistics for a wallet',
  })
  @ApiParam({ name: 'walletId', description: 'Wallet ID' })
  @ApiResponse({ status: 200, description: 'Stats retrieved' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
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
  // FEE CONFIGURATION ENDPOINTS
  // ============================================

  /**
   * Get fee configuration
   * GET /circle/fees/config
   */
  @Get('fees/config')
  @ApiOperation({
    summary: 'Get fee configuration',
    description: 'Retrieve current transaction fee configuration',
  })
  @ApiResponse({ status: 200, description: 'Fee configuration retrieved' })
  async getFeeConfig() {
    const config = await this.feeConfigService.getFeeConfig();

    return {
      success: true,
      data: config,
    };
  }

  /**
   * Update fee configuration (Admin only)
   * PUT /circle/fees/config
   */
  @Put('fees/config')
  @ApiOperation({
    summary: 'Update fee configuration',
    description: 'Update transaction fee settings (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Fee configuration updated' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async updateFeeConfig(
    @Request() req: AuthRequest,
    @Body()
    body: {
      enabled?: boolean;
      percentage?: number;
      minFeeUsdc?: number;
      collectionWallets?: Record<string, string>;
    },
  ) {
    // Check if user is admin or super admin
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only admins can update fee configuration');
    }

    const updatedConfig = await this.feeConfigService.updateFeeConfig(
      body,
      req.user.id,
    );

    return {
      success: true,
      data: updatedConfig,
      message: 'Fee configuration updated successfully',
    };
  }

  /**
   * Calculate fee for an amount
   * GET /circle/fees/calculate
   */
  @Get('fees/calculate')
  @ApiOperation({
    summary: 'Calculate fee',
    description: 'Calculate service fee for a given amount',
  })
  @ApiQuery({ name: 'amount', description: 'Transaction amount in USDC' })
  @ApiResponse({ status: 200, description: 'Fee calculated' })
  async calculateFee(@Query('amount') amount: string) {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return {
        success: false,
        error: 'Invalid amount',
      };
    }

    const fee = await this.feeConfigService.calculateFee(amountNum);
    const total = amountNum + fee;

    return {
      success: true,
      data: {
        amount: amountNum,
        fee,
        total,
      },
    };
  }

  /**
   * Get fee statistics (Admin only)
   * GET /circle/fees/stats
   */
  @Get('fees/stats')
  @ApiOperation({
    summary: 'Get fee statistics',
    description: 'Retrieve fee collection statistics (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getFeeStats(@Request() req: AuthRequest) {
    // Check if user is admin or super admin
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only admins can view fee statistics');
    }

    // TODO: Implement aggregation queries for fee statistics
    // For now, return basic retry queue stats
    const retryStats = await this.feeRetryService.getRetryStats();

    return {
      success: true,
      data: {
        retryQueue: retryStats,
        // Add more stats here as needed
      },
    };
  }

  /**
   * Get failed fee collections (Admin only)
   * GET /circle/fees/failed
   */
  @Get('fees/failed')
  @ApiOperation({
    summary: 'Get failed fee collections',
    description: 'Retrieve list of failed fee collections (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Failed fees retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getFailedFees(@Request() req: AuthRequest) {
    // Check if user is admin or super admin
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only admins can view failed fees');
    }

    const failedRetries = await this.feeRetryService.getFailedRetries();

    return {
      success: true,
      data: failedRetries,
    };
  }

  /**
   * Manually retry a failed fee collection (Admin only)
   * POST /circle/fees/retry/:retryId
   */
  @Post('fees/retry/:retryId')
  @ApiOperation({
    summary: 'Retry failed fee collection',
    description: 'Manually retry a failed fee collection (Admin only)',
  })
  @ApiParam({ name: 'retryId', description: 'Retry queue ID' })
  @ApiResponse({ status: 200, description: 'Retry initiated' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async retryFee(
    @Request() req: AuthRequest,
    @Param('retryId') retryId: string,
  ) {
    // Check if user is admin or super admin
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only admins can retry fee collections');
    }

    const success = await this.feeRetryService.manualRetry(retryId);

    return {
      success,
      message: success
        ? 'Fee retry initiated successfully'
        : 'Fee retry failed',
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
  @ApiOperation({
    summary: 'Get Circle configuration',
    description: 'Retrieve Circle SDK configuration and supported features',
  })
  @ApiResponse({ status: 200, description: 'Configuration retrieved' })
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
