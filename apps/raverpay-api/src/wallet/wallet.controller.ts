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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { LockWalletDto, UnlockWalletDto, GetTransactionsDto } from './dto';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiTags('Wallet')
@ApiBearerAuth('JWT-auth')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * Get wallet balance and details
   * GET /api/wallet
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get wallet balance',
    description:
      'Retrieve current wallet balance and details for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet balance retrieved successfully',
    schema: {
      example: {
        id: 'wallet_123',
        userId: 'user_123',
        balance: '50000.00',
        currency: 'NGN',
        isLocked: false,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getWalletBalance(@GetUser('id') userId: string) {
    return this.walletService.getWalletBalance(userId);
  }

  /**
   * Get wallet limits based on KYC tier
   * GET /api/wallet/limits
   */
  @Get('limits')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get wallet transaction limits',
    description: 'Retrieve transaction limits based on user KYC tier',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet limits retrieved',
    schema: {
      example: {
        tier: 'TIER_1',
        dailyLimit: '50000.00',
        monthlyLimit: '200000.00',
        singleTransactionLimit: '10000.00',
      },
    },
  })
  async getWalletLimits(@GetUser('id') userId: string) {
    return this.walletService.getWalletLimits(userId);
  }

  /**
   * Lock user's wallet
   * POST /api/wallet/lock
   */
  @Post('lock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lock wallet',
    description: 'Lock user wallet to prevent transactions',
  })
  @ApiResponse({ status: 200, description: 'Wallet locked successfully' })
  @ApiResponse({ status: 400, description: 'Wallet already locked' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async lockWallet(
    @GetUser('id') userId: string,
    @Body() lockWalletDto: LockWalletDto,
  ) {
    return this.walletService.lockWallet(userId, lockWalletDto.reason);
  }

  /**
   * Unlock wallet (Admin only - for now any user can unlock)
   * TODO: Add admin role guard
   * POST /api/wallet/unlock
   */
  @Post('unlock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unlock wallet',
    description: 'Unlock a locked wallet (admin function)',
  })
  @ApiResponse({ status: 200, description: 'Wallet unlocked successfully' })
  @ApiResponse({ status: 400, description: 'Wallet not locked' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async unlockWallet(
    @GetUser('id') adminId: string,
    @Body() unlockWalletDto: UnlockWalletDto,
  ) {
    return this.walletService.unlockWallet(
      unlockWalletDto.walletId,
      adminId,
      unlockWalletDto.reason,
    );
  }

  /**
   * Get transaction history with pagination and filters
   * GET /api/wallet/transactions
   */
  @Get('transactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get transaction history',
    description: 'Retrieve paginated transaction history with optional filters',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by transaction type',
  })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTransactionHistory(
    @GetUser('id') userId: string,
    @Query() getTransactionsDto: GetTransactionsDto,
  ) {
    return this.walletService.getTransactionHistory(userId, getTransactionsDto);
  }

  /**
   * Get single transaction details
   * GET /api/wallet/transactions/:id
   */
  @Get('transactions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get transaction details',
    description: 'Retrieve details of a specific transaction',
  })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({
    status: 200,
    description: 'Transaction retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransactionById(
    @GetUser('id') userId: string,
    @Param('id') transactionId: string,
  ) {
    return this.walletService.getTransactionById(userId, transactionId);
  }
}
