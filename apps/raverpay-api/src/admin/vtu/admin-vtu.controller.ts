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
import { UserRole, VTUServiceType, TransactionStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminVTUService } from './admin-vtu.service';
import { RefundVTUDto } from '../dto';

@Controller('admin/vtu')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
export class AdminVTUController {
  constructor(private readonly adminVTUService: AdminVTUService) {}

  /**
   * GET /admin/vtu/orders
   * Get VTU orders with filters
   */
  @Get('orders')
  async getVTUOrders(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('serviceType') serviceType?: VTUServiceType,
    @Query('status') status?: TransactionStatus,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminVTUService.getVTUOrders(
      page,
      limit,
      serviceType,
      status,
      userId,
      startDate,
      endDate,
    );
  }

  /**
   * GET /admin/vtu/balance
   * Get VTPass wallet balance
   */
  @Get('balance')
  async getVTPassBalance() {
    return this.adminVTUService.getVTPassBalance();
  }

  /**
   * GET /admin/vtu/stats
   * Get VTU statistics
   */
  @Get('stats')
  async getVTUStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminVTUService.getVTUStats(startDate, endDate);
  }

  /**
   * GET /admin/vtu/failed
   * Get failed VTU orders
   */
  @Get('failed')
  async getFailedOrders(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminVTUService.getFailedOrders(page, limit);
  }

  /**
   * GET /admin/vtu/orders/:orderId
   * Get single VTU order
   */
  @Get('orders/:orderId')
  async getOrderById(@Param('orderId') orderId: string) {
    return this.adminVTUService.getOrderById(orderId);
  }

  /**
   * POST /admin/vtu/orders/:orderId/refund
   * Refund VTU order
   */
  @Post('orders/:orderId/refund')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN) // Support cannot refund
  async refundOrder(
    @Request() req,
    @Param('orderId') orderId: string,
    @Body() dto: RefundVTUDto,
  ) {
    return this.adminVTUService.refundOrder(req.user.id, orderId, dto);
  }

  /**
   * POST /admin/vtu/orders/:orderId/retry
   * Retry failed VTU order
   */
  @Post('orders/:orderId/retry')
  async retryOrder(@Request() req, @Param('orderId') orderId: string) {
    return this.adminVTUService.retryOrder(req.user.id, orderId);
  }

  /**
   * POST /admin/vtu/orders/:orderId/mark-completed
   * Mark order as completed (manual)
   */
  @Post('orders/:orderId/mark-completed')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async markCompleted(
    @Request() req,
    @Param('orderId') orderId: string,
    @Body('notes') notes?: string,
  ) {
    return this.adminVTUService.markCompleted(req.user.id, orderId, notes);
  }
}
