import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { UpdateRatingConfigDto } from './dto/update-rating-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ReAuthGuard } from '../common/guards/re-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

@ApiTags('App Config')
@Controller('app-config')
export class AppConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

  /**
   * Get rating prompt configuration (public endpoint for mobile app)
   * GET /app-config/rating-prompt
   */
  @Get('rating-prompt')
  @ApiOperation({
    summary: 'Get Rating Config',
    description: 'Get rating prompt configuration (public)',
  })
  async getRatingConfig() {
    return this.appConfigService.getRatingConfig();
  }

  /**
   * Update rating configuration (admin only)
   * PATCH /admin/app-config/rating-prompt
   */
  @Patch('admin/rating-prompt')
  @UseGuards(JwtAuthGuard, RolesGuard, ReAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update Rating Config',
    description:
      'Update rating configuration (Admin only). Requires re-authentication for this sensitive operation.',
  })
  @ApiBody({ type: UpdateRatingConfigDto })
  async updateRatingConfig(@Body() updateDto: UpdateRatingConfigDto) {
    return this.appConfigService.updateRatingConfig(updateDto);
  }
}
