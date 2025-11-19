import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminTransactionsService } from './admin-transactions.service';
import { QueryTransactionsDto, ReverseTransactionDto } from '../dto';

@Controller('admin/transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminTransactionsController {
  constructor(
    private readonly adminTransactionsService: AdminTransactionsService,
  ) {}

  /**
   * GET /admin/transactions
   * Get paginated list of transactions with filters
   */
  @Get()
  async getTransactions(@Query() query: QueryTransactionsDto) {
    return this.adminTransactionsService.getTransactions(query);
  }

  /**
   * GET /admin/transactions/stats
   * Get transaction statistics
   */
  @Get('stats')
  async getTransactionStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminTransactionsService.getTransactionStats(
      startDate,
      endDate,
    );
  }

  /**
   * GET /admin/transactions/pending
   * Get pending transactions
   */
  @Get('pending')
  async getPendingTransactions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminTransactionsService.getPendingTransactions(page, limit);
  }

  /**
   * GET /admin/transactions/failed
   * Get failed transactions
   */
  @Get('failed')
  async getFailedTransactions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminTransactionsService.getFailedTransactions(
      page,
      limit,
      startDate,
      endDate,
    );
  }

  /**
   * GET /admin/transactions/reference/:reference
   * Get transaction by reference
   */
  @Get('reference/:reference')
  async getTransactionByReference(@Param('reference') reference: string) {
    return this.adminTransactionsService.getTransactionByReference(reference);
  }

  /**
   * GET /admin/transactions/:transactionId
   * Get single transaction details
   */
  @Get(':transactionId')
  async getTransactionById(@Param('transactionId') transactionId: string) {
    return this.adminTransactionsService.getTransactionById(transactionId);
  }

  /**
   * POST /admin/transactions/:transactionId/reverse
   * Reverse a transaction
   */
  @Post(':transactionId/reverse')
  async reverseTransaction(
    @Request() req,
    @Param('transactionId') transactionId: string,
    @Body() dto: ReverseTransactionDto,
  ) {
    return this.adminTransactionsService.reverseTransaction(
      req.user.id,
      transactionId,
      dto,
    );
  }
}
