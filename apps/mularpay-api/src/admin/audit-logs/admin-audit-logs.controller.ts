import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminAuditLogsService } from './admin-audit-logs.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminAuditLogsController {
  constructor(private readonly auditLogsService: AdminAuditLogsService) {}

  /**
   * GET /admin/audit-logs
   * Get audit logs with filters
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('userId') userId?: string,
    @Query('resourceId') resourceId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditLogsService.getAuditLogs(
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
      action,
      resource,
      userId,
      resourceId,
      startDate,
      endDate,
    );
  }

  /**
   * GET /admin/audit-logs/stats
   * Get audit log statistics
   */
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditLogsService.getStats(startDate, endDate);
  }

  /**
   * GET /admin/audit-logs/user/:userId
   * Get user's activity logs
   */
  @Get('user/:userId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getUserActivity(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditLogsService.getUserActivity(
      userId,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
    );
  }

  /**
   * GET /admin/audit-logs/resource/:resource/:resourceId
   * Get audit trail for a specific resource
   */
  @Get('resource/:resource/:resourceId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getResourceAuditTrail(
    @Param('resource') resource: string,
    @Param('resourceId') resourceId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditLogsService.getResourceAuditTrail(
      resource,
      resourceId,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
    );
  }

  /**
   * GET /admin/audit-logs/:logId
   * Get single audit log details
   */
  @Get(':logId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getAuditLogById(@Param('logId') logId: string) {
    return this.auditLogsService.getAuditLogById(logId);
  }
}
