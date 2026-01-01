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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { AdminWalletsService } from './admin-wallets.service';
import { AdjustWalletDto } from '../dto';

@ApiTags('Admin - Wallets')
@ApiBearerAuth('JWT-auth')
@Controller('admin/wallets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 requests per minute for admin endpoints
export class AdminWalletsController {
  constructor(private readonly adminWalletsService: AdminWalletsService) {}

  @ApiOperation({ summary: 'Get wallets with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'minBalance', required: false, type: Number })
  @ApiQuery({ name: 'maxBalance', required: false, type: Number })
  @ApiQuery({ name: 'isLocked', required: false, type: Boolean })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
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

  @ApiOperation({ summary: 'Get wallet statistics' })
  @Get('stats')
  async getWalletStats() {
    return this.adminWalletsService.getWalletStats();
  }

  @ApiOperation({ summary: 'Get wallet by user ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Get(':userId')
  async getWalletByUserId(@Param('userId') userId: string) {
    return this.adminWalletsService.getWalletByUserId(userId);
  }

  @ApiOperation({ summary: 'Lock a wallet' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({
    schema: { type: 'object', properties: { reason: { type: 'string' } } },
  })
  @Throttle({ default: { limit: 20, ttl: 3600000 } }) // 20 wallet locks per hour
  @Post(':userId/lock')
  async lockWallet(
    @Request() req,
    @Param('userId') userId: string,
    @Body('reason') reason: string,
  ) {
    return this.adminWalletsService.lockWallet(req.user.id, userId, reason);
  }

  @ApiOperation({ summary: 'Unlock a wallet' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({
    schema: { type: 'object', properties: { reason: { type: 'string' } } },
  })
  @Throttle({ default: { limit: 20, ttl: 3600000 } }) // 20 wallet unlocks per hour
  @Post(':userId/unlock')
  async unlockWallet(
    @Request() req,
    @Param('userId') userId: string,
    @Body('reason') reason: string,
  ) {
    return this.adminWalletsService.unlockWallet(req.user.id, userId, reason);
  }

  @ApiOperation({ summary: 'Adjust wallet balance' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 balance adjustments per hour
  @Post(':userId/adjust')
  @Idempotent()
  async adjustBalance(
    @Request() req,
    @Param('userId') userId: string,
    @Body() dto: AdjustWalletDto,
  ) {
    return this.adminWalletsService.adjustBalance(req.user.id, userId, dto);
  }

  @ApiOperation({ summary: 'Reset spending limits' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Post(':userId/reset-limits')
  async resetLimits(@Request() req, @Param('userId') userId: string) {
    return this.adminWalletsService.resetLimits(req.user.id, userId);
  }
}
