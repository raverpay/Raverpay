import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { AdminNotificationsService } from './admin-notifications.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { UserRole, NotificationType } from '@prisma/client';
import { CreateBroadcastDto, UpdateNotificationDto } from '../dto';
import { BirthdaySchedulerService } from '../../notifications/birthday-scheduler.service';
import { NotificationQueueProcessor } from '../../notifications/notification-queue.processor';

@ApiTags('Admin - Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminNotificationsController {
  constructor(
    private readonly notificationsService: AdminNotificationsService,
    private readonly birthdaySchedulerService: BirthdaySchedulerService,
    private readonly queueProcessor: NotificationQueueProcessor,
  ) {}

  @ApiOperation({ summary: 'Get notifications with filters' })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: NotificationType })
  @ApiQuery({ name: 'isRead', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getNotifications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: NotificationType,
    @Query('isRead') isRead?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.notificationsService.getNotifications(
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
      type,
      isRead ? isRead === 'true' : undefined,
      userId,
      startDate,
      endDate,
    );
  }

  @ApiOperation({ summary: 'Get notification statistics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.notificationsService.getStats(startDate, endDate);
  }

  @ApiOperation({ summary: 'Get user notifications' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Get('user/:userId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getUserNotifications(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.getUserNotifications(
      userId,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
    );
  }

  @ApiOperation({ summary: 'Get single notification details' })
  @ApiParam({ name: 'notificationId', description: 'Notification ID' })
  @Get(':notificationId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getNotificationById(@Param('notificationId') notificationId: string) {
    return this.notificationsService.getNotificationById(notificationId);
  }

  @ApiOperation({ summary: 'Create broadcast notification' })
  @Post('broadcast')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async createBroadcast(
    @GetUser('id') adminUserId: string,
    @Body() dto: CreateBroadcastDto,
  ) {
    return this.notificationsService.createBroadcast(adminUserId, dto);
  }

  @ApiOperation({ summary: 'Send notification to specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Post('user/:userId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async sendToUser(
    @GetUser('id') adminUserId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateNotificationDto,
  ) {
    return this.notificationsService.sendToUser(adminUserId, userId, dto);
  }

  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'notificationId', description: 'Notification ID' })
  @Patch(':notificationId/read')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async markAsRead(@Param('notificationId') notificationId: string) {
    return this.notificationsService.markAsRead(notificationId);
  }

  @ApiOperation({ summary: 'Delete notification' })
  @ApiParam({ name: 'notificationId', description: 'Notification ID' })
  @Delete(':notificationId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async deleteNotification(
    @GetUser('id') adminUserId: string,
    @Param('notificationId') notificationId: string,
  ) {
    return this.notificationsService.deleteNotification(
      adminUserId,
      notificationId,
    );
  }

  @ApiOperation({ summary: 'Bulk delete notifications' })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: NotificationType })
  @ApiQuery({ name: 'isRead', required: false, type: String })
  @ApiQuery({ name: 'beforeDate', required: false, type: String })
  @Post('bulk-delete')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async bulkDelete(
    @GetUser('id') adminUserId: string,
    @Query('userId') userId?: string,
    @Query('type') type?: NotificationType,
    @Query('isRead') isRead?: string,
    @Query('beforeDate') beforeDate?: string,
  ) {
    return this.notificationsService.bulkDelete(
      adminUserId,
      userId,
      type,
      isRead ? isRead === 'true' : undefined,
      beforeDate,
    );
  }

  @ApiOperation({ summary: 'Test birthday notification for a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Post('birthday-test/:userId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async testBirthdayNotification(@Param('userId') userId: string) {
    return this.birthdaySchedulerService.sendBirthdayNotificationToUser(userId);
  }

  @ApiOperation({ summary: 'Get notification queue statistics' })
  @Get('queue/stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getQueueStats() {
    return this.queueProcessor.getQueueStats();
  }
}
