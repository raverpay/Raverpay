import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminCircleService } from './admin-circle.service';
import {
  QueryCircleWalletsDto,
  QueryCircleTransactionsDto,
  QueryCCTPTransfersDto,
  QueryWebhookLogsDto,
  CircleAnalyticsDto,
} from './admin-circle.dto';

@Controller('admin/circle')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminCircleController {
  constructor(private readonly adminCircleService: AdminCircleService) {}

  /**
   * GET /admin/circle/config
   * Get Circle configuration
   */
  @Get('config')
  async getConfig() {
    const config = await this.adminCircleService.getConfig();
    return {
      success: true,
      data: config,
    };
  }

  /**
   * GET /admin/circle/stats
   * Get Circle statistics
   */
  @Get('stats')
  async getStats() {
    const stats = await this.adminCircleService.getStats();
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * GET /admin/circle/wallets
   * Get paginated wallets with filters
   */
  @Get('wallets')
  async getWallets(@Query() query: QueryCircleWalletsDto) {
    return this.adminCircleService.getWallets(query);
  }

  /**
   * GET /admin/circle/wallets/user/:userId
   * Get wallets by user ID
   */
  @Get('wallets/user/:userId')
  async getWalletsByUser(@Param('userId') userId: string) {
    const wallets = await this.adminCircleService.getWalletsByUser(userId);
    return {
      success: true,
      data: wallets,
    };
  }

  /**
   * GET /admin/circle/wallets/:id
   * Get wallet by ID
   */
  @Get('wallets/:id')
  async getWalletById(@Param('id') id: string) {
    const wallet = await this.adminCircleService.getWalletById(id);
    return {
      success: true,
      data: wallet,
    };
  }

  /**
   * GET /admin/circle/wallet-sets
   * Get paginated wallet sets
   */
  @Get('wallet-sets')
  async getWalletSets(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminCircleService.getWalletSets({ page, limit });
  }

  /**
   * GET /admin/circle/wallet-sets/:id
   * Get wallet set by ID
   */
  @Get('wallet-sets/:id')
  async getWalletSetById(@Param('id') id: string) {
    const walletSet = await this.adminCircleService.getWalletSetById(id);
    return {
      success: true,
      data: walletSet,
    };
  }

  /**
   * GET /admin/circle/transactions
   * Get paginated transactions with filters
   */
  @Get('transactions')
  async getTransactions(@Query() query: QueryCircleTransactionsDto) {
    return this.adminCircleService.getTransactions(query);
  }

  /**
   * GET /admin/circle/transactions/:id
   * Get transaction by ID
   */
  @Get('transactions/:id')
  async getTransactionById(@Param('id') id: string) {
    const transaction = await this.adminCircleService.getTransactionById(id);
    return {
      success: true,
      data: transaction,
    };
  }

  /**
   * GET /admin/circle/cctp-transfers
   * Get paginated CCTP transfers with filters
   */
  @Get('cctp-transfers')
  async getCCTPTransfers(@Query() query: QueryCCTPTransfersDto) {
    return this.adminCircleService.getCCTPTransfers(query);
  }

  /**
   * GET /admin/circle/cctp-transfers/:id
   * Get CCTP transfer by ID
   */
  @Get('cctp-transfers/:id')
  async getCCTPTransferById(@Param('id') id: string) {
    const transfer = await this.adminCircleService.getCCTPTransferById(id);
    return {
      success: true,
      data: transfer,
    };
  }

  /**
   * GET /admin/circle/webhook-logs
   * Get paginated webhook logs
   */
  @Get('webhook-logs')
  async getWebhookLogs(@Query() query: QueryWebhookLogsDto) {
    return this.adminCircleService.getWebhookLogs(query);
  }

  /**
   * GET /admin/circle/analytics
   * Get analytics data
   */
  @Get('analytics')
  async getAnalytics(@Query() params: CircleAnalyticsDto) {
    const analytics = await this.adminCircleService.getAnalytics(params);
    return {
      success: true,
      data: analytics,
    };
  }

  /**
   * GET /admin/circle/users
   * Get paginated Circle users
   */
  @Get('users')
  async getCircleUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('authMethod') authMethod?: string,
    @Query('status') status?: string,
  ) {
    return this.adminCircleService.getCircleUsers({
      page,
      limit,
      search,
      authMethod,
      status,
    });
  }

  /**
   * GET /admin/circle/users/stats
   * Get Circle users statistics
   */
  @Get('users/stats')
  async getCircleUsersStats() {
    const stats = await this.adminCircleService.getCircleUsersStats();
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * GET /admin/circle/users/:id
   * Get Circle user by ID
   */
  @Get('users/:id')
  async getCircleUserById(@Param('id') id: string) {
    const user = await this.adminCircleService.getCircleUserById(id);
    return {
      success: true,
      data: user,
    };
  }
}
