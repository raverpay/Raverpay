import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { DeletionRequestStatus } from '@prisma/client';

/**
 * Deletion Scheduler Service
 *
 * Processes approved account deletion requests on their scheduled date.
 * Implements soft delete - sets deletedAt timestamp and updates status to DELETED.
 * Data is preserved in the database for compliance purposes.
 */
@Injectable()
export class DeletionSchedulerService {
  private readonly logger = new Logger(DeletionSchedulerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Cron job that runs every hour to process scheduled deletions
   * Checks for approved deletion requests where scheduledFor <= now
   */
  @Cron('0 * * * *', {
    name: 'processScheduledDeletions',
    timeZone: 'Africa/Lagos',
  })
  async processScheduledDeletions() {
    this.logger.log('Starting scheduled deletion processing...');

    const now = new Date();

    // Find all approved deletion requests that are due
    const dueDeletions = await this.prisma.accountDeletionRequest.findMany({
      where: {
        status: DeletionRequestStatus.APPROVED,
        scheduledFor: {
          lte: now,
        },
      },
      include: {
        user: true,
      },
    });

    if (dueDeletions.length === 0) {
      this.logger.log('No scheduled deletions to process');
      return;
    }

    this.logger.log(`Processing ${dueDeletions.length} scheduled deletion(s)`);

    for (const deletionRequest of dueDeletions) {
      try {
        await this.softDeleteUser(deletionRequest.userId, deletionRequest.id);
        this.logger.log(
          `Successfully soft deleted user ${deletionRequest.userId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to soft delete user ${deletionRequest.userId}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log(
      `Completed processing ${dueDeletions.length} deletion(s)`,
    );
  }

  /**
   * Soft delete a user account
   * - Sets deletedAt timestamp
   * - Updates user status to DELETED
   * - Marks deletion request as COMPLETED
   * - Creates audit log with original email/phone for reference
   *
   * @param userId - User ID to delete
   * @param requestId - Deletion request ID
   */
  async softDeleteUser(userId: string, requestId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    if (user.deletedAt) {
      this.logger.warn(`User ${userId} is already deleted`);
      return;
    }

    const deletedAt = new Date();

    // Soft delete user - only set deletedAt and status
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'DELETED',
        deletedAt: deletedAt,
      },
    });

    // Update deletion request status
    await this.prisma.accountDeletionRequest.update({
      where: { id: requestId },
      data: {
        status: DeletionRequestStatus.COMPLETED,
        deletedAt: deletedAt,
      },
    });

    // Create audit log with original email/phone for reference
    await this.prisma.auditLog.create({
      data: {
        userId: userId,
        action: 'ACCOUNT_SOFT_DELETED',
        resource: 'User',
        resourceId: userId,
        metadata: {
          deletionRequestId: requestId,
          deletedAt: deletedAt.toISOString(),
          originalEmail: user.email,
          originalPhone: user.phone,
        },
      },
    });

    this.logger.log(
      `User ${userId} soft deleted successfully. Original email: ${user.email}`,
    );
  }

  /**
   * Manually trigger deletion processing (for testing or admin use)
   */
  async processDeletionsNow() {
    this.logger.log('Manually triggering deletion processing...');
    await this.processScheduledDeletions();
  }
}

