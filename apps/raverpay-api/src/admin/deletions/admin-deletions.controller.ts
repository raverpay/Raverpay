import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
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
import { UserRole, DeletionRequestStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminDeletionsService } from './admin-deletions.service';

@ApiTags('Admin - Deletions')
@ApiBearerAuth('JWT-auth')
@Controller('admin/deletions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminDeletionsController {
  constructor(private readonly adminDeletionsService: AdminDeletionsService) {}

  @ApiOperation({ summary: 'Get all deletion requests' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: DeletionRequestStatus })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @Get()
  async getDeletionRequests(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: DeletionRequestStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminDeletionsService.getDeletionRequests(
      page,
      limit,
      status,
      startDate,
      endDate,
    );
  }

  @ApiOperation({ summary: 'Get pending deletion requests' })
  @Get('pending')
  async getPendingRequests() {
    return this.adminDeletionsService.getPendingRequests();
  }

  @ApiOperation({ summary: 'Get single deletion request' })
  @ApiParam({ name: 'requestId', description: 'Request ID' })
  @Get(':requestId')
  async getRequestById(@Param('requestId') requestId: string) {
    return this.adminDeletionsService.getRequestById(requestId);
  }

  @ApiOperation({ summary: 'Approve deletion request' })
  @ApiParam({ name: 'requestId', description: 'Request ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        scheduledFor: { type: 'string', format: 'date-time' },
        notes: { type: 'string' },
      },
    },
  })
  @Post(':requestId/approve')
  async approveRequest(
    @Request() req,
    @Param('requestId') requestId: string,
    @Body('scheduledFor') scheduledFor?: Date,
    @Body('notes') notes?: string,
  ) {
    return this.adminDeletionsService.approveRequest(
      req.user.id,
      requestId,
      scheduledFor,
      notes,
    );
  }

  @ApiOperation({ summary: 'Reject deletion request' })
  @ApiParam({ name: 'requestId', description: 'Request ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { reason: { type: 'string' }, notes: { type: 'string' } },
    },
  })
  @Post(':requestId/reject')
  async rejectRequest(
    @Request() req,
    @Param('requestId') requestId: string,
    @Body('reason') reason: string,
    @Body('notes') notes?: string,
  ) {
    return this.adminDeletionsService.rejectRequest(
      req.user.id,
      requestId,
      reason,
      notes,
    );
  }
}
