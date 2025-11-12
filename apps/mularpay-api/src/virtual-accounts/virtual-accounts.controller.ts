import {
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  Body,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VirtualAccountsService } from './virtual-accounts.service';

/**
 * Virtual Accounts Controller
 *
 * Handles user-initiated virtual account creation and management
 * All endpoints require authentication
 */
@Controller('virtual-accounts')
@UseGuards(JwtAuthGuard)
export class VirtualAccountsController {
  constructor(
    private readonly virtualAccountsService: VirtualAccountsService,
  ) {}

  /**
   * Request virtual account creation (user-initiated with consent)
   * POST /virtual-accounts/request
   *
   * Body (optional):
   * {
   *   "preferred_bank": "wema-bank"
   * }
   */
  @Post('request')
  async requestVirtualAccount(
    @Request() req,
    @Body('preferred_bank') preferredBank?: string,
  ) {
    return this.virtualAccountsService.requestVirtualAccount(
      req.user.id,
      preferredBank,
    );
  }

  /**
   * Get user's virtual account details
   * GET /virtual-accounts/me
   */
  @Get('me')
  async getMyVirtualAccount(@Request() req) {
    return this.virtualAccountsService.getVirtualAccount(req.user.id);
  }

  /**
   * Get available bank providers for DVA
   * GET /virtual-accounts/providers
   */
  @Get('providers')
  async getProviders() {
    return this.virtualAccountsService.getAvailableProviders();
  }

  /**
   * Requery virtual account for pending transactions
   * POST /virtual-accounts/requery
   *
   * Rate limit: Once every 10 minutes per account
   */
  @Post('requery')
  async requeryAccount(@Request() req) {
    return this.virtualAccountsService.requeryVirtualAccount(req.user.id);
  }
}
