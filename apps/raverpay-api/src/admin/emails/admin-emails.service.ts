import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { SupportService } from '../../support/support.service';
import { ReplyEmailDto } from './dto/reply-email.dto';

/**
 * Admin Emails Service
 *
 * Handles email management for admin dashboard
 * Implements role-based access control:
 * - SUPPORT: Can only see support emails
 * - ADMIN: Can see admin and support emails (not super admin)
 * - SUPER_ADMIN: Can see all emails and filter by any role
 */
@Injectable()
export class AdminEmailsService {
  private readonly logger = new Logger(AdminEmailsService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly supportService: SupportService,
  ) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'noreply@raverpay.com';
    this.fromName =
      this.configService.get<string>('RESEND_FROM_NAME') || 'RaverPay';

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('✅ Resend client initialized for email replies');
    } else {
      this.resend = null;
      this.logger.warn(
        '⚠️ RESEND_API_KEY not found - Cannot send email replies',
      );
    }
  }

  /**
   * Get emails with ticket-based visibility filtering
   * - SUPPORT/ADMIN: Can only see emails assigned to them (via ticket assignment)
   * - SUPER_ADMIN: Can see all emails
   */
  async getEmails(
    userRole: UserRole,
    userId: string,
    filters: {
      page?: number;
      limit?: number;
      targetEmail?: string;
      targetRole?: UserRole;
      isProcessed?: boolean;
      search?: string;
    } = {},
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause with ticket-based visibility
    const where: any = {};

    // Ticket-based access control (visibility based on ticket assignment)
    if (userRole === UserRole.SUPER_ADMIN) {
      // SUPER_ADMIN can see all emails (no restriction)
      // No additional where clause needed
    } else {
      // SUPPORT and ADMIN can only see emails assigned to them (via ticket)
      // OR emails without tickets that match their role (for admin inbox emails)
      const roleFilter: any = {};
      if (userRole === UserRole.SUPPORT) {
        roleFilter.targetRole = UserRole.SUPPORT;
      } else if (userRole === UserRole.ADMIN) {
        roleFilter.targetRole = {
          in: [UserRole.SUPPORT, UserRole.ADMIN],
        };
      }

      // Emails assigned to this user via ticket OR emails without tickets matching their role
      where.OR = [
        {
          // Emails with tickets assigned to this user
          ticket: {
            assignedAgentId: userId,
          },
          ...roleFilter,
        },
        {
          // Emails without tickets that match their role (e.g., admin@ emails)
          ticket: null,
          ...roleFilter,
        },
      ];
    }

    // Apply filters
    if (filters.targetEmail) {
      where.targetEmail = filters.targetEmail;
    }

    if (filters.targetRole !== undefined) {
      // Only SUPER_ADMIN can filter by any role
      if (userRole === UserRole.SUPER_ADMIN) {
        where.targetRole = filters.targetRole;
      } else {
        // For other roles, ensure they can only filter within their allowed roles
        if (
          userRole === UserRole.SUPPORT &&
          filters.targetRole !== UserRole.SUPPORT
        ) {
          throw new ForbiddenException('You can only view support emails');
        }
        if (
          userRole === UserRole.ADMIN &&
          filters.targetRole !== UserRole.SUPPORT &&
          filters.targetRole !== UserRole.ADMIN
        ) {
          throw new ForbiddenException(
            'You can only view support and admin emails',
          );
        }
        // Apply targetRole filter (ticket assignment filter already applied above)
        where.targetRole = filters.targetRole;
      }
    }

    if (filters.isProcessed !== undefined) {
      where.isProcessed = filters.isProcessed;
    }

    if (filters.search) {
      where.OR = [
        { subject: { contains: filters.search, mode: 'insensitive' } },
        { from: { contains: filters.search, mode: 'insensitive' } },
        { fromName: { contains: filters.search, mode: 'insensitive' } },
        { textBody: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [emails, total] = await Promise.all([
      this.prisma.inboundEmail.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
              status: true,
              priority: true,
              assignedAgentId: true,
              assignedAgent: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          conversation: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: {
          receivedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.inboundEmail.count({ where }),
    ]);

    return {
      data: emails,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get email by ID with ticket-based access check
   */
  async getEmailById(emailId: string, userRole: UserRole, userId: string) {
    const email = await this.prisma.inboundEmail.findUnique({
      where: { id: emailId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        ticket: {
          include: {
            assignedAgent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        conversation: {
          include: {
            messages: {
              where: {
                senderType: 'AGENT',
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
    });

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    // Check ticket-based access (visibility based on ticket assignment)
    if (userRole === UserRole.SUPER_ADMIN) {
      // SUPER_ADMIN can see all emails
      return email;
    }

    // SUPPORT and ADMIN can only see emails assigned to them
    if (!email.ticket || !email.ticket.assignedAgentId) {
      // Email not linked to a ticket or ticket not assigned
      // Check if user can see unassigned tickets of their role
      if (
        userRole === UserRole.SUPPORT &&
        email.targetRole !== UserRole.SUPPORT
      ) {
        throw new ForbiddenException('You do not have access to this email');
      }
      if (
        userRole === UserRole.ADMIN &&
        email.targetRole !== UserRole.SUPPORT &&
        email.targetRole !== UserRole.ADMIN
      ) {
        throw new ForbiddenException('You do not have access to this email');
      }
      // Allow access to unassigned emails of their role
      return email;
    }

    // Check if email is assigned to the current user
    if (email.ticket.assignedAgentId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this email. It is assigned to another agent.',
      );
    }

    // Additional role check for security
    if (
      userRole === UserRole.SUPPORT &&
      email.targetRole !== UserRole.SUPPORT
    ) {
      throw new ForbiddenException('You do not have access to this email');
    }

    if (
      userRole === UserRole.ADMIN &&
      email.targetRole !== UserRole.SUPPORT &&
      email.targetRole !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('You do not have access to this email');
    }

    return email;
  }

  /**
   * Get email statistics
   */
  async getEmailStats(userRole: UserRole, userId: string) {
    // Build ticket-based where clause (same logic as getEmails)
    const where: any = {};

    if (userRole === UserRole.SUPER_ADMIN) {
      // SUPER_ADMIN can see all emails
      // No restriction
    } else {
      // SUPPORT and ADMIN can only see emails assigned to them (via ticket)
      // OR emails without tickets that match their role
      const roleFilter: any = {};
      if (userRole === UserRole.SUPPORT) {
        roleFilter.targetRole = UserRole.SUPPORT;
      } else if (userRole === UserRole.ADMIN) {
        roleFilter.targetRole = {
          in: [UserRole.SUPPORT, UserRole.ADMIN],
        };
      }

      // Emails assigned to this user via ticket OR emails without tickets matching their role
      where.OR = [
        {
          ticket: {
            assignedAgentId: userId,
          },
          ...roleFilter,
        },
        {
          ticket: null,
          ...roleFilter,
        },
      ];
    }

    const [total, unprocessed, byRole, byEmail] = await Promise.all([
      this.prisma.inboundEmail.count({ where }),
      this.prisma.inboundEmail.count({
        where: {
          ...where,
          isProcessed: false,
        },
      }),
      this.prisma.inboundEmail.groupBy({
        by: ['targetRole'],
        where,
        _count: true,
      }),
      this.prisma.inboundEmail.groupBy({
        by: ['targetEmail'],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      unprocessed,
      byRole: byRole.map((item) => ({
        role: item.targetRole,
        count: item._count,
      })),
      byEmail: byEmail.map((item) => ({
        email: item.targetEmail,
        count: item._count,
      })),
    };
  }

  /**
   * Mark email as processed
   */
  async markAsProcessed(emailId: string, userRole: UserRole, userId: string) {
    const email = await this.getEmailById(emailId, userRole, userId);

    return await this.prisma.inboundEmail.update({
      where: { id: emailId },
      data: {
        isProcessed: true,
        processedAt: new Date(),
      },
    });
  }

  /**
   * Reply to an inbound email
   * Sends reply via Resend and stores it as a message in the conversation
   */
  async replyToEmail(
    emailId: string,
    userRole: UserRole,
    userId: string,
    dto: ReplyEmailDto,
  ) {
    // Get email and verify access
    const email = await this.getEmailById(emailId, userRole, userId);

    if (!this.resend) {
      throw new BadRequestException('Email service not configured');
    }

    // Ensure email has a conversation (required for storing reply)
    if (!email.conversationId) {
      throw new BadRequestException(
        'Email must be linked to a conversation to reply. Please create a ticket first.',
      );
    }

    // Get the team email address to send from (e.g., support@raverpay.com)
    const fromEmail = email.targetEmail || this.fromEmail;
    // Always use Re: format for subject to maintain email threading
    const replySubject = `Re: ${email.subject || 'No Subject'}`;

    // Prepare reply headers for email threading
    const headers: Record<string, string> = {
      'In-Reply-To': email.messageId || `<${email.emailId}@raverpay.com>`,
    };

    // If there are previous replies, add References header
    // For now, we'll just use In-Reply-To. Can be enhanced later to track thread history.

    try {
      // Send reply via Resend
      const replyResult = await this.resend.emails.send({
        from: `${this.fromName} <${fromEmail}>`,
        to: [email.from],
        subject: replySubject,
        html: dto.content, // Support HTML content
        text: dto.content.replace(/<[^>]*>/g, ''), // Strip HTML for plain text fallback
        headers,
        replyTo: fromEmail, // Set reply-to to the team email
      });

      if (replyResult.error) {
        this.logger.error(
          `Failed to send email reply: ${replyResult.error.message}`,
        );
        throw new BadRequestException(
          `Failed to send reply: ${replyResult.error.message}`,
        );
      }

      this.logger.log(
        `✅ Email reply sent to ${email.from} (Resend ID: ${replyResult.data?.id})`,
      );

      // Store reply as a message in the conversation
      await this.supportService.sendMessage(
        email.conversationId,
        {
          content: dto.content,
          senderType: 'AGENT',
          metadata: {
            emailReply: true,
            resendEmailId: replyResult.data?.id,
            originalEmailId: email.id,
          },
        },
        userId,
      );

      // Mark original email as processed if not already
      if (!email.isProcessed) {
        await this.prisma.inboundEmail.update({
          where: { id: emailId },
          data: {
            isProcessed: true,
            processedAt: new Date(),
          },
        });
      }

      return {
        success: true,
        message: 'Reply sent successfully',
        resendEmailId: replyResult.data?.id,
      };
    } catch (error) {
      this.logger.error(`Error sending email reply: ${error}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to send reply: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Fetch email body content from Resend API (on-demand)
   * Useful if body wasn't fetched during webhook processing
   */
  async fetchEmailContent(emailId: string, userRole: UserRole, userId: string) {
    const email = await this.getEmailById(emailId, userRole, userId);

    if (!this.resend) {
      throw new BadRequestException('Email service not configured');
    }

    // If email already has body content, return it
    if (email.textBody || email.htmlBody) {
      return {
        textBody: email.textBody,
        htmlBody: email.htmlBody,
        cached: true,
      };
    }

    // Fetch from Resend API
    try {
      const emailContent = await this.resend.emails.receiving.get(
        email.emailId,
      );

      if (emailContent.error) {
        throw new BadRequestException(
          `Failed to fetch email content: ${emailContent.error.message}`,
        );
      }

      const textBody = emailContent.data?.text || null;
      const htmlBody = emailContent.data?.html || null;

      // Update email in database with fetched content
      await this.prisma.inboundEmail.update({
        where: { id: emailId },
        data: {
          textBody,
          htmlBody,
        },
      });

      this.logger.log(
        `✅ Fetched email content for ${email.emailId} on-demand`,
      );

      return {
        textBody,
        htmlBody,
        cached: false,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching email content for ${email.emailId}: ${error}`,
      );
      throw new BadRequestException(
        `Failed to fetch email content: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
