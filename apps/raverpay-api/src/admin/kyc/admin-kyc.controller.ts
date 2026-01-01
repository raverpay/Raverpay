import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminKYCService } from './admin-kyc.service';
import { ApproveBVNDto, RejectBVNDto } from '../dto';

@ApiTags('Admin - KYC')
@ApiBearerAuth('JWT-auth')
@Controller('admin/kyc')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
export class AdminKYCController {
  constructor(private readonly adminKYCService: AdminKYCService) {}

  @ApiOperation({ summary: 'Get pending KYC verifications' })
  @Get('pending')
  async getPendingKYC() {
    return this.adminKYCService.getPendingKYC();
  }

  @ApiOperation({ summary: 'Get rejected KYC applications' })
  @Get('rejected')
  async getRejectedKYC() {
    return this.adminKYCService.getRejectedKYC();
  }

  @ApiOperation({ summary: 'Get KYC statistics' })
  @Get('stats')
  async getKYCStats() {
    return this.adminKYCService.getKYCStats();
  }

  @ApiOperation({ summary: 'Get user KYC details' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Get(':userId')
  async getUserKYC(@Param('userId') userId: string) {
    return this.adminKYCService.getUserKYC(userId);
  }

  @ApiOperation({ summary: 'Approve BVN verification' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Post(':userId/approve-bvn')
  async approveBVN(
    @Request() req,
    @Param('userId') userId: string,
    @Body() dto: ApproveBVNDto,
  ) {
    return this.adminKYCService.approveBVN(req.user.id, userId, dto);
  }

  @ApiOperation({ summary: 'Reject BVN verification' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Post(':userId/reject-bvn')
  async rejectBVN(
    @Request() req,
    @Param('userId') userId: string,
    @Body() dto: RejectBVNDto,
  ) {
    return this.adminKYCService.rejectBVN(req.user.id, userId, dto);
  }

  @ApiOperation({ summary: 'Approve NIN verification' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Post(':userId/approve-nin')
  async approveNIN(
    @Request() req,
    @Param('userId') userId: string,
    @Body() dto: ApproveBVNDto,
  ) {
    return this.adminKYCService.approveNIN(req.user.id, userId, dto);
  }

  @ApiOperation({ summary: 'Reject NIN verification' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Post(':userId/reject-nin')
  async rejectNIN(
    @Request() req,
    @Param('userId') userId: string,
    @Body() dto: RejectBVNDto,
  ) {
    return this.adminKYCService.rejectNIN(req.user.id, userId, dto);
  }
}
