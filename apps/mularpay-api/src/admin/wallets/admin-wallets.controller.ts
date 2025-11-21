import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseBoolPipe,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminWalletsService } from './admin-wallets.service';
import { AdjustWalletDto } from '../dto';

@Controller('admin/wallets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminWalletsController {
  constructor(private readonly adminWalletsService: AdminWalletsService) {}

  /**
   * GET /admin/wallets
   * Get wallets with filters
   */
  @Get()
  async getWallets(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('minBalance') minBalance?: number,
    @Query('maxBalance') maxBalance?: number,
    @Query('isLocked', new ParseBoolPipe({ optional: true }))
    isLocked?: boolean,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.adminWalletsService.getWallets(
      page,
      limit,
      minBalance,
      maxBalance,
      isLocked,
      sortBy,
      sortOrder,
    );
  }

  /**
   * GET /admin/wallets/stats
   * Get wallet statistics
   */
  @Get('stats')
  async getWalletStats() {
    return this.adminWalletsService.getWalletStats();
  }

  /**
   * GET /admin/wallets/:userId
   * Get wallet by user ID
   */
  @Get(':userId')
  async getWalletByUserId(@Param('userId') userId: string) {
    return this.adminWalletsService.getWalletByUserId(userId);
  }

  /**
   * POST /admin/wallets/:userId/adjust
   * Adjust wallet balance
   */
  @Post(':userId/adjust')
  async adjustBalance(
    @Request() req,
    @Param('userId') userId: string,
    @Body() dto: AdjustWalletDto,
  ) {
    return this.adminWalletsService.adjustBalance(req.user.id, userId, dto);
  }

  /**
   * POST /admin/wallets/:userId/reset-limits
   * Reset spending limits
   */
  @Post(':userId/reset-limits')
  async resetLimits(@Request() req, @Param('userId') userId: string) {
    return this.adminWalletsService.resetLimits(req.user.id, userId);
  }
}
