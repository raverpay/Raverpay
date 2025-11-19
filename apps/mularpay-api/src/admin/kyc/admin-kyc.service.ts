import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { KYCTier, Prisma } from '@prisma/client';
import { ApproveBVNDto, RejectBVNDto } from '../dto';

@Injectable()
export class AdminKYCService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get pending KYC verifications
   */
  async getPendingKYC() {
    const [pendingBVN, pendingNIN] = await Promise.all([
      // Users with BVN submitted but not verified
      this.prisma.user.findMany({
        where: {
          bvn: { not: null },
          bvnVerified: false,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          bvn: true,
          kycTier: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),

      // Users with NIN submitted but not verified
      this.prisma.user.findMany({
        where: {
          nin: { not: null },
          ninVerified: false,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          nin: true,
          kycTier: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      pendingBVN: pendingBVN.map((user) => ({
        ...user,
        daysPending: Math.floor(
          (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24),
        ),
      })),
      pendingNIN: pendingNIN.map((user) => ({
        ...user,
        daysPending: Math.floor(
          (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24),
        ),
      })),
    };
  }

  /**
   * Get rejected KYC applications
   */
  async getRejectedKYC() {
    // Get users from audit logs where KYC was rejected
    const rejectedBVN = await this.prisma.auditLog.findMany({
      where: {
        action: 'REJECT_BVN',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const rejectedNIN = await this.prisma.auditLog.findMany({
      where: {
        action: 'REJECT_NIN',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      rejectedBVN,
      rejectedNIN,
    };
  }

  /**
   * Get KYC statistics
   */
  async getKYCStats() {
    const [byTier, pendingBVNCount, pendingNINCount, approvalRate] =
      await Promise.all([
        // Users by KYC tier
        this.prisma.user.groupBy({
          by: ['kycTier'],
          _count: true,
        }),

        // Pending BVN count
        this.prisma.user.count({
          where: {
            bvn: { not: null },
            bvnVerified: false,
          },
        }),

        // Pending NIN count
        this.prisma.user.count({
          where: {
            nin: { not: null },
            ninVerified: false,
          },
        }),

        // Calculate approval rate from audit logs
        Promise.all([
          this.prisma.auditLog.count({
            where: { action: 'APPROVE_BVN' },
          }),
          this.prisma.auditLog.count({
            where: { action: 'REJECT_BVN' },
          }),
        ]),
      ]);

    const totalBVNActions = approvalRate[0] + approvalRate[1];
    const bvnApprovalRate =
      totalBVNActions > 0
        ? ((approvalRate[0] / totalBVNActions) * 100).toFixed(2)
        : '0';

    return {
      byTier: byTier.reduce(
        (acc, item) => {
          acc[item.kycTier] = item._count;
          return acc;
        },
        {} as Record<KYCTier, number>,
      ),
      pending: {
        bvn: pendingBVNCount,
        nin: pendingNINCount,
        total: pendingBVNCount + pendingNINCount,
      },
      approvalRate: bvnApprovalRate,
    };
  }

  /**
   * Get user KYC details
   */
  async getUserKYC(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        bvn: true,
        bvnVerified: true,
        nin: true,
        ninVerified: true,
        kycTier: true,
        dateOfBirth: true,
        gender: true,
        address: true,
        city: true,
        state: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get KYC-related audit logs
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        resourceId: userId,
        action: {
          in: ['APPROVE_BVN', 'REJECT_BVN', 'APPROVE_NIN', 'REJECT_NIN', 'UPDATE_KYC_TIER'],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      user,
      auditLogs,
    };
  }

  /**
   * Approve BVN verification
   */
  async approveBVN(adminUserId: string, userId: string, dto: ApproveBVNDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update BVN verification and upgrade tier
    const newTier =
      user.kycTier === KYCTier.TIER_0 ? KYCTier.TIER_2 : user.kycTier;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        bvnVerified: true,
        kycTier: newTier,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        bvnVerified: true,
        kycTier: true,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'APPROVE_BVN',
        resource: 'User',
        resourceId: userId,
        metadata: {
          previousTier: user.kycTier,
          newTier,
          notes: dto.notes,
        },
      },
    });

    // TODO: Send notification to user

    return updatedUser;
  }

  /**
   * Reject BVN verification
   */
  async rejectBVN(adminUserId: string, userId: string, dto: RejectBVNDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Clear BVN and keep tier as is
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        bvn: null,
        bvnVerified: false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        bvnVerified: true,
        kycTier: true,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'REJECT_BVN',
        resource: 'User',
        resourceId: userId,
        metadata: {
          reason: dto.reason,
        },
      },
    });

    // TODO: Send notification to user with reason

    return updatedUser;
  }

  /**
   * Approve NIN verification
   */
  async approveNIN(adminUserId: string, userId: string, dto: ApproveBVNDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update NIN verification
    const newTier =
      user.kycTier === KYCTier.TIER_0 ? KYCTier.TIER_1 : user.kycTier;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ninVerified: true,
        kycTier: newTier,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        ninVerified: true,
        kycTier: true,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'APPROVE_NIN',
        resource: 'User',
        resourceId: userId,
        metadata: {
          previousTier: user.kycTier,
          newTier,
          notes: dto.notes,
        },
      },
    });

    // TODO: Send notification to user

    return updatedUser;
  }

  /**
   * Reject NIN verification
   */
  async rejectNIN(adminUserId: string, userId: string, dto: RejectBVNDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Clear NIN and keep tier as is
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        nin: null,
        ninVerified: false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        ninVerified: true,
        kycTier: true,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'REJECT_NIN',
        resource: 'User',
        resourceId: userId,
        metadata: {
          reason: dto.reason,
        },
      },
    });

    // TODO: Send notification to user with reason

    return updatedUser;
  }
}
