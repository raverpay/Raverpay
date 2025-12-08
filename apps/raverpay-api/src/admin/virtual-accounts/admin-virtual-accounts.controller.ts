import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseBoolPipe,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminVirtualAccountsService } from './admin-virtual-accounts.service';

@Controller('admin/virtual-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminVirtualAccountsController {
  constructor(
    private readonly adminVirtualAccountsService: AdminVirtualAccountsService,
  ) {}

  /**
   * GET /admin/virtual-accounts
   * Get all virtual accounts
   */
  @Get()
  async getVirtualAccounts(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('provider') provider?: string,
    @Query('status') status?: string,
    @Query('isActive', new ParseBoolPipe({ optional: true }))
    isActive?: boolean,
    @Query('userId') userId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    // Convert status to isActive boolean
    let activeStatus = isActive;
    if (status === 'active') activeStatus = true;
    else if (status === 'closed' || status === 'inactive') activeStatus = false;

    return this.adminVirtualAccountsService.getVirtualAccounts(
      page,
      limit,
      search,
      provider,
      activeStatus,
      userId,
      sortBy,
      sortOrder,
    );
  }

  /**
   * GET /admin/virtual-accounts/stats
   * Get virtual account statistics
   */
  @Get('stats')
  async getStats() {
    return this.adminVirtualAccountsService.getStats();
  }

  /**
   * GET /admin/virtual-accounts/unassigned
   * Get users without virtual accounts
   */
  @Get('unassigned')
  async getUnassignedUsers() {
    return this.adminVirtualAccountsService.getUnassignedUsers();
  }

  /**
   * GET /admin/virtual-accounts/failed
   * Get users with failed DVA creation (have customer code + BVN but no active DVA)
   */
  @Get('failed')
  async getFailedDVACreations(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.adminVirtualAccountsService.getFailedDVACreations(
      page,
      limit,
      search,
    );
  }

  /**
   * GET /admin/virtual-accounts/:userId/status
   * Get DVA creation status for a user
   */
  @Get(':userId/status')
  async getDVACreationStatus(@Param('userId') userId: string) {
    return this.adminVirtualAccountsService.getDVACreationStatus(userId);
  }

  /**
   * POST /admin/virtual-accounts/:userId/create
   * Manually create DVA for a user
   */
  @Post(':userId/create')
  async createDVAForUser(
    @Request() req,
    @Param('userId') userId: string,
    @Body('preferred_bank') preferredBank?: string,
  ) {
    return this.adminVirtualAccountsService.createDVAForUser(
      req.user.id,
      userId,
      preferredBank || 'wema-bank',
    );
  }

  /**
   * GET /admin/virtual-accounts/:userId
   * Get virtual account by user ID
   */
  @Get(':userId')
  async getByUserId(@Param('userId') userId: string) {
    return this.adminVirtualAccountsService.getByUserId(userId);
  }

  /**
   * PATCH /admin/virtual-accounts/:accountId/deactivate
   * Deactivate virtual account
   */
  @Patch(':accountId/deactivate')
  async deactivate(
    @Request() req,
    @Param('accountId') accountId: string,
    @Body('reason') reason: string,
  ) {
    return this.adminVirtualAccountsService.deactivate(
      req.user.id,
      accountId,
      reason,
    );
  }

  /**
   * PATCH /admin/virtual-accounts/:accountId/reactivate
   * Reactivate virtual account
   */
  @Patch(':accountId/reactivate')
  async reactivate(@Request() req, @Param('accountId') accountId: string) {
    return this.adminVirtualAccountsService.reactivate(req.user.id, accountId);
  }
}
