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
import { RequestVirtualAccountDto } from './dto';

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
   * Body:
   * {
   *   "preferred_bank": "wema-bank",
   *   "bvn": "22222222222",
   *   "date_of_birth": "1990-01-01",
   *   "first_name": "John",
   *   "last_name": "Doe",
   *   "phone": "08012345678",
   *   "account_number": "0123456789",
   *   "bank_code": "011"
   * }
   */
  @Post('request')
  async requestVirtualAccount(
    @Request() req,
    @Body() dto: RequestVirtualAccountDto,
  ) {
    return this.virtualAccountsService.requestVirtualAccount(req.user.id, dto);
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
