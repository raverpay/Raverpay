import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { UpdateRatingConfigDto } from './dto/update-rating-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('app-config')
export class AppConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

  /**
   * Get rating prompt configuration (public endpoint for mobile app)
   * GET /app-config/rating-prompt
   */
  @Get('rating-prompt')
  async getRatingConfig() {
    return this.appConfigService.getRatingConfig();
  }

  /**
   * Update rating configuration (admin only)
   * PATCH /admin/app-config/rating-prompt
   */
  @Patch('admin/rating-prompt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateRatingConfig(@Body() updateDto: UpdateRatingConfigDto) {
    return this.appConfigService.updateRatingConfig(updateDto);
  }
}
