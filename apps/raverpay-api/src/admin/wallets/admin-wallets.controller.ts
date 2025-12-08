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
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminWalletsService } from './admin-wallets.service';
import { AdjustWalletDto } from '../dto';

@Controller('admin/wallets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 requests per minute for admin endpoints
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
    @Query('search') search?: string,
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
      search,
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
   * POST /admin/wallets/:userId/lock
   * Lock a wallet
   */
  @Throttle({ default: { limit: 20, ttl: 3600000 } }) // 20 wallet locks per hour
  @Post(':userId/lock')
  async lockWallet(
    @Request() req,
    @Param('userId') userId: string,
    @Body('reason') reason: string,
  ) {
    return this.adminWalletsService.lockWallet(req.user.id, userId, reason);
  }

  /**
   * POST /admin/wallets/:userId/unlock
   * Unlock a wallet
   */
  @Throttle({ default: { limit: 20, ttl: 3600000 } }) // 20 wallet unlocks per hour
  @Post(':userId/unlock')
  async unlockWallet(
    @Request() req,
    @Param('userId') userId: string,
    @Body('reason') reason: string,
  ) {
    return this.adminWalletsService.unlockWallet(req.user.id, userId, reason);
  }

  /**
   * POST /admin/wallets/:userId/adjust
   * Adjust wallet balance
   */
  @Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 balance adjustments per hour
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
