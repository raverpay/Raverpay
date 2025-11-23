import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminAnalyticsService } from './admin-analytics.service';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminAnalyticsController {
  constructor(private readonly adminAnalyticsService: AdminAnalyticsService) {}

  /**
   * GET /admin/analytics/dashboard
   * Get dashboard overview analytics
   */
  @Get('dashboard')
  async getDashboardAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminAnalyticsService.getDashboardAnalytics(startDate, endDate);
  }

  /**
   * GET /admin/analytics/revenue
   * Get revenue analytics
   */
  @Get('revenue')
  async getRevenueAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
  ) {
    return this.adminAnalyticsService.getRevenueAnalytics(
      startDate,
      endDate,
      groupBy,
    );
  }

  /**
   * GET /admin/analytics/users
   * Get user growth analytics
   */
  @Get('users')
  async getUserGrowthAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminAnalyticsService.getUserGrowthAnalytics(
      startDate,
      endDate,
    );
  }

  /**
   * GET /admin/analytics/transactions
   * Get transaction trends
   */
  @Get('transactions')
  async getTransactionTrends(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
  ) {
    return this.adminAnalyticsService.getTransactionTrends(
      startDate,
      endDate,
      type,
    );
  }
}
