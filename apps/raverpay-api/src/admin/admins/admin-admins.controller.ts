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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
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

@ApiTags('Admin - Admins')
@ApiBearerAuth('JWT-auth')
@Controller('admin/admins')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN) // Only SUPER_ADMIN can manage admins
export class AdminAdminsController {
  constructor(private readonly adminAdminsService: AdminAdminsService) {}

  @ApiOperation({ summary: 'Get paginated list of admin users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
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

  @ApiOperation({ summary: 'Get admin statistics' })
  @Get('stats')
  async getStats() {
    return this.adminAdminsService.getStats();
  }

  @ApiOperation({ summary: 'Get single admin details' })
  @ApiParam({ name: 'adminId', description: 'Admin ID' })
  @Get(':adminId')
  async getAdminById(@Param('adminId') adminId: string) {
    return this.adminAdminsService.getAdminById(adminId);
  }

  @ApiOperation({ summary: 'Create new admin user' })
  @Post()
  async createAdmin(@Request() req, @Body() dto: CreateAdminDto) {
    return this.adminAdminsService.createAdmin(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Update admin user' })
  @ApiParam({ name: 'adminId', description: 'Admin ID' })
  @Patch(':adminId')
  async updateAdmin(
    @Request() req,
    @Param('adminId') adminId: string,
    @Body() dto: UpdateAdminDto,
  ) {
    return this.adminAdminsService.updateAdmin(req.user.id, adminId, dto);
  }

  @ApiOperation({ summary: 'Delete (deactivate) admin user' })
  @ApiParam({ name: 'adminId', description: 'Admin ID' })
  @Delete(':adminId')
  async deleteAdmin(@Request() req, @Param('adminId') adminId: string) {
    return this.adminAdminsService.deleteAdmin(req.user.id, adminId);
  }

  @ApiOperation({ summary: 'Reset admin password' })
  @ApiParam({ name: 'adminId', description: 'Admin ID' })
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
