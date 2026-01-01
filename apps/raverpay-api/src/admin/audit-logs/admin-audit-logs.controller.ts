import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminAuditLogsService } from './admin-audit-logs.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Admin - Audit Logs')
@ApiBearerAuth('JWT-auth')
@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminAuditLogsController {
  constructor(private readonly auditLogsService: AdminAuditLogsService) {}

  @ApiOperation({ summary: 'Get audit logs with filters' })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'resource', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'resourceId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
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

  @ApiOperation({ summary: 'Get audit log statistics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditLogsService.getStats(startDate, endDate);
  }

  @ApiOperation({ summary: "Get user's activity logs" })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
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

  @ApiOperation({ summary: 'Get audit trail for a specific resource' })
  @ApiParam({ name: 'resource', description: 'Resource Type' })
  @ApiParam({ name: 'resourceId', description: 'Resource ID' })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
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

  @ApiOperation({ summary: 'Get single audit log details' })
  @ApiParam({ name: 'logId', description: 'Log ID' })
  @Get(':logId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getAuditLogById(@Param('logId') logId: string) {
    return this.auditLogsService.getAuditLogById(logId);
  }
}
