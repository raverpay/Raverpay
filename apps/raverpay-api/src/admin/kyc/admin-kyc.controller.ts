import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminKYCService } from './admin-kyc.service';
import { ApproveBVNDto, RejectBVNDto } from '../dto';

@Controller('admin/kyc')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT)
export class AdminKYCController {
  constructor(private readonly adminKYCService: AdminKYCService) {}

  /**
   * GET /admin/kyc/pending
   * Get pending KYC verifications
   */
  @Get('pending')
  async getPendingKYC() {
    return this.adminKYCService.getPendingKYC();
  }

  /**
   * GET /admin/kyc/rejected
   * Get rejected KYC applications
   */
  @Get('rejected')
  async getRejectedKYC() {
    return this.adminKYCService.getRejectedKYC();
  }

  /**
   * GET /admin/kyc/stats
   * Get KYC statistics
   */
  @Get('stats')
  async getKYCStats() {
    return this.adminKYCService.getKYCStats();
  }

  /**
   * GET /admin/kyc/:userId
   * Get user KYC details
   */
  @Get(':userId')
  async getUserKYC(@Param('userId') userId: string) {
    return this.adminKYCService.getUserKYC(userId);
  }

  /**
   * POST /admin/kyc/:userId/approve-bvn
   * Approve BVN verification
   */
  @Post(':userId/approve-bvn')
  async approveBVN(
    @Request() req,
    @Param('userId') userId: string,
    @Body() dto: ApproveBVNDto,
  ) {
    return this.adminKYCService.approveBVN(req.user.id, userId, dto);
  }

  /**
   * POST /admin/kyc/:userId/reject-bvn
   * Reject BVN verification
   */
  @Post(':userId/reject-bvn')
  async rejectBVN(
    @Request() req,
    @Param('userId') userId: string,
    @Body() dto: RejectBVNDto,
  ) {
    return this.adminKYCService.rejectBVN(req.user.id, userId, dto);
  }

  /**
   * POST /admin/kyc/:userId/approve-nin
   * Approve NIN verification
   */
  @Post(':userId/approve-nin')
  async approveNIN(
    @Request() req,
    @Param('userId') userId: string,
    @Body() dto: ApproveBVNDto,
  ) {
    return this.adminKYCService.approveNIN(req.user.id, userId, dto);
  }

  /**
   * POST /admin/kyc/:userId/reject-nin
   * Reject NIN verification
   */
  @Post(':userId/reject-nin')
  async rejectNIN(
    @Request() req,
    @Param('userId') userId: string,
    @Body() dto: RejectBVNDto,
  ) {
    return this.adminKYCService.rejectNIN(req.user.id, userId, dto);
  }
}
