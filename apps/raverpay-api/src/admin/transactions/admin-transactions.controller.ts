import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminTransactionsService } from './admin-transactions.service';
import { QueryTransactionsDto, ReverseTransactionDto } from '../dto';
import {
  CreateWithdrawalConfigDto,
  UpdateWithdrawalConfigDto,
} from '../../transactions/dto';

@ApiTags('Admin - Transactions')
@ApiBearerAuth('JWT-auth')
@Controller('admin/transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminTransactionsController {
  constructor(
    private readonly adminTransactionsService: AdminTransactionsService,
  ) {}

  @ApiOperation({ summary: 'Get paginated list of transactions with filters' })
  @Get()
  async getTransactions(@Query() query: QueryTransactionsDto) {
    return this.adminTransactionsService.getTransactions(query);
  }

  @ApiOperation({ summary: 'Get transaction statistics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
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

  @ApiOperation({ summary: 'Get pending transactions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get('pending')
  async getPendingTransactions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminTransactionsService.getPendingTransactions(page, limit);
  }

  @ApiOperation({ summary: 'Get failed transactions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
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

  @ApiOperation({ summary: 'Get transaction by reference' })
  @ApiParam({ name: 'reference', description: 'Transaction Reference' })
  @Get('reference/:reference')
  async getTransactionByReference(@Param('reference') reference: string) {
    return this.adminTransactionsService.getTransactionByReference(reference);
  }

  @ApiOperation({ summary: 'Get all withdrawal configurations' })
  @Get('withdrawal-configs')
  async getAllWithdrawalConfigs() {
    return this.adminTransactionsService.getAllWithdrawalConfigs();
  }

  @ApiOperation({ summary: 'Get withdrawal configuration by ID' })
  @ApiParam({ name: 'id', description: 'Config ID' })
  @Get('withdrawal-configs/:id')
  async getWithdrawalConfigById(@Param('id') id: string) {
    return this.adminTransactionsService.getWithdrawalConfigById(id);
  }

  @ApiOperation({ summary: 'Create withdrawal configuration' })
  @Post('withdrawal-configs')
  async createWithdrawalConfig(@Body() dto: CreateWithdrawalConfigDto) {
    return this.adminTransactionsService.createWithdrawalConfig(dto);
  }

  @ApiOperation({ summary: 'Update withdrawal configuration' })
  @ApiParam({ name: 'id', description: 'Config ID' })
  @Put('withdrawal-configs/:id')
  async updateWithdrawalConfig(
    @Param('id') id: string,
    @Body() dto: UpdateWithdrawalConfigDto,
  ) {
    return this.adminTransactionsService.updateWithdrawalConfig(id, dto);
  }

  @ApiOperation({ summary: 'Delete withdrawal configuration' })
  @ApiParam({ name: 'id', description: 'Config ID' })
  @Delete('withdrawal-configs/:id')
  async deleteWithdrawalConfig(@Param('id') id: string) {
    return this.adminTransactionsService.deleteWithdrawalConfig(id);
  }

  @ApiOperation({ summary: 'Get single transaction details' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @Get(':transactionId')
  async getTransactionById(@Param('transactionId') transactionId: string) {
    return this.adminTransactionsService.getTransactionById(transactionId);
  }

  @ApiOperation({ summary: 'Reverse a transaction' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
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
