import {
  Controller,
  Get,
  Patch,
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
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminUsersService } from './admin-users.service';
import {
  QueryUsersDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
  UpdateKYCTierDto,
  LockAccountDto,
  UnlockAccountDto,
} from '../dto';

@ApiTags('Admin - Users')
@ApiBearerAuth('JWT-auth')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @ApiOperation({ summary: 'Get paginated list of users with filters' })
  @Get()
  async getUsers(@Query() query: QueryUsersDto) {
    return this.adminUsersService.getUsers(query);
  }

  @ApiOperation({ summary: 'Get user statistics' })
  @Get('stats')
  async getUserStats() {
    return this.adminUsersService.getUserStats();
  }

  @ApiOperation({ summary: 'Get single user details' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Get(':userId')
  async getUserById(@Param('userId') userId: string) {
    return this.adminUsersService.getUserById(userId);
  }

  @ApiOperation({ summary: 'Update user role (SUPER_ADMIN only)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Patch(':userId/role')
  async updateUserRole(
    @Request() req,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminUsersService.updateUserRole(req.user.id, userId, dto);
  }

  @ApiOperation({ summary: 'Update user status (suspend, ban, activate)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Patch(':userId/status')
  async updateUserStatus(
    @Request() req,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminUsersService.updateUserStatus(req.user.id, userId, dto);
  }

  @ApiOperation({ summary: 'Update user KYC tier (manual override)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Patch(':userId/kyc-tier')
  async updateKYCTier(
    @Request() req,
    @Param('userId') userId: string,
    @Body() dto: UpdateKYCTierDto,
  ) {
    return this.adminUsersService.updateKYCTier(req.user.id, userId, dto);
  }

  @ApiOperation({ summary: 'Get user audit logs' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get(':userId/audit-logs')
  async getUserAuditLogs(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminUsersService.getUserAuditLogs(userId, page, limit);
  }

  @ApiOperation({ summary: 'Lock user account manually' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Patch(':userId/lock-account')
  async lockAccount(
    @GetUser('id') adminUserId: string,
    @Param('userId') userId: string,
    @Body() dto: LockAccountDto,
  ) {
    return this.adminUsersService.lockAccount(adminUserId, userId, dto);
  }

  @ApiOperation({ summary: 'Unlock user account (login failures)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Patch(':userId/unlock-account')
  async unlockAccount(
    @GetUser('id') adminUserId: string,
    @Param('userId') userId: string,
    @Body() dto: UnlockAccountDto,
  ) {
    return this.adminUsersService.unlockAccount(adminUserId, userId, dto);
  }

  @ApiOperation({ summary: 'Unlock user account (rate limits)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({
    schema: { type: 'object', properties: { reason: { type: 'string' } } },
  })
  @Patch(':userId/unlock')
  async unlockRateLimitAccount(
    @GetUser('id') adminUserId: string,
    @Param('userId') userId: string,
    @Body() body: { reason: string },
  ) {
    // This specifically unlocks rate limit locks using AccountLockingService
    return this.adminUsersService.unlockRateLimitAccount(
      adminUserId,
      userId,
      body.reason,
    );
  }
}
