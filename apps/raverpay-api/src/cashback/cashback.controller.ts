import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
  Delete,
} from '@nestjs/common';
import { CashbackService } from './cashback.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { CalculateCashbackDto } from './dto/calculate-cashback.dto';
import { CreateCashbackConfigDto } from './dto/create-cashback-config.dto';
import { UpdateCashbackConfigDto } from './dto/update-cashback-config.dto';

@Controller('cashback')
@UseGuards(JwtAuthGuard)
export class CashbackController {
  constructor(private readonly cashbackService: CashbackService) {}

  // ==================== Public User Endpoints ====================

  /**
   * Get user's cashback wallet balance
   */
  @Get('wallet')
  async getCashbackWallet(@GetUser('id') userId: string) {
    return this.cashbackService.getCashbackBalance(userId);
  }

  /**
   * Get user's cashback transaction history
   */
  @Get('history')
  async getCashbackHistory(
    @GetUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
  ) {
    return this.cashbackService.getCashbackHistory(
      userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      type as any,
    );
  }

  /**
   * Get active cashback configurations (for displaying on mobile app)
   */
  @Get('config')
  async getActiveConfigs() {
    return this.cashbackService.getActiveConfigs();
  }

  /**
   * Calculate cashback for a potential purchase
   */
  @Post('calculate')
  async calculateCashback(@Body() dto: CalculateCashbackDto) {
    return this.cashbackService.calculateCashback(
      dto.serviceType,
      dto.provider || '',
      dto.amount,
    );
  }

  // ==================== Admin Endpoints ====================

  /**
   * Get all cashback configurations (admin only)
   */
  @Get('admin/config')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getAllConfigs() {
    return this.cashbackService.getAllConfigs();
  }

  /**
   * Create a new cashback configuration (admin only)
   */
  @Post('admin/config')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async createConfig(@Body() dto: CreateCashbackConfigDto) {
    return this.cashbackService.createConfig(dto);
  }

  /**
   * Update a cashback configuration (admin only)
   */
  @Patch('admin/config/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateConfig(
    @Param('id') id: string,
    @Body() dto: UpdateCashbackConfigDto,
  ) {
    return this.cashbackService.updateConfig(id, dto);
  }

  /**
   * Delete (deactivate) a cashback configuration (admin only)
   */
  @Delete('admin/config/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async deleteConfig(@Param('id') id: string) {
    return this.cashbackService.deleteConfig(id);
  }

  /**
   * Get cashback analytics (admin only)
   */
  @Get('admin/analytics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getAnalytics() {
    return this.cashbackService.getAnalytics();
  }
}
