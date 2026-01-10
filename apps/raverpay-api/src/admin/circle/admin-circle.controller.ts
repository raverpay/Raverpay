import { Controller, Get, Put, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
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
  UpdateBlockchainConfigDto,
} from './admin-circle.dto';

@ApiTags('Admin - Circle')
@ApiBearerAuth('JWT-auth')
@Controller('admin/circle')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminCircleController {
  constructor(private readonly adminCircleService: AdminCircleService) {}

  @ApiOperation({ summary: 'Get Circle configuration' })
  @Get('config')
  async getConfig() {
    const config = await this.adminCircleService.getConfig();
    return {
      success: true,
      data: config,
    };
  }

  @ApiOperation({ summary: 'Get Circle statistics' })
  @Get('stats')
  async getStats() {
    const stats = await this.adminCircleService.getStats();
    return {
      success: true,
      data: stats,
    };
  }

  @ApiOperation({ summary: 'Get paginated wallets with filters' })
  @Get('wallets')
  async getWallets(@Query() query: QueryCircleWalletsDto) {
    return this.adminCircleService.getWallets(query);
  }

  @ApiOperation({ summary: 'Get wallets by user ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Get('wallets/user/:userId')
  async getWalletsByUser(@Param('userId') userId: string) {
    const wallets = await this.adminCircleService.getWalletsByUser(userId);
    return {
      success: true,
      data: wallets,
    };
  }

  @ApiOperation({ summary: 'Get wallet by ID' })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  @Get('wallets/:id')
  async getWalletById(@Param('id') id: string) {
    const wallet = await this.adminCircleService.getWalletById(id);
    return {
      success: true,
      data: wallet,
    };
  }

  @ApiOperation({ summary: 'Get paginated wallet sets' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get('wallet-sets')
  async getWalletSets(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminCircleService.getWalletSets({ page, limit });
  }

  @ApiOperation({ summary: 'Get wallet set by ID' })
  @ApiParam({ name: 'id', description: 'Wallet Set ID' })
  @Get('wallet-sets/:id')
  async getWalletSetById(@Param('id') id: string) {
    const walletSet = await this.adminCircleService.getWalletSetById(id);
    return {
      success: true,
      data: walletSet,
    };
  }

  @ApiOperation({ summary: 'Get paginated transactions with filters' })
  @Get('transactions')
  async getTransactions(@Query() query: QueryCircleTransactionsDto) {
    return this.adminCircleService.getTransactions(query);
  }

  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @Get('transactions/:id')
  async getTransactionById(@Param('id') id: string) {
    const transaction = await this.adminCircleService.getTransactionById(id);
    return {
      success: true,
      data: transaction,
    };
  }

  @ApiOperation({ summary: 'Get paginated CCTP transfers with filters' })
  @Get('cctp-transfers')
  async getCCTPTransfers(@Query() query: QueryCCTPTransfersDto) {
    return this.adminCircleService.getCCTPTransfers(query);
  }

  @ApiOperation({ summary: 'Get CCTP transfer by ID' })
  @ApiParam({ name: 'id', description: 'Transfer ID' })
  @Get('cctp-transfers/:id')
  async getCCTPTransferById(@Param('id') id: string) {
    const transfer = await this.adminCircleService.getCCTPTransferById(id);
    return {
      success: true,
      data: transfer,
    };
  }

  @ApiOperation({ summary: 'Get paginated webhook logs' })
  @Get('webhook-logs')
  async getWebhookLogs(@Query() query: QueryWebhookLogsDto) {
    return this.adminCircleService.getWebhookLogs(query);
  }

  @ApiOperation({ summary: 'Get analytics data' })
  @Get('analytics')
  async getAnalytics(@Query() params: CircleAnalyticsDto) {
    const analytics = await this.adminCircleService.getAnalytics(params);
    return {
      success: true,
      data: analytics,
    };
  }

  @ApiOperation({ summary: 'Get fee analytics data' })
  @Get('fee-analytics')
  async getFeeAnalytics(@Query() params: CircleAnalyticsDto) {
    const analytics = await this.adminCircleService.getFeeAnalytics(params);
    return {
      success: true,
      data: analytics,
    };
  }

  @ApiOperation({ summary: 'Get paginated Circle users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'authMethod', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
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

  @ApiOperation({ summary: 'Get Circle users statistics' })
  @Get('users/stats')
  async getCircleUsersStats() {
    const stats = await this.adminCircleService.getCircleUsersStats();
    return {
      success: true,
      data: stats,
    };
  }

  @ApiOperation({ summary: 'Get Circle user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @Get('users/:id')
  async getCircleUserById(@Param('id') id: string) {
    const user = await this.adminCircleService.getCircleUserById(id);
    return {
      success: true,
      data: user,
    };
  }

  // Modular Wallets
  @ApiOperation({ summary: 'Get paginated modular wallets' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'blockchain', required: false, type: String })
  @Get('modular/wallets')
  async getModularWallets(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('blockchain') blockchain?: string,
  ) {
    return this.adminCircleService.getModularWallets({
      page,
      limit,
      search,
      blockchain,
    });
  }

  @ApiOperation({ summary: 'Get modular wallet by ID' })
  @ApiParam({ name: 'id', description: 'Modular Wallet ID' })
  @Get('modular/wallets/:id')
  async getModularWalletById(@Param('id') id: string) {
    const wallet = await this.adminCircleService.getModularWalletById(id);
    return {
      success: true,
      data: wallet,
    };
  }

  @ApiOperation({ summary: 'Get passkey credentials for modular wallet' })
  @ApiParam({ name: 'id', description: 'Modular Wallet ID' })
  @Get('modular/wallets/:id/passkeys')
  async getModularWalletPasskeys(@Param('id') id: string) {
    const passkeys = await this.adminCircleService.getModularWalletPasskeys(id);
    return {
      success: true,
      data: passkeys,
    };
  }

  @ApiOperation({ summary: 'Get modular wallet statistics' })
  @Get('modular/stats')
  async getModularWalletStats() {
    const stats = await this.adminCircleService.getModularWalletStats();
    return {
      success: true,
      data: stats,
    };
  }

  // ==========================================
  // Blockchain Configuration Management
  // ==========================================

  @ApiOperation({ summary: 'Get all blockchain configurations' })
  @Get('blockchains')
  async getBlockchainConfigs() {
    const configs = await this.adminCircleService.getBlockchainConfigs();
    return {
      success: true,
      data: configs,
    };
  }

  @ApiOperation({ summary: 'Get blockchain configuration by ID' })
  @ApiParam({ name: 'blockchain', description: 'Blockchain identifier (e.g., BASE-SEPOLIA)' })
  @Get('blockchains/:blockchain')
  async getBlockchainConfig(@Param('blockchain') blockchain: string) {
    const config = await this.adminCircleService.getBlockchainConfig(blockchain);
    return {
      success: true,
      data: config,
    };
  }

  @ApiOperation({ summary: 'Update blockchain configuration' })
  @ApiParam({ name: 'blockchain', description: 'Blockchain identifier' })
  @Put('blockchains/:blockchain')
  async updateBlockchainConfig(
    @Param('blockchain') blockchain: string,
    @Body() updates: UpdateBlockchainConfigDto,
  ) {
    const config = await this.adminCircleService.updateBlockchainConfig(blockchain, updates);
    return {
      success: true,
      data: config,
    };
  }

  @ApiOperation({ summary: 'Enable a blockchain' })
  @ApiParam({ name: 'blockchain', description: 'Blockchain identifier' })
  @Post('blockchains/:blockchain/enable')
  async enableBlockchain(@Param('blockchain') blockchain: string) {
    await this.adminCircleService.enableBlockchain(blockchain);
    return {
      success: true,
      message: `Blockchain ${blockchain} has been enabled`,
    };
  }

  @ApiOperation({ summary: 'Disable a blockchain' })
  @ApiParam({ name: 'blockchain', description: 'Blockchain identifier' })
  @Post('blockchains/:blockchain/disable')
  async disableBlockchain(@Param('blockchain') blockchain: string) {
    await this.adminCircleService.disableBlockchain(blockchain);
    return {
      success: true,
      message: `Blockchain ${blockchain} has been disabled`,
    };
  }
}
