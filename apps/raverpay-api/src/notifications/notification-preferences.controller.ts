import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationPreferencesService } from './notification-preferences.service';
import { UpdateNotificationPreferencesDto } from './dto';
import { UpdateOneSignalDto } from './dto/update-onesignal.dto';

/**
 * Notification Preferences Controller
 *
 * Endpoints for managing user notification preferences
 * All endpoints require authentication
 */
@Controller('notification-preferences')
@UseGuards(JwtAuthGuard)
export class NotificationPreferencesController {
  constructor(
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  /**
   * Get current user's notification preferences
   * GET /notification-preferences
   *
   * @returns User's notification preferences
   */
  @Get()
  async getPreferences(@Request() req) {
    return this.preferencesService.getPreferences(req.user.id);
  }

  /**
   * Update current user's notification preferences
   * PUT /notification-preferences
   *
   * @param req - Request with authenticated user
   * @param dto - Updated preferences
   * @returns Updated preferences
   */
  @Put()
  async updatePreferences(
    @Request() req,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.preferencesService.updatePreferences(req.user.id, dto);
  }

  /**
   * Reset preferences to default
   * POST /notification-preferences/reset
   *
   * @param req - Request with authenticated user
   * @returns Reset preferences
   */
  @Post('reset')
  async resetPreferences(@Request() req) {
    return this.preferencesService.resetToDefault(req.user.id);
  }

  /**
   * Opt out of a specific category
   * POST /notification-preferences/opt-out/:category
   *
   * @param req - Request with authenticated user
   * @param category - Category to opt out of (TRANSACTION, SECURITY, KYC, PROMOTIONAL, etc.)
   * @returns Updated preferences
   */
  @Post('opt-out/:category')
  async optOutCategory(@Request() req, @Param('category') category: string) {
    return this.preferencesService.optOutCategory(req.user.id, category);
  }

  /**
   * Opt back into a specific category
   * DELETE /notification-preferences/opt-out/:category
   *
   * @param req - Request with authenticated user
   * @param category - Category to opt back into
   * @returns Updated preferences
   */
  @Delete('opt-out/:category')
  async optInCategory(@Request() req, @Param('category') category: string) {
    return this.preferencesService.optInCategory(req.user.id, category);
  }

  /**
   * Update OneSignal push notification token
   * POST /notification-preferences/onesignal
   *
   * @param req - Request with authenticated user
   * @param dto - OneSignal player ID and external ID
   * @returns Updated preferences with OneSignal token
   */
  @Post('onesignal')
  async updateOneSignalToken(@Request() req, @Body() dto: UpdateOneSignalDto) {
    return this.preferencesService.updateOneSignalToken(
      req.user.id,
      dto.oneSignalPlayerId,
      dto.oneSignalExternalId,
    );
  }
}
