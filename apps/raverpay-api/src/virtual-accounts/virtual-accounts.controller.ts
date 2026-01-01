import {
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VirtualAccountsService } from './virtual-accounts.service';
import { RequestVirtualAccountDto } from './dto';

/**
 * Virtual Accounts Controller
 *
 * Handles user-initiated virtual account creation and management
 * All endpoints require authentication
 */
@ApiTags('Virtual Accounts')
@ApiBearerAuth()
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request Virtual Account',
    description: 'Request a dedicated NUBAN account',
  })
  @ApiResponse({
    status: 200,
    description: 'Virtual account request initiated or retrieved',
  })
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get My Virtual Account',
    description: 'Get details of the assigned virtual account',
  })
  @ApiResponse({
    status: 200,
    description: 'Virtual account details retrieved',
  })
  async getMyVirtualAccount(@Request() req) {
    return this.virtualAccountsService.getVirtualAccount(req.user.id);
  }

  /**
   * Get available bank providers for DVA
   * GET /virtual-accounts/providers
   */
  @Get('providers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get Providers',
    description: 'Get available virtual account providers',
  })
  @ApiResponse({ status: 200, description: 'Providers retrieved' })
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Requery Account',
    description: 'Trigger manual requery for pending transactions',
  })
  @ApiResponse({ status: 200, description: 'Requery triggered' })
  async requeryAccount(@Request() req) {
    return this.virtualAccountsService.requeryVirtualAccount(req.user.id);
  }
}
