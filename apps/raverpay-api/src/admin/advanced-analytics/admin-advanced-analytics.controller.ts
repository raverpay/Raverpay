import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminAdvancedAnalyticsService } from './admin-advanced-analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Admin - Advanced Analytics')
@ApiBearerAuth('JWT-auth')
@Controller('admin/advanced-analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminAdvancedAnalyticsController {
  constructor(
    private readonly advancedAnalyticsService: AdminAdvancedAnalyticsService,
  ) {}

  @ApiOperation({ summary: 'Get revenue analytics over time' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiQuery({
    name: 'interval',
    required: false,
    enum: ['day', 'week', 'month'],
  })
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

  @ApiOperation({ summary: 'Get transaction trends over time' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiQuery({
    name: 'interval',
    required: false,
    enum: ['day', 'week', 'month'],
  })
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

  @ApiOperation({ summary: 'Get user growth metrics' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiQuery({
    name: 'interval',
    required: false,
    enum: ['day', 'week', 'month'],
  })
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

  @ApiOperation({ summary: 'Get cohort analysis' })
  @ApiQuery({ name: 'months', required: false, type: String })
  @Get('cohort-analysis')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getCohortAnalysis(@Query('months') months?: string) {
    return this.advancedAnalyticsService.getCohortAnalysis(
      months ? parseInt(months) : undefined,
    );
  }

  @ApiOperation({ summary: 'Get provider performance metrics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
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

  @ApiOperation({ summary: 'Get comprehensive platform metrics' })
  @Get('platform-overview')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getPlatformOverview() {
    return this.advancedAnalyticsService.getPlatformOverview();
  }
}
