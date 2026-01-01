import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { AdminCryptoService } from './admin-crypto.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { UserRole, CryptoOrderType, TransactionStatus } from '@prisma/client';
import {
  ApproveCryptoDto,
  RejectCryptoDto,
  AdjustCryptoAmountDto,
} from '../dto';

@ApiTags('Admin - Crypto')
@ApiBearerAuth('JWT-auth')
@Controller('admin/crypto')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminCryptoController {
  constructor(private readonly cryptoService: AdminCryptoService) {}

  @ApiOperation({ summary: 'Get crypto orders with filters' })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: CryptoOrderType })
  @ApiQuery({ name: 'status', required: false, enum: TransactionStatus })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'asset', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @Get('orders')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: CryptoOrderType,
    @Query('status') status?: TransactionStatus,
    @Query('userId') userId?: string,
    @Query('asset') asset?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.cryptoService.getCryptoOrders(
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
      type,
      status,
      userId,
      asset,
      startDate,
      endDate,
    );
  }

  @ApiOperation({ summary: 'Get pending review orders (sell orders)' })
  @Get('pending-review')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getPendingReview() {
    return this.cryptoService.getPendingReview();
  }

  @ApiOperation({ summary: 'Get crypto statistics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.cryptoService.getStats(startDate, endDate);
  }

  @ApiOperation({ summary: 'Get single crypto order details' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @Get(':orderId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getOrderById(@Param('orderId') orderId: string) {
    return this.cryptoService.getOrderById(orderId);
  }

  @ApiOperation({ summary: 'Approve crypto sell order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @Post(':orderId/approve')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async approveOrder(
    @GetUser('id') adminUserId: string,
    @Param('orderId') orderId: string,
    @Body() dto: ApproveCryptoDto,
  ) {
    return this.cryptoService.approveOrder(adminUserId, orderId, dto);
  }

  @ApiOperation({ summary: 'Reject crypto sell order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @Post(':orderId/reject')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async rejectOrder(
    @GetUser('id') adminUserId: string,
    @Param('orderId') orderId: string,
    @Body() dto: RejectCryptoDto,
  ) {
    return this.cryptoService.rejectOrder(adminUserId, orderId, dto);
  }

  @ApiOperation({ summary: 'Adjust crypto payout amount' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @Patch(':orderId/adjust-amount')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async adjustAmount(
    @GetUser('id') adminUserId: string,
    @Param('orderId') orderId: string,
    @Body() dto: AdjustCryptoAmountDto,
  ) {
    return this.cryptoService.adjustAmount(adminUserId, orderId, dto);
  }
}
