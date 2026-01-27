import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminAlchemyService } from './admin-alchemy.service';
import {
  QueryAlchemyWalletsDto,
  QueryAlchemyTransactionsDto,
  QueryGasSpendingDto,
} from './admin-alchemy.dto';

@ApiTags('Admin - Alchemy')
@ApiBearerAuth('JWT-auth')
@Controller('admin/alchemy')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminAlchemyController {
  constructor(private readonly adminAlchemyService: AdminAlchemyService) {}

  @ApiOperation({ summary: 'Get Alchemy statistics' })
  @Get('stats')
  async getStats() {
    const stats = await this.adminAlchemyService.getStats();
    return {
      success: true,
      data: stats,
    };
  }

  @ApiOperation({ summary: 'Get paginated wallets with filters' })
  @Get('wallets')
  async getWallets(@Query() query: QueryAlchemyWalletsDto) {
    return this.adminAlchemyService.getWallets(query);
  }

  @ApiOperation({ summary: 'Get wallet by ID' })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  @Get('wallets/:id')
  async getWalletById(@Param('id') id: string) {
    const wallet = await this.adminAlchemyService.getWalletById(id);
    return {
      success: true,
      data: wallet,
    };
  }

  @ApiOperation({ summary: 'Get wallets by user ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Get('wallets/user/:userId')
  async getWalletsByUser(@Param('userId') userId: string) {
    const wallets = await this.adminAlchemyService.getWalletsByUser(userId);
    return {
      success: true,
      data: wallets,
    };
  }

  @ApiOperation({ summary: 'Get paginated transactions with filters' })
  @Get('transactions')
  async getTransactions(@Query() query: QueryAlchemyTransactionsDto) {
    return this.adminAlchemyService.getTransactions(query);
  }

  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @Get('transactions/:id')
  async getTransactionById(@Param('id') id: string) {
    const transaction = await this.adminAlchemyService.getTransactionById(id);
    return {
      success: true,
      data: transaction,
    };
  }

  @ApiOperation({ summary: 'Get gas spending analytics with date range' })
  @Get('gas-spending')
  async getGasSpending(@Query() query: QueryGasSpendingDto) {
    return this.adminAlchemyService.getGasSpending(query);
  }

  @ApiOperation({ summary: 'Get gas spending by user ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Get('gas-spending/user/:userId')
  async getGasSpendingByUser(@Param('userId') userId: string) {
    const gasSpending =
      await this.adminAlchemyService.getGasSpendingByUser(userId);
    return {
      success: true,
      data: gasSpending,
    };
  }
}
