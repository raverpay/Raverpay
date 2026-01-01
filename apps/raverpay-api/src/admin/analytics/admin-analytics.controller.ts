import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminAnalyticsService } from './admin-analytics.service';

@ApiTags('Admin - Analytics')
@ApiBearerAuth('JWT-auth')
@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminAnalyticsController {
  constructor(private readonly adminAnalyticsService: AdminAnalyticsService) {}

  @ApiOperation({ summary: 'Get dashboard overview analytics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @Get('dashboard')
  async getDashboardAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminAnalyticsService.getDashboardAnalytics(startDate, endDate);
  }

  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({
    name: 'groupBy',
    required: false,
    enum: ['day', 'week', 'month'],
  })
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

  @ApiOperation({ summary: 'Get user growth analytics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
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

  @ApiOperation({ summary: 'Get transaction trends' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
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
