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
import { UserRole, DeletionRequestStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminDeletionsService } from './admin-deletions.service';

@Controller('admin/deletions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminDeletionsController {
  constructor(private readonly adminDeletionsService: AdminDeletionsService) {}

  /**
   * GET /admin/deletions
   * Get all deletion requests
   */
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

  /**
   * GET /admin/deletions/pending
   * Get pending deletion requests
   */
  @Get('pending')
  async getPendingRequests() {
    return this.adminDeletionsService.getPendingRequests();
  }

  /**
   * GET /admin/deletions/:requestId
   * Get single deletion request
   */
  @Get(':requestId')
  async getRequestById(@Param('requestId') requestId: string) {
    return this.adminDeletionsService.getRequestById(requestId);
  }

  /**
   * POST /admin/deletions/:requestId/approve
   * Approve deletion request
   */
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

  /**
   * POST /admin/deletions/:requestId/reject
   * Reject deletion request
   */
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
