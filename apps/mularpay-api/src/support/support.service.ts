import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConversationStatus,
  SenderType,
  TicketStatus,
  TicketPriority,
} from '@prisma/client';
import {
  CreateConversationDto,
  CreateMessageDto,
  CreateTicketDto,
  UpdateTicketDto,
  FindConversationsDto,
  FindTicketsDto,
  FindMessagesDto,
  RateConversationDto,
} from './dto';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(private prisma: PrismaService) {}

  // ============================================
  // CONVERSATION MANAGEMENT
  // ============================================

  async createConversation(userId: string, dto: CreateConversationDto) {
    try {
      // Check if user has an active conversation
      const existingConversation = await this.prisma.conversation.findFirst({
        where: {
          userId,
          status: {
            notIn: [ConversationStatus.ENDED],
          },
        },
      });

      if (existingConversation) {
        this.logger.log(
          `User ${userId} already has active conversation ${existingConversation.id}`,
        );
        return {
          conversation: existingConversation,
          isExisting: true,
        };
      }

      const conversation = await this.prisma.conversation.create({
        data: {
          userId,
          status: ConversationStatus.OPEN,
          category: dto.category,
          transactionId: dto.transactionContext?.transactionId,
          transactionType: dto.transactionContext?.transactionType,
          transactionContext: dto.transactionContext
            ? JSON.parse(JSON.stringify(dto.transactionContext))
            : null,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Conversation ${conversation.id} created for user ${userId}`);

      return {
        conversation,
        isExisting: false,
      };
    } catch (error) {
      this.logger.error('Error creating conversation:', error);
      throw error;
    }
  }

  async getConversations(userId: string, options: FindConversationsDto) {
    const { page = 1, limit = 20, status } = options;

    const where: any = { userId };
    if (status) where.status = status;

    try {
      const [conversations, total] = await Promise.all([
        this.prisma.conversation.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            ticket: {
              select: {
                id: true,
                ticketNumber: true,
                status: true,
                priority: true,
              },
            },
          },
        }),
        this.prisma.conversation.count({ where }),
      ]);

      return {
        conversations,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching conversations:', error);
      throw error;
    }
  }

  async getConversationById(conversationId: string, userId?: string) {
    const where: any = { id: conversationId };
    if (userId) where.userId = userId;

    const conversation = await this.prisma.conversation.findFirst({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatar: true,
            kycTier: true,
          },
        },
        ticket: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async getConversationMessages(
    conversationId: string,
    options: FindMessagesDto,
    userId?: string,
  ) {
    const { page = 1, limit = 50 } = options;

    // Verify conversation exists and user has access
    const conversation = await this.prisma.conversation.findFirst({
      where: userId ? { id: conversationId, userId } : { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  // ============================================
  // MESSAGE MANAGEMENT
  // ============================================

  async sendMessage(
    conversationId: string,
    dto: CreateMessageDto,
    senderId: string,
    senderType: SenderType = SenderType.USER,
  ) {
    try {
      // Verify conversation exists
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      // Check if conversation is ended
      if (conversation.status === ConversationStatus.ENDED) {
        throw new BadRequestException('Conversation has ended');
      }

      // Create message
      const message = await this.prisma.message.create({
        data: {
          conversationId,
          senderType: dto.senderType || senderType,
          senderId,
          content: dto.content,
          attachments: dto.attachments || undefined,
          metadata: dto.metadata || undefined,
        },
      });

      // Update conversation
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessagePreview:
            dto.content.length > 100
              ? dto.content.substring(0, 100) + '...'
              : dto.content,
          updatedAt: new Date(),
          unreadCount:
            senderType === SenderType.USER
              ? { increment: 0 } // Don't increment for user messages
              : { increment: 1 }, // Increment for agent/bot messages
        },
      });

      this.logger.log(
        `Message sent in conversation ${conversationId} by ${senderType}`,
      );

      return message;
    } catch (error) {
      this.logger.error('Error sending message:', error);
      throw error;
    }
  }

  async markMessagesAsRead(conversationId: string, userId: string) {
    // Verify user owns the conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Mark all unread messages as read (for user - mark agent messages)
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderType: { in: [SenderType.AGENT, SenderType.BOT, SenderType.SYSTEM] },
        isRead: false,
      },
      data: { isRead: true },
    });

    // Reset unread count
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    });

    return { success: true };
  }

  // ============================================
  // TICKET MANAGEMENT
  // ============================================

  async createTicket(userId: string, dto: CreateTicketDto) {
    try {
      // Verify conversation exists and belongs to user
      const conversation = await this.prisma.conversation.findFirst({
        where: { id: dto.conversationId, userId },
        include: { ticket: true },
      });

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      if (conversation.ticket) {
        throw new BadRequestException('Ticket already exists for this conversation');
      }

      const ticket = await this.prisma.ticket.create({
        data: {
          conversationId: dto.conversationId,
          userId,
          category: dto.category,
          title: dto.title,
          priority: dto.priority || TicketPriority.MEDIUM,
          updatedAt: new Date(),
        },
      });

      // Update conversation status
      await this.prisma.conversation.update({
        where: { id: dto.conversationId },
        data: {
          status: ConversationStatus.AWAITING_AGENT,
          category: dto.category,
        },
      });

      this.logger.log(`Ticket #${ticket.ticketNumber} created for user ${userId}`);

      return ticket;
    } catch (error) {
      this.logger.error('Error creating ticket:', error);
      throw error;
    }
  }

  async getUserTickets(userId: string, options: FindTicketsDto) {
    const { page = 1, limit = 20, status, priority, category } = options;

    const where: any = { userId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;

    try {
      const [tickets, total] = await Promise.all([
        this.prisma.ticket.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            conversation: {
              select: {
                id: true,
                lastMessagePreview: true,
                unreadCount: true,
              },
            },
            assignedAgent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
        this.prisma.ticket.count({ where }),
      ]);

      return {
        tickets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching user tickets:', error);
      throw error;
    }
  }

  async getTicketById(ticketId: string, userId?: string) {
    const where: any = { id: ticketId };
    if (userId) where.userId = userId;

    const ticket = await this.prisma.ticket.findFirst({
      where,
      include: {
        conversation: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        assignedAgent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async updateTicket(ticketId: string, dto: UpdateTicketDto, agentId?: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const updateData: any = { ...dto };
    if (dto.status === TicketStatus.RESOLVED) {
      updateData.resolvedAt = new Date();
    }
    if (dto.status === TicketStatus.CLOSED) {
      updateData.closedAt = new Date();
    }

    const updatedTicket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
    });

    this.logger.log(`Ticket #${ticket.ticketNumber} updated by agent ${agentId}`);

    return updatedTicket;
  }

  async assignTicket(ticketId: string, agentId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { conversation: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Update ticket
    const updatedTicket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assignedAgentId: agentId,
        status: TicketStatus.IN_PROGRESS,
      },
    });

    // Update conversation status
    await this.prisma.conversation.update({
      where: { id: ticket.conversationId },
      data: { status: ConversationStatus.AGENT_ASSIGNED },
    });

    this.logger.log(`Ticket #${ticket.ticketNumber} assigned to agent ${agentId}`);

    return updatedTicket;
  }

  async resolveTicket(ticketId: string, agentId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { conversation: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Update ticket
    const updatedTicket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });

    // Update conversation status to awaiting rating
    await this.prisma.conversation.update({
      where: { id: ticket.conversationId },
      data: { status: ConversationStatus.AWAITING_RATING },
    });

    this.logger.log(`Ticket #${ticket.ticketNumber} resolved by agent ${agentId}`);

    return updatedTicket;
  }

  async closeTicket(ticketId: string, agentId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { conversation: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Update ticket
    const updatedTicket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.CLOSED,
        closedAt: new Date(),
      },
    });

    // End conversation
    await this.prisma.conversation.update({
      where: { id: ticket.conversationId },
      data: { status: ConversationStatus.ENDED },
    });

    this.logger.log(`Ticket #${ticket.ticketNumber} closed by agent ${agentId}`);

    return updatedTicket;
  }

  async rateConversation(
    conversationId: string,
    userId: string,
    dto: RateConversationDto,
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: { ticket: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (!conversation.ticket) {
      throw new BadRequestException('No ticket found for this conversation');
    }

    if (conversation.ticket.rating) {
      throw new BadRequestException('Conversation has already been rated');
    }

    // Update ticket with rating
    await this.prisma.ticket.update({
      where: { id: conversation.ticket.id },
      data: {
        rating: dto.rating,
        ratingComment: dto.comment,
        status: TicketStatus.CLOSED,
        closedAt: new Date(),
      },
    });

    // End conversation
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: ConversationStatus.ENDED },
    });

    this.logger.log(
      `Conversation ${conversationId} rated ${dto.rating}/5 by user ${userId}`,
    );

    return { success: true };
  }

  async closeConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: ConversationStatus.ENDED },
    });

    this.logger.log(`Conversation ${conversationId} closed by user ${userId}`);

    return { success: true };
  }

  // ============================================
  // ADMIN/AGENT METHODS
  // ============================================

  async getTicketQueue(options: FindTicketsDto) {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      category,
      assignedAgentId,
      search,
    } = options;

    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (assignedAgentId) where.assignedAgentId = assignedAgentId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    try {
      const [tickets, total, stats] = await Promise.all([
        this.prisma.ticket.findMany({
          where,
          orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
          skip: (page - 1) * limit,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true,
              },
            },
            conversation: {
              select: {
                id: true,
                lastMessagePreview: true,
                transactionId: true,
                transactionType: true,
              },
            },
            assignedAgent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
        this.prisma.ticket.count({ where }),
        this.getTicketStats(),
      ]);

      return {
        tickets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
        stats,
      };
    } catch (error) {
      this.logger.error('Error fetching ticket queue:', error);
      throw error;
    }
  }

  async getTicketStats() {
    const [open, inProgress, resolved, closed, urgent, high] = await Promise.all([
      this.prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
      this.prisma.ticket.count({ where: { status: TicketStatus.IN_PROGRESS } }),
      this.prisma.ticket.count({ where: { status: TicketStatus.RESOLVED } }),
      this.prisma.ticket.count({ where: { status: TicketStatus.CLOSED } }),
      this.prisma.ticket.count({ where: { priority: TicketPriority.URGENT } }),
      this.prisma.ticket.count({ where: { priority: TicketPriority.HIGH } }),
    ]);

    return {
      open,
      inProgress,
      resolved,
      closed,
      urgent,
      high,
      total: open + inProgress + resolved + closed,
    };
  }

  async getConversationWithUserContext(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatar: true,
            status: true,
            kycTier: true,
            createdAt: true,
            wallet: {
              select: {
                balance: true,
                currency: true,
              },
            },
          },
        },
        ticket: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 100,
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Get user's recent transactions
    const recentTransactions = await this.prisma.transaction.findMany({
      where: { userId: conversation.userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        reference: true,
        type: true,
        status: true,
        amount: true,
        description: true,
        createdAt: true,
      },
    });

    // Get user's ticket count
    const ticketCount = await this.prisma.ticket.count({
      where: { userId: conversation.userId },
    });

    return {
      ...conversation,
      userContext: {
        recentTransactions,
        ticketCount,
      },
    };
  }

  // ============================================
  // UNREAD COUNT
  // ============================================

  async getUnreadCount(userId: string) {
    const count = await this.prisma.conversation.aggregate({
      where: { userId },
      _sum: { unreadCount: true },
    });

    return { unreadCount: count._sum.unreadCount || 0 };
  }
}
