import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { RateLimitsService } from './rate-limits.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Admin - Rate Limits')
@ApiBearerAuth('JWT-auth')
@Controller('admin/rate-limits')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class RateLimitsController {
  constructor(private readonly rateLimitsService: RateLimitsService) {}

  @ApiOperation({ summary: 'Get rate limit stats' })
  @Get('stats')
  async getStats() {
    return this.rateLimitsService.getStats();
  }

  @ApiOperation({ summary: 'Get rate limit violations' })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiQuery({ name: 'endpoint', required: false, type: String })
  @ApiQuery({ name: 'country', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @Get('violations')
  async getViolations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('endpoint') endpoint?: string,
    @Query('country') country?: string,
    @Query('search') search?: string,
  ) {
    return this.rateLimitsService.getViolations({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      endpoint,
      country,
      search,
    });
  }

  @ApiOperation({ summary: 'Get rate limit metrics' })
  @ApiQuery({ name: 'days', required: false, type: String })
  @Get('metrics')
  async getMetrics(@Query('days') days?: string) {
    return this.rateLimitsService.getMetrics(days ? parseInt(days) : 7);
  }

  @ApiOperation({ summary: 'Get top violators' })
  @ApiQuery({ name: 'type', required: false, enum: ['ip', 'user'] })
  @Get('top-violators')
  async getTopViolators(@Query('type') type: 'ip' | 'user' = 'ip') {
    return this.rateLimitsService.getTopViolators(type);
  }

  @ApiOperation({ summary: 'Get geographic distribution' })
  @Get('geographic')
  async getGeographicDistribution() {
    return this.rateLimitsService.getGeographicDistribution();
  }

  @ApiOperation({ summary: 'Get locked accounts' })
  @ApiQuery({ name: 'permanent', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @Get('locked-accounts')
  async getLockedAccounts(
    @Query('permanent') permanent?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.rateLimitsService.getLockedAccounts({
      permanent: permanent === 'true',
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }
}
