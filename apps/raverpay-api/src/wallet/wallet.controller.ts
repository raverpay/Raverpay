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
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { LockWalletDto, UnlockWalletDto, GetTransactionsDto } from './dto';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * Get wallet balance and details
   * GET /api/wallet
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getWalletBalance(@GetUser('id') userId: string) {
    return this.walletService.getWalletBalance(userId);
  }

  /**
   * Get wallet limits based on KYC tier
   * GET /api/wallet/limits
   */
  @Get('limits')
  @HttpCode(HttpStatus.OK)
  async getWalletLimits(@GetUser('id') userId: string) {
    return this.walletService.getWalletLimits(userId);
  }

  /**
   * Lock user's wallet
   * POST /api/wallet/lock
   */
  @Post('lock')
  @HttpCode(HttpStatus.OK)
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
  async getTransactionById(
    @GetUser('id') userId: string,
    @Param('id') transactionId: string,
  ) {
    return this.walletService.getTransactionById(userId, transactionId);
  }
}
