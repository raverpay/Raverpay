import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
import { EmailService } from '../services/email/email.service';

/**
 * Support Notification Service
 *
 * Handles all notifications related to the support system:
 * - Ticket created
 * - Agent assigned
 * - Agent response/new message
 * - Ticket resolved/closed
 * - Conversation ended
 */
@Injectable()
export class SupportNotificationService {
  private readonly logger = new Logger(SupportNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationDispatcher: NotificationDispatcherService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Notify user when a ticket is created
   */
  async notifyTicketCreated(ticketId: string) {
    try {
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              email: true,
            },
          },
        },
      });

      if (!ticket || !ticket.user) return;

      await this.notificationDispatcher.sendNotification({
        userId: ticket.userId,
        eventType: 'support_ticket_created',
        category: 'SYSTEM',
        channels: ['IN_APP', 'EMAIL', 'PUSH'],
        title: 'Support Ticket Created',
        message: `Your support ticket #${ticket.ticketNumber} has been created. We'll get back to you shortly.`,
        data: {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          category: ticket.category,
          title: ticket.title,
        },
      });

      this.logger.log(
        `Ticket created notification sent for ticket ${ticketId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send ticket created notification: ${error.message}`,
      );
    }
  }

  /**
   * Notify user when an agent is assigned to their conversation
   */
  async notifyAgentAssigned(conversationId: string, agentId: string) {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              email: true,
            },
          },
          ticket: true,
        },
      });

      const agent = await this.prisma.user.findUnique({
        where: { id: agentId },
        select: { firstName: true, lastName: true },
      });

      if (!conversation || !conversation.user || !agent) return;

      const agentName = `${agent.firstName} ${agent.lastName}`;

      await this.notificationDispatcher.sendNotification({
        userId: conversation.userId,
        eventType: 'support_agent_assigned',
        category: 'SYSTEM',
        channels: ['IN_APP', 'EMAIL', 'PUSH'],
        title: 'Agent Assigned',
        message: `${agentName} has been assigned to help you with your support request.`,
        data: {
          conversationId,
          agentName,
          ticketNumber: conversation.ticket?.ticketNumber,
        },
      });

      this.logger.log(
        `Agent assigned notification sent for conversation ${conversationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send agent assigned notification: ${error.message}`,
      );
    }
  }

  /**
   * Notify user when an agent sends a new message
   */
  async notifyNewMessage(
    conversationId: string,
    messageContent: string,
    senderType: 'AGENT' | 'USER',
  ) {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              email: true,
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
        },
      });

      if (!conversation) return;

      // If agent sent message, notify user
      if (senderType === 'AGENT' && conversation.user) {
        const agentName = conversation.ticket?.assignedAgent
          ? `${conversation.ticket.assignedAgent.firstName}`
          : 'Support Agent';

        // Truncate message for notification
        const truncatedMessage =
          messageContent.length > 100
            ? messageContent.substring(0, 100) + '...'
            : messageContent;

        await this.notificationDispatcher.sendNotification({
          userId: conversation.userId,
          eventType: 'support_new_message',
          category: 'SYSTEM',
          channels: ['IN_APP', 'PUSH'],
          title: `New message from ${agentName}`,
          message: truncatedMessage,
          data: {
            conversationId,
            ticketNumber: conversation.ticket?.ticketNumber,
            senderType: 'AGENT',
          },
        });

        this.logger.log(
          `New message notification sent to user for conversation ${conversationId}`,
        );
      }

      // If user sent message, notify assigned agent
      if (senderType === 'USER' && conversation.ticket?.assignedAgent) {
        const userName = conversation.user?.firstName || 'User';

        // Truncate message for notification
        const truncatedMessage =
          messageContent.length > 100
            ? messageContent.substring(0, 100) + '...'
            : messageContent;

        await this.notificationDispatcher.sendNotification({
          userId: conversation.ticket.assignedAgent.id,
          eventType: 'support_new_message',
          category: 'SYSTEM',
          channels: ['IN_APP', 'PUSH'],
          title: `New message from ${userName}`,
          message: truncatedMessage,
          data: {
            conversationId,
            ticketNumber: conversation.ticket?.ticketNumber,
            senderType: 'USER',
          },
        });

        this.logger.log(
          `New message notification sent to agent for conversation ${conversationId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to send new message notification: ${error.message}`,
      );
    }
  }

  /**
   * Notify user when their ticket is resolved
   */
  async notifyTicketResolved(ticketId: string) {
    try {
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              email: true,
            },
          },
          assignedAgent: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!ticket || !ticket.user) return;

      const agentName = ticket.assignedAgent
        ? `${ticket.assignedAgent.firstName}`
        : 'Our support team';

      await this.notificationDispatcher.sendNotification({
        userId: ticket.userId,
        eventType: 'support_ticket_resolved',
        category: 'SYSTEM',
        channels: ['IN_APP', 'EMAIL', 'PUSH'],
        title: 'Ticket Resolved',
        message: `${agentName} has resolved your support ticket #${ticket.ticketNumber}. Please rate your experience!`,
        data: {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          resolvedAt: ticket.resolvedAt,
        },
      });

      this.logger.log(
        `Ticket resolved notification sent for ticket ${ticketId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send ticket resolved notification: ${error.message}`,
      );
    }
  }

  /**
   * Notify user when conversation is ended
   */
  async notifyConversationEnded(conversationId: string) {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              email: true,
            },
          },
          ticket: true,
        },
      });

      if (!conversation || !conversation.user) return;

      await this.notificationDispatcher.sendNotification({
        userId: conversation.userId,
        eventType: 'support_conversation_ended',
        category: 'SYSTEM',
        channels: ['IN_APP', 'EMAIL', 'PUSH'],
        title: 'Conversation Ended',
        message: `Your support conversation${conversation.ticket ? ` (Ticket #${conversation.ticket.ticketNumber})` : ''} has been resolved. We hope we were able to help! Please rate your experience.`,
        data: {
          conversationId,
          ticketNumber: conversation.ticket?.ticketNumber,
        },
      });

      this.logger.log(
        `Conversation ended notification sent for conversation ${conversationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send conversation ended notification: ${error.message}`,
      );
    }
  }

  /**
   * Notify agent when a new conversation is waiting for assignment
   */
  async notifyNewConversationWaiting(conversationId: string) {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          ticket: true,
        },
      });

      if (!conversation) return;

      // Get all available support agents
      const agents = await this.prisma.user.findMany({
        where: {
          role: { in: ['SUPPORT', 'ADMIN', 'SUPER_ADMIN'] },
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      const userName = conversation.user
        ? `${conversation.user.firstName} ${conversation.user.lastName}`
        : 'A user';

      // Notify all agents
      for (const agent of agents) {
        await this.notificationDispatcher.sendNotification({
          userId: agent.id,
          eventType: 'support_new_conversation',
          category: 'SYSTEM',
          channels: ['IN_APP', 'PUSH'],
          title: 'New Support Request',
          message: `${userName} needs help${conversation.ticket ? ` - ${conversation.ticket.title}` : ''}`,
          data: {
            conversationId,
            ticketNumber: conversation.ticket?.ticketNumber,
            category: conversation.category,
          },
        });
      }

      this.logger.log(
        `New conversation notification sent to ${agents.length} agents`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send new conversation notification: ${error.message}`,
      );
    }
  }
}
