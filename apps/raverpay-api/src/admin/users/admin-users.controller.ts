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

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  /**
   * GET /admin/users
   * Get paginated list of users with filters
   */
  @Get()
  async getUsers(@Query() query: QueryUsersDto) {
    return this.adminUsersService.getUsers(query);
  }

  /**
   * GET /admin/users/stats
   * Get user statistics
   */
  @Get('stats')
  async getUserStats() {
    return this.adminUsersService.getUserStats();
  }

  /**
   * GET /admin/users/:userId
   * Get single user details
   */
  @Get(':userId')
  async getUserById(@Param('userId') userId: string) {
    return this.adminUsersService.getUserById(userId);
  }

  /**
   * PATCH /admin/users/:userId/role
   * Update user role (SUPER_ADMIN only for creating ADMIN/SUPER_ADMIN)
   */
  @Patch(':userId/role')
  async updateUserRole(
    @Request() req,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminUsersService.updateUserRole(req.user.id, userId, dto);
  }

  /**
   * PATCH /admin/users/:userId/status
   * Update user status (suspend, ban, activate)
   */
  @Patch(':userId/status')
  async updateUserStatus(
    @Request() req,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminUsersService.updateUserStatus(req.user.id, userId, dto);
  }

  /**
   * PATCH /admin/users/:userId/kyc-tier
   * Update user KYC tier (manual override)
   */
  @Patch(':userId/kyc-tier')
  async updateKYCTier(
    @Request() req,
    @Param('userId') userId: string,
    @Body() dto: UpdateKYCTierDto,
  ) {
    return this.adminUsersService.updateKYCTier(req.user.id, userId, dto);
  }

  /**
   * GET /admin/users/:userId/audit-logs
   * Get user audit logs
   */
  @Get(':userId/audit-logs')
  async getUserAuditLogs(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminUsersService.getUserAuditLogs(userId, page, limit);
  }

  /**
   * PATCH /admin/users/:userId/lock-account
   * Lock user account manually (admin action)
   */
  @Patch(':userId/lock-account')
  async lockAccount(
    @GetUser('id') adminUserId: string,
    @Param('userId') userId: string,
    @Body() dto: LockAccountDto,
  ) {
    return this.adminUsersService.lockAccount(adminUserId, userId, dto);
  }

  /**
   * PATCH /admin/users/:userId/unlock-account
   * Unlock user account that was locked due to failed login attempts
   */
  @Patch(':userId/unlock-account')
  async unlockAccount(
    @GetUser('id') adminUserId: string,
    @Param('userId') userId: string,
    @Body() dto: UnlockAccountDto,
  ) {
    return this.adminUsersService.unlockAccount(adminUserId, userId, dto);
  }

  /**
   * PATCH /admin/users/:userId/unlock
   * Unlock user account that was locked due to rate limit violations
   */
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
