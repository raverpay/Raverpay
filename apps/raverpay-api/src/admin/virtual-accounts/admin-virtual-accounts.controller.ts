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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ReAuthGuard } from '../../common/guards/re-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminVirtualAccountsService } from './admin-virtual-accounts.service';

@ApiTags('Admin - Virtual Accounts')
@ApiBearerAuth('JWT-auth')
@Controller('admin/virtual-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminVirtualAccountsController {
  constructor(
    private readonly adminVirtualAccountsService: AdminVirtualAccountsService,
  ) {}

  @ApiOperation({ summary: 'Get all virtual accounts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'provider', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
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

  @ApiOperation({ summary: 'Get virtual account statistics' })
  @Get('stats')
  async getStats() {
    return this.adminVirtualAccountsService.getStats();
  }

  @ApiOperation({ summary: 'Get users without virtual accounts' })
  @Get('unassigned')
  async getUnassignedUsers() {
    return this.adminVirtualAccountsService.getUnassignedUsers();
  }

  @ApiOperation({ summary: 'Get users with failed DVA creation' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
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

  @ApiOperation({ summary: 'Get DVA creation status for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Get(':userId/status')
  async getDVACreationStatus(@Param('userId') userId: string) {
    return this.adminVirtualAccountsService.getDVACreationStatus(userId);
  }

  @ApiOperation({
    summary: 'Manually create DVA for a user',
    description: 'Requires re-authentication for this sensitive operation',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { preferred_bank: { type: 'string' } },
    },
  })
  @UseGuards(ReAuthGuard)
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

  @ApiOperation({ summary: 'Get virtual account by user ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Get(':userId')
  async getByUserId(@Param('userId') userId: string) {
    return this.adminVirtualAccountsService.getByUserId(userId);
  }

  @ApiOperation({
    summary: 'Deactivate virtual account',
    description: 'Requires re-authentication for this sensitive operation',
  })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiBody({
    schema: { type: 'object', properties: { reason: { type: 'string' } } },
  })
  @UseGuards(ReAuthGuard)
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

  @ApiOperation({
    summary: 'Reactivate virtual account',
    description: 'Requires re-authentication for this sensitive operation',
  })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @UseGuards(ReAuthGuard)
  @Patch(':accountId/reactivate')
  async reactivate(@Request() req, @Param('accountId') accountId: string) {
    return this.adminVirtualAccountsService.reactivate(req.user.id, accountId);
  }
}
