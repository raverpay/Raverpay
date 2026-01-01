import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Idempotent } from '../common/decorators/idempotent.decorator';
import { GetClientMetadata } from '../common/decorators/get-client-metadata.decorator';
import type { ClientMetadata } from './transactions.types';
import { TransactionsService } from './transactions.service';
import {
  FundWalletDto,
  WithdrawFundsDto,
  ResolveAccountDto,
  SendToUserDto,
  SetTagDto,
} from './dto';

@Controller('transactions')
@ApiTags('Transactions')
@ApiBearerAuth('JWT-auth')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * Initialize card payment
   * POST /api/transactions/fund/card
   */
  @Throttle({
    default: { limit: 10, ttl: 3600000 }, // 10 card funding attempts per hour per user
    burst: { limit: 1, ttl: 5000 }, // NEW: Burst limit 1 per 5s
  })
  @Post('fund/card')
  @UseGuards(JwtAuthGuard)
  @Idempotent()
  @ApiOperation({
    summary: 'Fund wallet via card',
    description: 'Initialize card payment to fund wallet via Paystack',
  })
  @ApiResponse({ status: 200, description: 'Payment initialized successfully' })
  @ApiResponse({ status: 400, description: 'Invalid amount' })
  @ApiResponse({ status: 429, description: 'Too many funding attempts' })
  async fundViaCard(
    @GetUser('id') userId: string,
    @Body() dto: FundWalletDto,
    @GetClientMetadata() clientMetadata: ClientMetadata,
  ) {
    return this.transactionsService.initializeCardPayment(
      userId,
      dto.amount,
      dto.callbackUrl,
      clientMetadata,
    );
  }

  /**
   * Verify payment
   * GET /api/transactions/verify/:reference
   */
  @Get('verify/:reference')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Verify payment',
    description: 'Verify payment status using transaction reference',
  })
  @ApiParam({ name: 'reference', description: 'Transaction reference' })
  @ApiResponse({ status: 200, description: 'Payment verified' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async verifyPayment(
    @GetUser('id') userId: string,
    @Param('reference') reference: string,
  ) {
    return this.transactionsService.verifyPayment(userId, reference);
  }

  /**
   * Cancel pending transaction
   * POST /api/transactions/cancel/:reference
   */
  @Post('cancel/:reference')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Cancel transaction',
    description: 'Cancel a pending transaction',
  })
  @ApiParam({ name: 'reference', description: 'Transaction reference' })
  @ApiResponse({ status: 200, description: 'Transaction cancelled' })
  @ApiResponse({ status: 400, description: 'Transaction cannot be cancelled' })
  async cancelTransaction(
    @GetUser('id') userId: string,
    @Param('reference') reference: string,
  ) {
    return this.transactionsService.cancelPendingTransaction(userId, reference);
  }

  /**
   * Get virtual account
   * GET /api/transactions/virtual-account
   */
  @Get('virtual-account')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get virtual account',
    description: 'Get user virtual account for bank transfers',
  })
  @ApiResponse({ status: 200, description: 'Virtual account retrieved' })
  async getVirtualAccount(@GetUser('id') userId: string) {
    return this.transactionsService.getVirtualAccount(userId);
  }

  /**
   * Get list of banks
   * GET /api/transactions/banks
   */
  @Get('banks')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get banks list',
    description: 'Retrieve list of Nigerian banks for withdrawals',
  })
  @ApiResponse({ status: 200, description: 'Banks list retrieved' })
  async getBanks() {
    return this.transactionsService.getBanks();
  }

  /**
   * Resolve account number
   * POST /api/transactions/resolve-account
   */
  @Post('resolve-account')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Resolve account',
    description: 'Verify bank account number and get account name',
  })
  @ApiResponse({ status: 200, description: 'Account resolved successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid account number or bank code',
  })
  async resolveAccount(@Body() dto: ResolveAccountDto) {
    return this.transactionsService.resolveAccount(
      dto.accountNumber,
      dto.bankCode,
    );
  }

  /**
   * Withdraw funds
   * POST /api/transactions/withdraw
   */
  @Throttle({
    default: { limit: 5, ttl: 3600000 }, // 5 withdrawals per hour per user
    burst: { limit: 1, ttl: 5000 }, // NEW: Burst limit 1 per 5s
  })
  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  @Idempotent()
  @ApiOperation({
    summary: 'Withdraw funds',
    description: 'Withdraw funds to bank account (requires PIN)',
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal initiated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input, insufficient balance, or incorrect PIN',
  })
  @ApiResponse({ status: 429, description: 'Too many withdrawal attempts' })
  async withdraw(
    @GetUser('id') userId: string,
    @Body() dto: WithdrawFundsDto,
    @GetClientMetadata() clientMetadata: ClientMetadata,
  ) {
    return this.transactionsService.withdrawFunds(
      userId,
      dto.amount,
      dto.accountNumber,
      dto.accountName,
      dto.bankCode,
      dto.pin,
      dto.narration,
      clientMetadata,
    );
  }

  /**
   * Get withdrawal configuration for user
   * GET /api/transactions/withdrawal-config
   */
  @Get('withdrawal-config')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get withdrawal config',
    description: 'Get withdrawal fees and limits configuration',
  })
  @ApiResponse({ status: 200, description: 'Configuration retrieved' })
  async getWithdrawalConfig(@GetUser('id') userId: string) {
    return this.transactionsService.getWithdrawalConfigForUser(userId);
  }

  /**
   * Preview withdrawal fee
   * POST /api/transactions/withdrawal-preview
   */
  @Post('withdrawal-preview')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Preview withdrawal fee',
    description: 'Calculate withdrawal fee for given amount',
  })
  @ApiResponse({ status: 200, description: 'Fee calculated' })
  async previewWithdrawalFee(
    @GetUser('id') userId: string,
    @Body() dto: { amount: number },
  ) {
    return this.transactionsService.previewWithdrawalFee(userId, dto.amount);
  }

  /**
   * Get saved bank accounts for user
   * GET /api/transactions/saved-bank-accounts
   */
  @Get('saved-bank-accounts')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get saved accounts',
    description: 'Retrieve user saved bank accounts',
  })
  @ApiResponse({ status: 200, description: 'Saved accounts retrieved' })
  async getSavedBankAccounts(@GetUser('id') userId: string) {
    return this.transactionsService.getSavedBankAccounts(userId);
  }

  // ============================================
  // P2P TRANSFER ENDPOINTS
  // ============================================

  /**
   * Send money to another user by tag
   * POST /api/transactions/send
   */
  @Throttle({
    default: { limit: 20, ttl: 3600000 }, // 20 P2P transfers per hour per user
    burst: { limit: 1, ttl: 5000 }, // NEW: Burst limit 1 per 5s
  })
  @Post('send')
  @UseGuards(JwtAuthGuard)
  @Idempotent()
  @ApiOperation({
    summary: 'Send to user',
    description: 'Send money to another RaverPay user by tag (requires PIN)',
  })
  @ApiResponse({ status: 200, description: 'Transfer successful' })
  @ApiResponse({
    status: 400,
    description: 'Invalid recipient, insufficient balance, or incorrect PIN',
  })
  @ApiResponse({ status: 404, description: 'Recipient not found' })
  @ApiResponse({ status: 429, description: 'Too many transfer attempts' })
  async sendToUser(
    @GetUser('id') userId: string,
    @Body() dto: SendToUserDto,
    @GetClientMetadata() clientMetadata: ClientMetadata,
  ) {
    return this.transactionsService.sendToUser(
      userId,
      dto.recipientTag,
      dto.amount,
      dto.message,
      clientMetadata,
    );
  }

  /**
   * Lookup user by tag (autocomplete)
   * GET /api/transactions/lookup/:tag
   */
  @Get('lookup/:tag')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Lookup user by tag',
    description: 'Search for user by tag for P2P transfer',
  })
  @ApiParam({ name: 'tag', description: 'User tag to search' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async lookupUserByTag(@Param('tag') tag: string) {
    return this.transactionsService.lookupUserByTag(tag);
  }

  /**
   * Set or update user's tag
   * POST /api/transactions/set-tag
   */
  @Post('set-tag')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Set user tag',
    description: 'Set or update user unique tag for P2P transfers',
  })
  @ApiResponse({ status: 200, description: 'Tag set successfully' })
  @ApiResponse({ status: 400, description: 'Tag already taken or invalid' })
  async setUserTag(@GetUser('id') userId: string, @Body() dto: SetTagDto) {
    return this.transactionsService.setUserTag(userId, dto.tag);
  }

  /**
   * Get P2P transfer history
   * GET /api/transactions/p2p-history
   */
  @Get('p2p-history')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get P2P history',
    description: 'Retrieve P2P transfer history with pagination',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiResponse({ status: 200, description: 'History retrieved' })
  async getP2PHistory(
    @GetUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.transactionsService.getP2PHistory(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
