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
import { AdminNotificationsService } from './admin-notifications.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { UserRole, NotificationType } from '@prisma/client';
import { CreateBroadcastDto, UpdateNotificationDto } from '../dto';
import { BirthdaySchedulerService } from '../../notifications/birthday-scheduler.service';
import { NotificationQueueProcessor } from '../../notifications/notification-queue.processor';

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminNotificationsController {
  constructor(
    private readonly notificationsService: AdminNotificationsService,
    private readonly birthdaySchedulerService: BirthdaySchedulerService,
    private readonly queueProcessor: NotificationQueueProcessor,
  ) {}

  /**
   * GET /admin/notifications
   * Get notifications with filters
   */
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

  /**
   * GET /admin/notifications/stats
   * Get notification statistics
   */
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.notificationsService.getStats(startDate, endDate);
  }

  /**
   * GET /admin/notifications/user/:userId
   * Get user notifications
   */
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

  /**
   * GET /admin/notifications/:notificationId
   * Get single notification details
   */
  @Get(':notificationId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getNotificationById(@Param('notificationId') notificationId: string) {
    return this.notificationsService.getNotificationById(notificationId);
  }

  /**
   * POST /admin/notifications/broadcast
   * Create broadcast notification (send to all users)
   */
  @Post('broadcast')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async createBroadcast(
    @GetUser('id') adminUserId: string,
    @Body() dto: CreateBroadcastDto,
  ) {
    return this.notificationsService.createBroadcast(adminUserId, dto);
  }

  /**
   * POST /admin/notifications/user/:userId
   * Send notification to specific user
   */
  @Post('user/:userId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async sendToUser(
    @GetUser('id') adminUserId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateNotificationDto,
  ) {
    return this.notificationsService.sendToUser(adminUserId, userId, dto);
  }

  /**
   * PATCH /admin/notifications/:notificationId/read
   * Mark notification as read (for troubleshooting)
   */
  @Patch(':notificationId/read')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async markAsRead(@Param('notificationId') notificationId: string) {
    return this.notificationsService.markAsRead(notificationId);
  }

  /**
   * DELETE /admin/notifications/:notificationId
   * Delete notification (admin cleanup)
   */
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

  /**
   * POST /admin/notifications/bulk-delete
   * Bulk delete notifications
   */
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

  /**
   * POST /admin/notifications/birthday-test/:userId
   * Test birthday notification for a specific user
   */
  @Post('birthday-test/:userId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async testBirthdayNotification(@Param('userId') userId: string) {
    return this.birthdaySchedulerService.sendBirthdayNotificationToUser(userId);
  }

  /**
   * GET /admin/notifications/queue/stats
   * Get notification queue statistics
   */
  @Get('queue/stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  async getQueueStats() {
    return this.queueProcessor.getQueueStats();
  }
}
