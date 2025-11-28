import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DeletionRequestStatus } from '@prisma/client';
import { NotificationDispatcherService } from '../../notifications/notification-dispatcher.service';

@Injectable()
export class AdminDeletionsService {
  private readonly logger = new Logger(AdminDeletionsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationDispatcher: NotificationDispatcherService,
  ) {}

  /**
   * Get all deletion requests
   */
  async getDeletionRequests(
    page: number = 1,
    limit: number = 20,
    status?: DeletionRequestStatus,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;

    if (startDate || endDate) {
      where.requestedAt = {};
      if (startDate) where.requestedAt.gte = new Date(startDate);
      if (endDate) where.requestedAt.lte = new Date(endDate);
    }

    const [requests, total] = await Promise.all([
      this.prisma.accountDeletionRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { requestedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              wallet: {
                select: {
                  balance: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.accountDeletionRequest.count({ where }),
    ]);

    return {
      data: requests.map((req) => ({
        ...req,
        daysPending: Math.floor(
          (Date.now() - req.requestedAt.getTime()) / (1000 * 60 * 60 * 24),
        ),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get pending deletion requests
   */
  async getPendingRequests() {
    const requests = await this.prisma.accountDeletionRequest.findMany({
      where: { status: DeletionRequestStatus.PENDING },
      orderBy: { requestedAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            wallet: {
              select: {
                balance: true,
              },
            },
          },
        },
      },
    });

    return requests.map((req) => ({
      ...req,
      daysPending: Math.floor(
        (Date.now() - req.requestedAt.getTime()) / (1000 * 60 * 60 * 24),
      ),
    }));
  }

  /**
   * Get single deletion request
   */
  async getRequestById(requestId: string) {
    const request = await this.prisma.accountDeletionRequest.findUnique({
      where: { id: requestId },
      include: {
        user: {
          include: {
            wallet: true,
            _count: {
              select: {
                transactions: true,
                vtuOrders: true,
              },
            },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Deletion request not found');
    }

    return request;
  }

  /**
   * Approve deletion request
   */
  async approveRequest(
    adminUserId: string,
    requestId: string,
    scheduledFor?: Date,
    notes?: string,
  ) {
    const request = await this.prisma.accountDeletionRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundException('Deletion request not found');
    }

    const updatedRequest = await this.prisma.accountDeletionRequest.update({
      where: { id: requestId },
      data: {
        status: DeletionRequestStatus.APPROVED,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        reviewNotes: notes,
        scheduledFor:
          scheduledFor || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default: 7 days from now
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'APPROVE_ACCOUNT_DELETION',
        resource: 'AccountDeletionRequest',
        resourceId: requestId,
        metadata: {
          userEmail: request.user.email,
          scheduledFor: updatedRequest.scheduledFor,
          notes,
        },
      },
    });

    // Send notification to user
    const scheduledDate = updatedRequest.scheduledFor
      ? new Date(updatedRequest.scheduledFor).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'the scheduled date';

    this.notificationDispatcher
      .sendNotification({
        userId: request.userId,
        eventType: 'deletion_approved',
        category: 'ACCOUNT',
        channels: ['EMAIL', 'PUSH', 'IN_APP'],
        title: 'Account Deletion Request Approved',
        message: `Your account deletion request has been approved. Your account will be permanently deleted on ${scheduledDate}. If you change your mind, please contact support before this date.`,
        data: {
          // Only include user-friendly data, technical details are stored in notification record
          scheduledDate,
        },
      })
      .catch((error) => {
        this.logger.error(
          'Failed to send deletion approval notification',
          error,
        );
      });

    return updatedRequest;
  }

  /**
   * Reject deletion request
   */
  async rejectRequest(
    adminUserId: string,
    requestId: string,
    reason: string,
    notes?: string,
  ) {
    const request = await this.prisma.accountDeletionRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundException('Deletion request not found');
    }

    const updatedRequest = await this.prisma.accountDeletionRequest.update({
      where: { id: requestId },
      data: {
        status: DeletionRequestStatus.REJECTED,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        rejectionReason: reason,
        reviewNotes: notes,
      },
    });

    // Update user deletion flag and restore status to ACTIVE
    await this.prisma.user.update({
      where: { id: request.userId },
      data: {
        deletionRequested: false,
        deletionRequestedAt: null,
        status: 'ACTIVE', // Restore user status from PENDING_DELETION to ACTIVE
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'REJECT_ACCOUNT_DELETION',
        resource: 'AccountDeletionRequest',
        resourceId: requestId,
        metadata: {
          userEmail: request.user.email,
          reason,
          notes,
        },
      },
    });

    // Send notification to user with reason
    this.notificationDispatcher
      .sendNotification({
        userId: request.userId,
        eventType: 'deletion_rejected',
        category: 'ACCOUNT',
        channels: ['EMAIL', 'PUSH', 'IN_APP'],
        title: 'Account Deletion Request Rejected',
        message: `Your account deletion request has been rejected. Reason: ${reason}. Your account remains active. If you have any questions, please contact our support team.`,
        // Don't include technical data in email - the message already contains the reason
        data: {},
        variables: {
          reason,
          userName: `${request.user.firstName} ${request.user.lastName}`,
        },
      })
      .catch((error) => {
        this.logger.error(
          'Failed to send deletion rejection notification',
          error,
        );
      });

    return updatedRequest;
  }
}
