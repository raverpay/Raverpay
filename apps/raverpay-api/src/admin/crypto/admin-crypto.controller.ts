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

@Controller('admin/crypto')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminCryptoController {
  constructor(private readonly cryptoService: AdminCryptoService) {}

  /**
   * GET /admin/crypto/orders
   * Get crypto orders with filters
   */
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

  /**
   * GET /admin/crypto/pending-review
   * Get pending review orders (sell orders)
   */
  @Get('pending-review')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getPendingReview() {
    return this.cryptoService.getPendingReview();
  }

  /**
   * GET /admin/crypto/stats
   * Get crypto statistics
   */
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.cryptoService.getStats(startDate, endDate);
  }

  /**
   * GET /admin/crypto/:orderId
   * Get single crypto order details
   */
  @Get(':orderId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getOrderById(@Param('orderId') orderId: string) {
    return this.cryptoService.getOrderById(orderId);
  }

  /**
   * POST /admin/crypto/:orderId/approve
   * Approve crypto sell order
   */
  @Post(':orderId/approve')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async approveOrder(
    @GetUser('id') adminUserId: string,
    @Param('orderId') orderId: string,
    @Body() dto: ApproveCryptoDto,
  ) {
    return this.cryptoService.approveOrder(adminUserId, orderId, dto);
  }

  /**
   * POST /admin/crypto/:orderId/reject
   * Reject crypto sell order
   */
  @Post(':orderId/reject')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async rejectOrder(
    @GetUser('id') adminUserId: string,
    @Param('orderId') orderId: string,
    @Body() dto: RejectCryptoDto,
  ) {
    return this.cryptoService.rejectOrder(adminUserId, orderId, dto);
  }

  /**
   * PATCH /admin/crypto/:orderId/adjust-amount
   * Adjust crypto payout amount
   */
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
