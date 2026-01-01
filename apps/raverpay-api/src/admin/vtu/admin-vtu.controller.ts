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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { UserRole, VTUServiceType, TransactionStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminVTUService } from './admin-vtu.service';
import { RefundVTUDto } from '../dto';

@ApiTags('Admin - VTU')
@ApiBearerAuth('JWT-auth')
@Controller('admin/vtu')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
export class AdminVTUController {
  constructor(private readonly adminVTUService: AdminVTUService) {}

  @ApiOperation({ summary: 'Get VTU orders with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'serviceType', required: false, enum: VTUServiceType })
  @ApiQuery({ name: 'status', required: false, enum: TransactionStatus })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
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

  @ApiOperation({ summary: 'Get VTPass wallet balance' })
  @Get('balance')
  async getVTPassBalance() {
    return this.adminVTUService.getVTPassBalance();
  }

  @ApiOperation({ summary: 'Get VTU statistics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @Get('stats')
  async getVTUStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminVTUService.getVTUStats(startDate, endDate);
  }

  @ApiOperation({ summary: 'Get failed VTU orders' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get('failed')
  async getFailedOrders(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminVTUService.getFailedOrders(page, limit);
  }

  @ApiOperation({ summary: 'Get single VTU order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @Get('orders/:orderId')
  async getOrderById(@Param('orderId') orderId: string) {
    return this.adminVTUService.getOrderById(orderId);
  }

  @ApiOperation({ summary: 'Refund VTU order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @Post('orders/:orderId/refund')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN) // Support cannot refund
  async refundOrder(
    @Request() req,
    @Param('orderId') orderId: string,
    @Body() dto: RefundVTUDto,
  ) {
    return this.adminVTUService.refundOrder(req.user.id, orderId, dto);
  }

  @ApiOperation({ summary: 'Retry failed VTU order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @Post('orders/:orderId/retry')
  async retryOrder(@Request() req, @Param('orderId') orderId: string) {
    return this.adminVTUService.retryOrder(req.user.id, orderId);
  }

  @ApiOperation({ summary: 'Mark order as completed (manual)' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiBody({
    schema: { type: 'object', properties: { notes: { type: 'string' } } },
  })
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
