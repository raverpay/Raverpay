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
import { AdminGiftCardsService } from './admin-giftcards.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { UserRole, GiftCardType, TransactionStatus } from '@prisma/client';
import { ApproveGiftCardDto, RejectGiftCardDto, AdjustGiftCardAmountDto } from '../dto';

@Controller('admin/giftcards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminGiftCardsController {
  constructor(private readonly giftCardsService: AdminGiftCardsService) {}

  /**
   * GET /admin/giftcards/orders
   * Get gift card orders with filters
   */
  @Get('orders')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: GiftCardType,
    @Query('status') status?: TransactionStatus,
    @Query('userId') userId?: string,
    @Query('brand') brand?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.giftCardsService.getGiftCardOrders(
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
      type,
      status,
      userId,
      brand,
      startDate,
      endDate,
    );
  }

  /**
   * GET /admin/giftcards/pending-review
   * Get pending review orders (sell orders)
   */
  @Get('pending-review')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getPendingReview() {
    return this.giftCardsService.getPendingReview();
  }

  /**
   * GET /admin/giftcards/stats
   * Get gift card statistics
   */
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.giftCardsService.getStats(startDate, endDate);
  }

  /**
   * GET /admin/giftcards/:orderId
   * Get single gift card order details
   */
  @Get(':orderId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getOrderById(@Param('orderId') orderId: string) {
    return this.giftCardsService.getOrderById(orderId);
  }

  /**
   * POST /admin/giftcards/:orderId/approve
   * Approve gift card sell order
   */
  @Post(':orderId/approve')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async approveOrder(
    @GetUser('id') adminUserId: string,
    @Param('orderId') orderId: string,
    @Body() dto: ApproveGiftCardDto,
  ) {
    return this.giftCardsService.approveOrder(adminUserId, orderId, dto);
  }

  /**
   * POST /admin/giftcards/:orderId/reject
   * Reject gift card sell order
   */
  @Post(':orderId/reject')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async rejectOrder(
    @GetUser('id') adminUserId: string,
    @Param('orderId') orderId: string,
    @Body() dto: RejectGiftCardDto,
  ) {
    return this.giftCardsService.rejectOrder(adminUserId, orderId, dto);
  }

  /**
   * PATCH /admin/giftcards/:orderId/adjust-amount
   * Adjust gift card payout amount
   */
  @Patch(':orderId/adjust-amount')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async adjustAmount(
    @GetUser('id') adminUserId: string,
    @Param('orderId') orderId: string,
    @Body() dto: AdjustGiftCardAmountDto,
  ) {
    return this.giftCardsService.adjustAmount(adminUserId, orderId, dto);
  }
}
