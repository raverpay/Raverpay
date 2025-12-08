import { Controller, Get, UseGuards } from '@nestjs/common';
import { LimitsService } from './limits.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('limits')
@UseGuards(JwtAuthGuard)
export class LimitsController {
  constructor(private readonly limitsService: LimitsService) {}

  /**
   * Get daily spending summary for current user
   * GET /api/limits/daily-spending
   */
  @Get('daily-spending')
  async getDailySpending(@GetUser('id') userId: string) {
    const spending = await this.limitsService.getDailySpending(userId);
    return {
      success: true,
      data: spending,
    };
  }

  /**
   * Get remaining daily limit for current user
   * GET /api/limits/remaining
   */
  @Get('remaining')
  async getRemainingLimit(@GetUser('id') userId: string) {
    const remaining = await this.limitsService.getRemainingLimit(userId);
    return {
      success: true,
      remaining,
    };
  }

  /**
   * Get all tier limits information
   * GET /api/limits/tiers
   */
  @Get('tiers')
  getTierLimits() {
    const tiers = this.limitsService.getTierLimits();
    return {
      success: true,
      tiers,
    };
  }
}
