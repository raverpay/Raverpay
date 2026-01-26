import {
  Controller,
  Get,
  Query,
  Param,
  HttpStatus,
  UseGuards,
  Logger,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AlchemyAdminService } from './alchemy-admin.service';
import { AlchemyTransactionState } from '@prisma/client';

/**
 * Alchemy Admin Controller
 *
 * Admin-only endpoints for monitoring, analytics, and management
 *
 * ⚠️ ALL ENDPOINTS REQUIRE ADMIN AUTHENTICATION
 * Uncomment @UseGuards(AdminAuthGuard) in production
 */
@ApiTags('Alchemy Admin')
@Controller('alchemy/admin')
// @UseGuards(AdminAuthGuard) // Uncomment in production!
@ApiBearerAuth()
export class AlchemyAdminController {
  private readonly logger = new Logger(AlchemyAdminController.name);

  constructor(private readonly adminService: AlchemyAdminService) {}

  /**
   * Get platform-wide statistics
   */
  @Get('stats/platform')
  @ApiOperation({ summary: 'Get platform-wide statistics' })
  @ApiResponse({
    status: 200,
    description: 'Platform statistics retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          wallets: {
            total: 1250,
            active: 1180,
            inactive: 70,
            eoa: 800,
            smartAccount: 450,
            gasSponsored: 450,
            smartAccountAdoptionRate: '36.00%',
          },
          transactions: {
            total: 5420,
            completed: 5125,
            failed: 125,
            pending: 170,
            successRate: '94.56%',
          },
          users: {
            total: 850,
            withWallets: 850,
            averageWalletsPerUser: '1.47',
          },
        },
      },
    },
  })
  async getPlatformStats() {
    try {
      const stats = await this.adminService.getPlatformStats();

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      this.logger.error(
        `Error getting platform stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get gas spending analytics
   */
  @Get('stats/gas')
  @ApiOperation({ summary: 'Get gas spending analytics' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date (ISO format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date (ISO format)',
  })
  @ApiQuery({
    name: 'blockchain',
    required: false,
    type: String,
    description: 'Filter by blockchain',
  })
  @ApiResponse({
    status: 200,
    description: 'Gas analytics retrieved successfully',
  })
  async getGasSpendingAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('blockchain') blockchain?: string,
  ) {
    try {
      const analytics = await this.adminService.getGasSpendingAnalytics({
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        blockchain,
      });

      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      this.logger.error(
        `Error getting gas analytics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get recent transactions
   */
  @Get('transactions')
  @ApiOperation({ summary: 'Get recent transactions (admin view)' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of transactions to return',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of transactions to skip',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    enum: AlchemyTransactionState,
    description: 'Filter by transaction state',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'Filter by user ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
  })
  async getRecentTransactions(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('state') state?: AlchemyTransactionState,
    @Query('userId') userId?: string,
  ) {
    try {
      const result = await this.adminService.getRecentTransactions({
        limit,
        offset,
        state,
        userId,
      });

      return {
        success: true,
        data: result.transactions,
        pagination: result.pagination,
      };
    } catch (error) {
      this.logger.error(
        `Error getting recent transactions: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get user overview
   */
  @Get('users/:userId')
  @ApiOperation({ summary: 'Get comprehensive user overview' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User overview retrieved successfully',
  })
  async getUserOverview(@Param('userId') userId: string) {
    try {
      const overview = await this.adminService.getUserWalletsOverview(userId);

      return {
        success: true,
        data: overview,
      };
    } catch (error) {
      this.logger.error(
        `Error getting user overview: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get network statistics
   */
  @Get('stats/networks')
  @ApiOperation({ summary: 'Get blockchain network statistics' })
  @ApiResponse({
    status: 200,
    description: 'Network statistics retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          networks: [
            {
              blockchain: 'BASE',
              network: 'sepolia',
              wallets: 450,
              transactions: {
                total: 2340,
                completed: 2210,
                failed: 80,
                pending: 50,
              },
            },
          ],
          totalNetworks: 3,
        },
      },
    },
  })
  async getNetworkStats() {
    try {
      const stats = await this.adminService.getNetworkStats();

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      this.logger.error(
        `Error getting network stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get security alerts
   */
  @Get('security/alerts')
  @ApiOperation({ summary: 'Get security alerts and incidents' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of alerts to return',
  })
  @ApiQuery({
    name: 'daysBack',
    required: false,
    type: Number,
    description: 'Days to look back',
  })
  @ApiResponse({
    status: 200,
    description: 'Security alerts retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          compromisedWallets: [],
          failedTransactions: [],
          summary: {
            compromisedWallets: 0,
            lockedWallets: 2,
            failedTransactions: 15,
            totalAlerts: 17,
          },
        },
      },
    },
  })
  async getSecurityAlerts(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('daysBack', new DefaultValuePipe(7), ParseIntPipe) daysBack: number,
  ) {
    try {
      const alerts = await this.adminService.getSecurityAlerts({
        limit,
        daysBack,
      });

      return {
        success: true,
        data: alerts,
      };
    } catch (error) {
      this.logger.error(
        `Error getting security alerts: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * System health check
   */
  @Get('health')
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({
    status: 200,
    description: 'System health retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          status: 'healthy',
          timestamp: '2026-01-25T13:00:00.000Z',
          metrics: {
            transactionsLastHour: 142,
            successRate: '96.48%',
            pendingTransactions: 12,
            failedLast24h: 8,
          },
          issues: [],
        },
      },
    },
  })
  async getSystemHealth() {
    try {
      const health = await this.adminService.getSystemHealth();

      return {
        success: true,
        data: health,
      };
    } catch (error) {
      this.logger.error(
        `Error getting system health: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
