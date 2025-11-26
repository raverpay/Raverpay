import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { TransactionsService } from './transactions.service';
import { FundWalletDto, WithdrawFundsDto, ResolveAccountDto } from './dto';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * Initialize card payment
   * POST /api/transactions/fund/card
   */
  @Post('fund/card')
  @UseGuards(JwtAuthGuard)
  async fundViaCard(@GetUser('id') userId: string, @Body() dto: FundWalletDto) {
    return this.transactionsService.initializeCardPayment(
      userId,
      dto.amount,
      dto.callbackUrl,
    );
  }

  /**
   * Verify payment
   * GET /api/transactions/verify/:reference
   */
  @Get('verify/:reference')
  @UseGuards(JwtAuthGuard)
  async verifyPayment(
    @GetUser('id') userId: string,
    @Param('reference') reference: string,
  ) {
    return this.transactionsService.verifyPayment(userId, reference);
  }

  /**
   * Get virtual account
   * GET /api/transactions/virtual-account
   */
  @Get('virtual-account')
  @UseGuards(JwtAuthGuard)
  async getVirtualAccount(@GetUser('id') userId: string) {
    return this.transactionsService.getVirtualAccount(userId);
  }

  /**
   * Get list of banks
   * GET /api/transactions/banks
   */
  @Get('banks')
  @UseGuards(JwtAuthGuard)
  async getBanks() {
    return this.transactionsService.getBanks();
  }

  /**
   * Resolve account number
   * POST /api/transactions/resolve-account
   */
  @Post('resolve-account')
  @UseGuards(JwtAuthGuard)
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
  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  async withdraw(@GetUser('id') userId: string, @Body() dto: WithdrawFundsDto) {
    return this.transactionsService.withdrawFunds(
      userId,
      dto.amount,
      dto.accountNumber,
      dto.accountName,
      dto.bankCode,
      dto.pin,
      dto.narration,
    );
  }

  /**
   * Get withdrawal configuration for user
   * GET /api/transactions/withdrawal-config
   */
  @Get('withdrawal-config')
  @UseGuards(JwtAuthGuard)
  async getWithdrawalConfig(@GetUser('id') userId: string) {
    return this.transactionsService.getWithdrawalConfigForUser(userId);
  }

  /**
   * Preview withdrawal fee
   * POST /api/transactions/withdrawal-preview
   */
  @Post('withdrawal-preview')
  @UseGuards(JwtAuthGuard)
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
  async getSavedBankAccounts(@GetUser('id') userId: string) {
    return this.transactionsService.getSavedBankAccounts(userId);
  }
}
