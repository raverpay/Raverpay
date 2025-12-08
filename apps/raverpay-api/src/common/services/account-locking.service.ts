import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationDispatcherService } from '../../notifications/notification-dispatcher.service';

export enum LockDuration {
  SHORT = 24, // 24 hours
  MEDIUM = 72, // 72 hours (3 days)
  PERMANENT = 0, // Requires manual unlock
}

export enum LockReason {
  THREE_VIOLATIONS_HOUR = '3 rate limit violations in 1 hour',
  FIVE_VIOLATIONS_DAY = '5 rate limit violations in 24 hours',
  TEN_VIOLATIONS_WEEK = '10 rate limit violations in 7 days',
  MANUAL_ADMIN_LOCK = 'Manually locked by admin',
}

@Injectable()
export class AccountLockingService {
  constructor(
    private prisma: PrismaService,
    private notificationDispatcher: NotificationDispatcherService,
  ) {}

  /**
   * Check if user should be locked based on rate limit violations
   * Called after each violation is logged
   */
  async checkAndLockAccount(userId: string): Promise<boolean> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Count violations in different time windows
    const [violationsLastHour, violationsLastDay, violationsLastWeek] =
      await Promise.all([
        this.prisma.rateLimitViolation.count({
          where: { userId, violatedAt: { gte: oneHourAgo } },
        }),
        this.prisma.rateLimitViolation.count({
          where: { userId, violatedAt: { gte: oneDayAgo } },
        }),
        this.prisma.rateLimitViolation.count({
          where: { userId, violatedAt: { gte: oneWeekAgo } },
        }),
      ]);

    // Determine lock duration based on violation count
    let lockDuration: LockDuration | null = null;
    let lockReason: LockReason | null = null;

    if (violationsLastWeek >= 10) {
      lockDuration = LockDuration.PERMANENT;
      lockReason = LockReason.TEN_VIOLATIONS_WEEK;
    } else if (violationsLastDay >= 5) {
      lockDuration = LockDuration.MEDIUM;
      lockReason = LockReason.FIVE_VIOLATIONS_DAY;
    } else if (violationsLastHour >= 3) {
      lockDuration = LockDuration.SHORT;
      lockReason = LockReason.THREE_VIOLATIONS_HOUR;
    }

    if (lockDuration !== null && lockReason !== null) {
      await this.lockAccount(userId, lockDuration, lockReason);
      return true;
    }

    return false;
  }

  /**
   * Lock a user account
   */
  async lockAccount(
    userId: string,
    duration: LockDuration,
    reason: LockReason,
  ): Promise<void> {
    const now = new Date();
    let lockedUntil: Date | null = null;

    if (duration !== LockDuration.PERMANENT) {
      lockedUntil = new Date(now.getTime() + duration * 60 * 60 * 1000);
    }

    // Update user record
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil,
        rateLimitLockCount: { increment: 1 },
        lastRateLimitLockAt: now,
        rateLimitLockReason: reason,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        rateLimitLockCount: true,
      },
    });

    console.log(
      `🔒 Account locked: User ${userId} | Reason: ${reason} | Duration: ${duration === LockDuration.PERMANENT ? 'Permanent' : `${duration} hours`}`,
    );

    // Send notification
    await this.sendLockNotification(user, duration, reason);
  }

  /**
   * Check if a user is currently locked
   */
  async isAccountLocked(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { lockedUntil: true },
    });

    if (!user?.lockedUntil) return false;

    const now = new Date();
    if (user.lockedUntil > now) {
      return true; // Still locked
    }

    // Lock expired, clear it
    await this.prisma.user.update({
      where: { id: userId },
      data: { lockedUntil: null, rateLimitLockReason: null },
    });

    return false;
  }

  /**
   * Manually unlock an account (admin action)
   */
  async unlockAccount(userId: string, adminId: string, reason?: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil: null,
        rateLimitLockReason: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        lockedUntil: true,
        rateLimitLockCount: true,
        rateLimitLockReason: true,
      },
    });

    console.log(
      `🔓 Account unlocked: User ${userId} | Admin: ${adminId} | Reason: ${reason || 'Manual unlock'}`,
    );

    // Send notification
    await this.notificationDispatcher.sendNotification({
      userId,
      eventType: 'account_unlocked',
      category: 'SECURITY',
      channels: ['EMAIL', 'PUSH', 'IN_APP'],
      title: 'Account Unlocked',
      message: `Your account has been unlocked. ${reason ? `Reason: ${reason}` : 'You can now access all features.'}`,
      data: {
        unlockedBy: 'admin',
        reason: reason || 'Manual unlock',
        unlockedAt: new Date().toISOString(),
      },
    });

    return { user };
  }

  /**
   * Get locked accounts
   */
  async getLockedAccounts(params?: {
    permanent?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { permanent = false, page = 1, limit = 50 } = params || {};
    const skip = (page - 1) * limit;

    const where: any = {};

    if (permanent) {
      where.lockedUntil = null;
      where.rateLimitLockReason = { not: null };
    } else {
      where.lockedUntil = { gte: new Date() };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          lockedUntil: true,
          lastRateLimitLockAt: true,
          rateLimitLockReason: true,
          rateLimitLockCount: true,
        },
        orderBy: { lastRateLimitLockAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Send lock notification to user
   */
  private async sendLockNotification(
    user: {
      id: string;
      email: string;
      firstName: string;
      rateLimitLockCount: number;
    },
    duration: LockDuration,
    reason: LockReason,
  ): Promise<void> {
    const isPermanent = duration === LockDuration.PERMANENT;
    const durationText = isPermanent ? 'indefinitely' : `for ${duration} hours`;

    await this.notificationDispatcher.sendNotification({
      userId: user.id,
      eventType: 'account_locked',
      category: 'SECURITY',
      channels: ['EMAIL', 'PUSH', 'IN_APP'],
      title: '🔒 Account Locked',
      message: `Your account has been locked ${durationText} due to: ${reason}. ${isPermanent ? 'Please contact support to unlock your account.' : `Your account will be automatically unlocked on ${new Date(Date.now() + duration * 60 * 60 * 1000).toLocaleString()}.`}`,
      data: {
        reason,
        duration: isPermanent ? 'permanent' : `${duration}h`,
        lockedUntil: isPermanent
          ? null
          : new Date(Date.now() + duration * 60 * 60 * 1000).toISOString(),
        lockCount: user.rateLimitLockCount || 1,
      },
    });
  }
}
