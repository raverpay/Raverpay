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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { AdminVenlyWalletsService } from './admin-venly-wallets.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { UserRole, CryptoTransactionStatus } from '@prisma/client';

@ApiTags('Admin - Venly Wallets')
@ApiBearerAuth('JWT-auth')
@Controller('admin/venly-wallets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminVenlyWalletsController {
  constructor(private readonly venlyWalletsService: AdminVenlyWalletsService) {}

  @ApiOperation({ summary: 'Get all crypto wallets with filters' })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'minBalance', required: false, type: String })
  @ApiQuery({ name: 'maxBalance', required: false, type: String })
  @ApiQuery({ name: 'hasWallet', required: false, type: String })
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

  @ApiOperation({ summary: 'Get crypto wallet statistics' })
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getWalletStats() {
    return this.venlyWalletsService.getWalletStats();
  }

  @ApiOperation({ summary: 'Get analytics data' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @Get('analytics')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.venlyWalletsService.getAnalytics(startDate, endDate);
  }

  @ApiOperation({ summary: "Get user's crypto wallet details" })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Get('user/:userId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getUserCryptoWallet(@Param('userId') userId: string) {
    return this.venlyWalletsService.getUserCryptoWallet(userId);
  }

  @ApiOperation({ summary: 'Get crypto transactions with filters' })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: CryptoTransactionStatus })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
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

  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @Get('transactions/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getTransactionById(@Param('id') id: string) {
    return this.venlyWalletsService.getTransactionById(id);
  }

  @ApiOperation({ summary: 'Flag transaction as suspicious' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiBody({
    schema: { type: 'object', properties: { reason: { type: 'string' } } },
  })
  @Post('transactions/:id/flag')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async flagTransaction(
    @GetUser('id') adminUserId: string,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.venlyWalletsService.flagTransaction(adminUserId, id, reason);
  }

  @ApiOperation({ summary: 'Get crypto to Naira conversions' })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: CryptoTransactionStatus })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
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

  @ApiOperation({ summary: 'Get exchange rates' })
  @Get('exchange-rates')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getExchangeRates() {
    return this.venlyWalletsService.getExchangeRates();
  }

  @ApiOperation({ summary: 'Update exchange rate' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        currency: { type: 'string' },
        toNaira: { type: 'number' },
        platformFeePercent: { type: 'number' },
      },
    },
  })
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
