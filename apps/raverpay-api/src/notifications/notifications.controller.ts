import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { NotificationsService } from './notifications.service';
import { FindNotificationsDto } from './dto/find-notifications.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get Notifications',
    description: 'Get user notifications',
  })
  @ApiResponse({ status: 200, description: 'Notifications retrieved' })
  async findAll(
    @GetUser('id') userId: string,
    @Query() query: FindNotificationsDto,
  ) {
    return this.notificationsService.findAll(userId, query);
  }

  @Put(':id/read')
  @ApiOperation({
    summary: 'Mark As Read',
    description: 'Mark a notification as read',
  })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(
    @GetUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(userId, notificationId);
  }

  @Put('read-all')
  @ApiOperation({
    summary: 'Mark All As Read',
    description: 'Mark all notifications as read',
  })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@GetUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete Notification',
    description: 'Delete a notification',
  })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  async delete(
    @GetUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.delete(userId, notificationId);
  }
}
