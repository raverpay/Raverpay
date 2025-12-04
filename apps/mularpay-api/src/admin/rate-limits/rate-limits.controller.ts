import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RateLimitsService } from './rate-limits.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin/rate-limits')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class RateLimitsController {
  constructor(private readonly rateLimitsService: RateLimitsService) {}

  @Get('stats')
  async getStats() {
    return this.rateLimitsService.getStats();
  }

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

  @Get('metrics')
  async getMetrics(@Query('days') days?: string) {
    return this.rateLimitsService.getMetrics(days ? parseInt(days) : 7);
  }

  @Get('top-violators')
  async getTopViolators(@Query('type') type: 'ip' | 'user' = 'ip') {
    return this.rateLimitsService.getTopViolators(type);
  }

  @Get('geographic')
  async getGeographicDistribution() {
    return this.rateLimitsService.getGeographicDistribution();
  }
}
