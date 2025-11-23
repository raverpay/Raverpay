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
  Request,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { UserStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminAdminsService } from './admin-admins.service';
import {
  CreateAdminDto,
  UpdateAdminDto,
  ResetPasswordDto,
} from '../dto/admin.dto';

@Controller('admin/admins')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN) // Only SUPER_ADMIN can manage admins
export class AdminAdminsController {
  constructor(private readonly adminAdminsService: AdminAdminsService) {}

  /**
   * GET /admin/admins
   * Get paginated list of admin users
   */
  @Get()
  async getAdmins(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminAdminsService.getAdmins(
      page,
      limit,
      role as UserRole | undefined,
      status as UserStatus | undefined,
      search,
    );
  }

  /**
   * GET /admin/admins/stats
   * Get admin statistics
   */
  @Get('stats')
  async getStats() {
    return this.adminAdminsService.getStats();
  }

  /**
   * GET /admin/admins/:adminId
   * Get single admin details
   */
  @Get(':adminId')
  async getAdminById(@Param('adminId') adminId: string) {
    return this.adminAdminsService.getAdminById(adminId);
  }

  /**
   * POST /admin/admins
   * Create new admin user
   */
  @Post()
  async createAdmin(@Request() req, @Body() dto: CreateAdminDto) {
    return this.adminAdminsService.createAdmin(req.user.id, dto);
  }

  /**
   * PATCH /admin/admins/:adminId
   * Update admin user
   */
  @Patch(':adminId')
  async updateAdmin(
    @Request() req,
    @Param('adminId') adminId: string,
    @Body() dto: UpdateAdminDto,
  ) {
    return this.adminAdminsService.updateAdmin(req.user.id, adminId, dto);
  }

  /**
   * DELETE /admin/admins/:adminId
   * Delete (deactivate) admin user
   */
  @Delete(':adminId')
  async deleteAdmin(@Request() req, @Param('adminId') adminId: string) {
    return this.adminAdminsService.deleteAdmin(req.user.id, adminId);
  }

  /**
   * POST /admin/admins/:adminId/reset-password
   * Reset admin password
   */
  @Post(':adminId/reset-password')
  async resetPassword(
    @Request() req,
    @Param('adminId') adminId: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.adminAdminsService.resetPassword(
      req.user.id,
      adminId,
      dto.password,
    );
  }
}
