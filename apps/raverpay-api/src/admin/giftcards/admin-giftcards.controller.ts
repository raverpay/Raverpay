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
import { AdminGiftCardsService } from './admin-giftcards.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { UserRole, GiftCardType, TransactionStatus } from '@prisma/client';
import {
  ApproveGiftCardDto,
  RejectGiftCardDto,
  AdjustGiftCardAmountDto,
} from '../dto';

@ApiTags('Admin - Giftcards')
@ApiBearerAuth('JWT-auth')
@Controller('admin/giftcards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminGiftCardsController {
  constructor(private readonly giftCardsService: AdminGiftCardsService) {}

  @ApiOperation({ summary: 'Get gift card orders with filters' })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: GiftCardType })
  @ApiQuery({ name: 'status', required: false, enum: TransactionStatus })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'brand', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
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

  @ApiOperation({ summary: 'Get pending review orders (sell orders)' })
  @Get('pending-review')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getPendingReview() {
    return this.giftCardsService.getPendingReview();
  }

  @ApiOperation({ summary: 'Get gift card statistics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.giftCardsService.getStats(startDate, endDate);
  }

  @ApiOperation({ summary: 'Get single gift card order details' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @Get(':orderId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getOrderById(@Param('orderId') orderId: string) {
    return this.giftCardsService.getOrderById(orderId);
  }

  @ApiOperation({ summary: 'Approve gift card sell order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @Post(':orderId/approve')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async approveOrder(
    @GetUser('id') adminUserId: string,
    @Param('orderId') orderId: string,
    @Body() dto: ApproveGiftCardDto,
  ) {
    return this.giftCardsService.approveOrder(adminUserId, orderId, dto);
  }

  @ApiOperation({ summary: 'Reject gift card sell order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @Post(':orderId/reject')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async rejectOrder(
    @GetUser('id') adminUserId: string,
    @Param('orderId') orderId: string,
    @Body() dto: RejectGiftCardDto,
  ) {
    return this.giftCardsService.rejectOrder(adminUserId, orderId, dto);
  }

  @ApiOperation({ summary: 'Adjust gift card payout amount' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
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
