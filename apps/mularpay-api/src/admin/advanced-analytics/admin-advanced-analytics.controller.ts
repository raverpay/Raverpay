import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminAdvancedAnalyticsService } from './admin-advanced-analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin/advanced-analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminAdvancedAnalyticsController {
  constructor(
    private readonly advancedAnalyticsService: AdminAdvancedAnalyticsService,
  ) {}

  /**
   * GET /admin/advanced-analytics/revenue-time-series
   * Get revenue analytics over time
   */
  @Get('revenue-time-series')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getRevenueTimeSeries(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('interval') interval?: 'day' | 'week' | 'month',
  ) {
    return this.advancedAnalyticsService.getRevenueTimeSeries(
      startDate,
      endDate,
      interval,
    );
  }

  /**
   * GET /admin/advanced-analytics/transaction-trends
   * Get transaction trends over time
   */
  @Get('transaction-trends')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getTransactionTrends(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('interval') interval?: 'day' | 'week' | 'month',
  ) {
    return this.advancedAnalyticsService.getTransactionTrends(
      startDate,
      endDate,
      interval,
    );
  }

  /**
   * GET /admin/advanced-analytics/user-growth
   * Get user growth metrics
   */
  @Get('user-growth')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getUserGrowth(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('interval') interval?: 'day' | 'week' | 'month',
  ) {
    return this.advancedAnalyticsService.getUserGrowth(
      startDate,
      endDate,
      interval,
    );
  }

  /**
   * GET /admin/advanced-analytics/cohort-analysis
   * Get cohort analysis
   */
  @Get('cohort-analysis')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getCohortAnalysis(@Query('months') months?: string) {
    return this.advancedAnalyticsService.getCohortAnalysis(
      months ? parseInt(months) : undefined,
    );
  }

  /**
   * GET /admin/advanced-analytics/provider-performance
   * Get provider performance metrics
   */
  @Get('provider-performance')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getProviderPerformance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.advancedAnalyticsService.getProviderPerformance(
      startDate,
      endDate,
    );
  }

  /**
   * GET /admin/advanced-analytics/platform-overview
   * Get comprehensive platform metrics
   */
  @Get('platform-overview')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getPlatformOverview() {
    return this.advancedAnalyticsService.getPlatformOverview();
  }
}
