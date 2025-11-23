import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { KYCTier } from '@prisma/client';
import { ApproveBVNDto, RejectBVNDto } from '../dto';
import { NotificationDispatcherService } from '../../notifications/notification-dispatcher.service';

@Injectable()
export class AdminKYCService {
  private readonly logger = new Logger(AdminKYCService.name);

  constructor(
    private prisma: PrismaService,
    private notificationDispatcher: NotificationDispatcherService,
  ) {}

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
    const [
      byTier,
      pendingBVNCount,
      pendingNINCount,
      approvedBVNCount,
      approvedNINCount,
      rejectedBVNCount,
      rejectedNINCount,
      totalUsers,
    ] = await Promise.all([
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

      // Approved BVN count (from audit logs)
      this.prisma.auditLog.count({
        where: { action: 'APPROVE_BVN' },
      }),

      // Approved NIN count (from audit logs)
      this.prisma.auditLog.count({
        where: { action: 'APPROVE_NIN' },
      }),

      // Rejected BVN count (from audit logs)
      this.prisma.auditLog.count({
        where: { action: 'REJECT_BVN' },
      }),

      // Rejected NIN count (from audit logs)
      this.prisma.auditLog.count({
        where: { action: 'REJECT_NIN' },
      }),

      // Total users
      this.prisma.user.count(),
    ]);

    const totalApproved = approvedBVNCount + approvedNINCount;
    const totalRejected = rejectedBVNCount + rejectedNINCount;
    const totalActions = totalApproved + totalRejected;
    const approvalRate =
      totalActions > 0
        ? ((totalApproved / totalActions) * 100).toFixed(2)
        : '100.00';

    return {
      total: totalUsers,
      pendingCount: pendingBVNCount + pendingNINCount,
      approvedCount: totalApproved,
      rejectedCount: totalRejected,
      pendingBVN: pendingBVNCount,
      pendingNIN: pendingNINCount,
      byTier: byTier.reduce(
        (acc, item) => {
          acc[item.kycTier] = item._count;
          return acc;
        },
        {} as Record<KYCTier, number>,
      ),
      approvalRate,
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
          in: [
            'APPROVE_BVN',
            'REJECT_BVN',
            'APPROVE_NIN',
            'REJECT_NIN',
            'UPDATE_KYC_TIER',
          ],
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
   * BVN approval always upgrades user to TIER_2 (if they're below TIER_2)
   */
  async approveBVN(adminUserId: string, userId: string, dto: ApproveBVNDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // BVN verification qualifies user for TIER_2
    // Only upgrade if current tier is below TIER_2
    const tierOrder = [
      KYCTier.TIER_0,
      KYCTier.TIER_1,
      KYCTier.TIER_2,
      KYCTier.TIER_3,
    ];
    const currentTierIndex = tierOrder.indexOf(user.kycTier);
    const tier2Index = tierOrder.indexOf(KYCTier.TIER_2);
    const newTier =
      currentTierIndex < tier2Index ? KYCTier.TIER_2 : user.kycTier;

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

    // Send notification to user
    this.notificationDispatcher
      .sendNotification({
        userId,
        eventType: 'bvn_approved',
        category: 'KYC',
        channels: ['EMAIL', 'PUSH', 'IN_APP'],
        title: 'BVN Verification Approved',
        message: `Great news! Your BVN has been verified successfully. Your account has been upgraded to ${newTier.replace('_', ' ')}.`,
        data: {
          previousTier: user.kycTier,
          newTier,
        },
      })
      .catch((error) => {
        this.logger.error('Failed to send BVN approval notification', error);
      });

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

    // Send notification to user with reason
    this.notificationDispatcher
      .sendNotification({
        userId,
        eventType: 'bvn_rejected',
        category: 'KYC',
        channels: ['EMAIL', 'PUSH', 'IN_APP'],
        title: 'BVN Verification Unsuccessful',
        message: `Your BVN verification could not be completed. Reason: ${dto.reason}. Please submit valid BVN details to try again.`,
        data: {
          reason: dto.reason,
        },
      })
      .catch((error) => {
        this.logger.error('Failed to send BVN rejection notification', error);
      });

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

    // Send notification to user
    this.notificationDispatcher
      .sendNotification({
        userId,
        eventType: 'nin_approved',
        category: 'KYC',
        channels: ['EMAIL', 'PUSH', 'IN_APP'],
        title: 'NIN Verification Approved',
        message: `Great news! Your NIN has been verified successfully. Your account has been upgraded to ${newTier.replace('_', ' ')}.`,
        data: {
          previousTier: user.kycTier,
          newTier,
        },
      })
      .catch((error) => {
        this.logger.error('Failed to send NIN approval notification', error);
      });

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

    // Send notification to user with reason
    this.notificationDispatcher
      .sendNotification({
        userId,
        eventType: 'nin_rejected',
        category: 'KYC',
        channels: ['EMAIL', 'PUSH', 'IN_APP'],
        title: 'NIN Verification Unsuccessful',
        message: `Your NIN verification could not be completed. Reason: ${dto.reason}. Please submit valid NIN details to try again.`,
        data: {
          reason: dto.reason,
        },
      })
      .catch((error) => {
        this.logger.error('Failed to send NIN rejection notification', error);
      });

    return updatedUser;
  }
}
