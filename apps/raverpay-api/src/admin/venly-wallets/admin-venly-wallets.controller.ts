import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminVenlyWalletsService } from './admin-venly-wallets.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { UserRole, CryptoTransactionStatus } from '@prisma/client';

@Controller('admin/venly-wallets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminVenlyWalletsController {
  constructor(private readonly venlyWalletsService: AdminVenlyWalletsService) {}

  /**
   * GET /admin/venly-wallets
   * Get all crypto wallets with filters
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getCryptoWallets(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('minBalance') minBalance?: string,
    @Query('maxBalance') maxBalance?: string,
    @Query('hasWallet') hasWallet?: string,
  ) {
    return this.venlyWalletsService.getCryptoWallets(
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
      search,
      minBalance ? parseFloat(minBalance) : undefined,
      maxBalance ? parseFloat(maxBalance) : undefined,
      hasWallet ? hasWallet === 'true' : undefined,
    );
  }

  /**
   * GET /admin/venly-wallets/stats
   * Get crypto wallet statistics
   */
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getWalletStats() {
    return this.venlyWalletsService.getWalletStats();
  }

  /**
   * GET /admin/venly-wallets/analytics
   * Get analytics data
   */
  @Get('analytics')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.venlyWalletsService.getAnalytics(startDate, endDate);
  }

  /**
   * GET /admin/venly-wallets/user/:userId
   * Get user's crypto wallet details
   */
  @Get('user/:userId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getUserCryptoWallet(@Param('userId') userId: string) {
    return this.venlyWalletsService.getUserCryptoWallet(userId);
  }

  /**
   * GET /admin/venly-wallets/transactions
   * Get crypto transactions with filters
   */
  @Get('transactions')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getCryptoTransactions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: CryptoTransactionStatus,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.venlyWalletsService.getCryptoTransactions(
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
      userId,
      status,
      type,
      startDate,
      endDate,
    );
  }

  /**
   * GET /admin/venly-wallets/transactions/:id
   * Get transaction by ID
   */
  @Get('transactions/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getTransactionById(@Param('id') id: string) {
    return this.venlyWalletsService.getTransactionById(id);
  }

  /**
   * POST /admin/venly-wallets/transactions/:id/flag
   * Flag transaction as suspicious
   */
  @Post('transactions/:id/flag')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async flagTransaction(
    @GetUser('id') adminUserId: string,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.venlyWalletsService.flagTransaction(adminUserId, id, reason);
  }

  /**
   * GET /admin/venly-wallets/conversions
   * Get crypto to Naira conversions
   */
  @Get('conversions')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getCryptoConversions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: CryptoTransactionStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.venlyWalletsService.getCryptoConversions(
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
      userId,
      status,
      startDate,
      endDate,
    );
  }

  /**
   * GET /admin/venly-wallets/exchange-rates
   * Get exchange rates
   */
  @Get('exchange-rates')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getExchangeRates() {
    return this.venlyWalletsService.getExchangeRates();
  }

  /**
   * PATCH /admin/venly-wallets/exchange-rates
   * Update exchange rate
   */
  @Patch('exchange-rates')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateExchangeRate(
    @GetUser('id') adminUserId: string,
    @Body('currency') currency: string,
    @Body('toNaira') toNaira: number,
    @Body('platformFeePercent') platformFeePercent?: number,
  ) {
    return this.venlyWalletsService.updateExchangeRate(
      adminUserId,
      currency,
      toNaira,
      platformFeePercent,
    );
  }
}
