import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { Prisma } from '@prisma/client';
import {
  ConversationStatus,
  SenderType,
  TicketStatus,
  TicketPriority,
  UserRole,
  UserStatus,
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
  private readonly resend: Resend | null;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'noreply@raverpay.com';
    this.fromName =
      this.configService.get<string>('RESEND_FROM_NAME') || 'RaverPay';

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('✅ Resend client initialized for conversation emails');
    } else {
      this.resend = null;
      this.logger.warn(
        '⚠️ RESEND_API_KEY not found - Cannot send emails from conversations',
      );
    }
  }

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
            notIn: [
              ConversationStatus.ENDED,
              ConversationStatus.AWAITING_RATING,
            ],
          },
        },
      });

      // If there's a transaction context, check if it's for the same transaction
      // If different transaction, create new conversation
      if (existingConversation) {
        const hasNewTransactionContext =
          dto.transactionContext?.transactionId &&
          existingConversation.transactionId !==
            dto.transactionContext.transactionId;

        if (hasNewTransactionContext) {
          // Different transaction - create new conversation
          this.logger.log(
            `User ${userId} has new transaction context, creating new conversation`,
          );
        } else {
          // Same or no transaction - return existing conversation
          this.logger.log(
            `User ${userId} already has active conversation ${existingConversation.id}`,
          );
          return {
            conversation: existingConversation,
            isExisting: true,
          };
        }
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

      this.logger.log(
        `Conversation ${conversation.id} created for user ${userId}`,
      );

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

    // Ensure page and limit are numbers (safeguard against string values from query params)
    const pageNum =
      typeof page === 'string' ? parseInt(page, 10) : Number(page) || 1;
    const limitNum =
      typeof limit === 'string' ? parseInt(limit, 10) : Number(limit) || 20;

    const where: any = { userId };
    if (status) where.status = status;

    try {
      const [conversations, total] = await Promise.all([
        this.prisma.conversation.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
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
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasMore: pageNum * limitNum < total,
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
    try {
      const { page = 1, limit = 50 } = options;

      // Ensure page and limit are numbers (safeguard against string values from query params)
      const pageNum =
        typeof page === 'string' ? parseInt(page, 10) : Number(page) || 1;
      const limitNum =
        typeof limit === 'string' ? parseInt(limit, 10) : Number(limit) || 50;

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
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
        this.prisma.message.count({ where: { conversationId } }),
      ]);

      return {
        data: messages || [],
        meta: {
          page: pageNum,
          limit: limitNum,
          total: total || 0,
          totalPages: Math.ceil((total || 0) / limitNum),
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching messages for conversation ${conversationId}:`,
        error,
      );
      throw error;
    }
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
      // Verify conversation exists and get inbound email if linked
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          inboundEmail: true,
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

      // If agent sends a message in a conversation linked to an inbound email,
      // send an email notification to the user
      if (
        senderType === SenderType.AGENT &&
        conversation.inboundEmail &&
        conversation.user
      ) {
        this.sendEmailFromConversation(
          conversation.inboundEmail,
          conversation.user.email,
          dto.content,
          message.id,
        ).catch((error) => {
          this.logger.error(
            `Failed to send email from conversation ${conversationId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          // Don't fail the message send if email fails
        });
      }

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
        senderType: {
          in: [SenderType.AGENT, SenderType.BOT, SenderType.SYSTEM],
        },
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

  async updateConversationStatus(
    conversationId: string,
    status: ConversationStatus | string,
  ) {
    const conversation = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: status as ConversationStatus },
    });

    this.logger.log(
      `Conversation ${conversationId} status updated to ${status}`,
    );

    return conversation;
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
        throw new BadRequestException(
          'Ticket already exists for this conversation',
        );
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

      this.logger.log(
        `Ticket #${ticket.ticketNumber} created for user ${userId}`,
      );

      return ticket;
    } catch (error) {
      this.logger.error('Error creating ticket:', error);
      throw error;
    }
  }

  async getUserTickets(userId: string, options: FindTicketsDto) {
    const { page = 1, limit = 20, status, priority, category } = options;

    // Ensure page and limit are numbers (safeguard against string values from query params)
    const pageNum =
      typeof page === 'string' ? parseInt(page, 10) : Number(page) || 1;
    const limitNum =
      typeof limit === 'string' ? parseInt(limit, 10) : Number(limit) || 20;

    const where: any = { userId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;

    try {
      const [tickets, total] = await Promise.all([
        this.prisma.ticket.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
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
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasMore: pageNum * limitNum < total,
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

    this.logger.log(
      `Ticket #${ticket.ticketNumber} updated by agent ${agentId}`,
    );

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

    this.logger.log(
      `Ticket #${ticket.ticketNumber} assigned to agent ${agentId}`,
    );

    return updatedTicket;
  }

  async assignConversation(conversationId: string, agentId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { ticket: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // If conversation doesn't have a ticket, create one
    let ticket = conversation.ticket;
    if (!ticket) {
      // Create a ticket for this conversation
      ticket = await this.prisma.ticket.create({
        data: {
          conversationId: conversation.id,
          userId: conversation.userId,
          category: conversation.category || 'General',
          title: 'Support Request',
          priority: TicketPriority.MEDIUM,
        },
      });
    }

    // Update ticket assignment
    await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        assignedAgentId: agentId,
        status: TicketStatus.IN_PROGRESS,
      },
    });

    // Update conversation status
    const updatedConversation = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: ConversationStatus.AGENT_ASSIGNED },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
        ticket: {
          include: {
            assignedAgent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(
      `Conversation ${conversationId} assigned to agent ${agentId}`,
    );

    return updatedConversation;
  }

  async transferConversation(conversationId: string, agentId: string) {
    // Transfer is the same as assign, just with a different agent
    return this.assignConversation(conversationId, agentId);
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

    this.logger.log(
      `Ticket #${ticket.ticketNumber} resolved by agent ${agentId}`,
    );

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

    this.logger.log(
      `Ticket #${ticket.ticketNumber} closed by agent ${agentId}`,
    );

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

  async endConversation(conversationId: string) {
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
          },
        },
        ticket: {
          include: {
            assignedAgent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Update conversation status to AWAITING_RATING so user can rate the conversation
    const updatedConversation = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: ConversationStatus.AWAITING_RATING },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
        ticket: {
          include: {
            assignedAgent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // If there's a ticket, mark it as resolved (not closed - will close after rating)
    if (conversation.ticket) {
      await this.prisma.ticket.update({
        where: { id: conversation.ticket.id },
        data: {
          status: TicketStatus.RESOLVED,
          resolvedAt: new Date(),
        },
      });
    }

    this.logger.log(
      `Conversation ${conversationId} ended by admin - awaiting rating`,
    );

    return updatedConversation;
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

    // Ensure page and limit are numbers (safeguard against string values from query params)
    const pageNum =
      typeof page === 'string' ? parseInt(page, 10) : Number(page) || 1;
    const limitNum =
      typeof limit === 'string' ? parseInt(limit, 10) : Number(limit) || 20;

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
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
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
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasMore: pageNum * limitNum < total,
        },
        stats,
      };
    } catch (error) {
      this.logger.error('Error fetching ticket queue:', error);
      throw error;
    }
  }

  async getTicketStats() {
    const [open, inProgress, resolved, closed, urgent, high] =
      await Promise.all([
        this.prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
        this.prisma.ticket.count({
          where: { status: TicketStatus.IN_PROGRESS },
        }),
        this.prisma.ticket.count({ where: { status: TicketStatus.RESOLVED } }),
        this.prisma.ticket.count({ where: { status: TicketStatus.CLOSED } }),
        this.prisma.ticket.count({
          where: { priority: TicketPriority.URGENT },
        }),
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

  async getAllConversations(options: FindConversationsDto) {
    const { page = 1, limit = 20, status, assignedAgentId } = options;

    // Ensure page and limit are numbers (safeguard against string values from query params)
    const pageNum =
      typeof page === 'string' ? parseInt(page, 10) : Number(page) || 1;
    const limitNum =
      typeof limit === 'string' ? parseInt(limit, 10) : Number(limit) || 20;

    const where: any = {};
    if (status) where.status = status;

    // Filter by assigned agent if provided (for SUPPORT role users)
    if (assignedAgentId) {
      where.ticket = {
        assignedAgentId,
      };
    }

    try {
      const [conversations, total] = await Promise.all([
        this.prisma.conversation.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                avatar: true,
              },
            },
            ticket: {
              select: {
                id: true,
                ticketNumber: true,
                status: true,
                priority: true,
                assignedAgent: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.conversation.count({ where }),
      ]);

      // Map conversations to include assignedAgent at the top level for frontend compatibility
      const mappedConversations = conversations.map((conv) => ({
        ...conv,
        assignedAgent: conv.ticket?.assignedAgent || null,
        assignedAgentId: conv.ticket?.assignedAgent?.id || null,
      }));

      return {
        data: mappedConversations,
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      this.logger.error('Error fetching all conversations:', error);
      throw error;
    }
  }

  async getSupportStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Ticket stats
      const [
        openTickets,
        inProgressTickets,
        resolvedToday,
        ticketsByPriority,
        ticketsByCategory,
      ] = await Promise.all([
        this.prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
        this.prisma.ticket.count({
          where: { status: TicketStatus.IN_PROGRESS },
        }),
        this.prisma.ticket.count({
          where: {
            status: TicketStatus.RESOLVED,
            resolvedAt: { gte: today },
          },
        }),
        this.prisma.ticket.groupBy({
          by: ['priority'],
          where: {
            status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] },
          },
          _count: true,
        }),
        this.prisma.ticket.groupBy({
          by: ['category'],
          where: {
            status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] },
          },
          _count: true,
        }),
      ]);

      // Conversation stats
      const [activeConversations, waitingForAgent, conversationsByStatus] =
        await Promise.all([
          this.prisma.conversation.count({
            where: {
              status: ConversationStatus.AGENT_ASSIGNED,
            },
          }),
          this.prisma.conversation.count({
            where: {
              status: ConversationStatus.AWAITING_AGENT,
            },
          }),
          this.prisma.conversation.groupBy({
            by: ['status'],
            _count: true,
          }),
        ]);

      // Calculate average response time (time from conversation creation to first agent message)
      const conversationsWithFirstResponse =
        await this.prisma.conversation.findMany({
          where: {
            status: { not: ConversationStatus.BOT_HANDLING },
            messages: {
              some: {
                senderType: SenderType.AGENT,
              },
            },
          },
          include: {
            messages: {
              where: {
                senderType: SenderType.AGENT,
              },
              orderBy: { createdAt: 'asc' },
              take: 1,
            },
          },
        });

      let totalResponseTime = 0;
      let responseCount = 0;
      conversationsWithFirstResponse.forEach((conv) => {
        if (conv.messages.length > 0) {
          const responseTime =
            conv.messages[0].createdAt.getTime() - conv.createdAt.getTime();
          totalResponseTime += responseTime;
          responseCount++;
        }
      });
      const avgResponseTime =
        responseCount > 0
          ? Math.round(totalResponseTime / responseCount / 1000 / 60) // Convert to minutes
          : 0;

      // Calculate average resolution time (time from ticket creation to resolution)
      const resolvedTickets = await this.prisma.ticket.findMany({
        where: {
          status: TicketStatus.RESOLVED,
          resolvedAt: { not: null },
        },
        select: {
          createdAt: true,
          resolvedAt: true,
        },
      });

      let totalResolutionTime = 0;
      let resolutionCount = 0;
      resolvedTickets.forEach((ticket) => {
        if (ticket.resolvedAt) {
          const resolutionTime =
            ticket.resolvedAt.getTime() - ticket.createdAt.getTime();
          totalResolutionTime += resolutionTime;
          resolutionCount++;
        }
      });
      const avgResolutionTime =
        resolutionCount > 0
          ? Math.round(totalResolutionTime / resolutionCount / 1000 / 60 / 60) // Convert to hours
          : 0;

      // Calculate CSAT score (average rating from tickets)
      const ratedTickets = await this.prisma.ticket.aggregate({
        where: {
          rating: { not: null },
        },
        _avg: {
          rating: true,
        },
      });
      const csatScore = ratedTickets._avg.rating || 0;

      // Format tickets by priority
      const ticketsByPriorityMap: Record<TicketPriority, number> = {
        [TicketPriority.LOW]: 0,
        [TicketPriority.MEDIUM]: 0,
        [TicketPriority.HIGH]: 0,
        [TicketPriority.URGENT]: 0,
      };
      ticketsByPriority.forEach((item) => {
        ticketsByPriorityMap[item.priority] = item._count;
      });

      // Format tickets by category
      const ticketsByCategoryMap: Record<string, number> = {};
      ticketsByCategory.forEach((item) => {
        ticketsByCategoryMap[item.category] = item._count;
      });

      // Format conversations by status
      const conversationsByStatusMap: Record<ConversationStatus, number> = {
        [ConversationStatus.OPEN]: 0,
        [ConversationStatus.BOT_HANDLING]: 0,
        [ConversationStatus.AWAITING_AGENT]: 0,
        [ConversationStatus.AGENT_ASSIGNED]: 0,
        [ConversationStatus.AWAITING_RATING]: 0,
        [ConversationStatus.ENDED]: 0,
      };
      conversationsByStatus.forEach((item) => {
        conversationsByStatusMap[item.status] = item._count;
      });

      return {
        openTickets,
        inProgressTickets,
        resolvedToday,
        avgResponseTime,
        avgResolutionTime,
        csatScore,
        activeConversations,
        waitingForAgent,
        ticketsByPriority: ticketsByPriorityMap,
        ticketsByCategory: ticketsByCategoryMap,
        conversationsByStatus: conversationsByStatusMap,
      };
    } catch (error) {
      this.logger.error('Error fetching support stats:', error);
      throw error;
    }
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
            wallets: {
              where: {
                type: 'NAIRA',
              },
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

  // ============================================
  // AGENT MANAGEMENT
  // ============================================

  async getAvailableAgents() {
    try {
      // Get all users with support/admin roles
      const agents = await this.prisma.user.findMany({
        where: {
          role: {
            in: [UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN],
          },
          status: UserStatus.ACTIVE,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      });

      // Get active chat counts for each agent
      const agentsWithCounts = await Promise.all(
        agents.map(async (agent) => {
          // Count active tickets assigned to this agent
          // Active = OPEN or IN_PROGRESS status
          const activeChats = await this.prisma.ticket.count({
            where: {
              assignedAgentId: agent.id,
              status: {
                in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS],
              },
            },
          });

          return {
            id: agent.id,
            firstName: agent.firstName,
            lastName: agent.lastName,
            activeChats,
          };
        }),
      );

      return agentsWithCounts;
    } catch (error) {
      this.logger.error('Error fetching available agents:', error);
      throw error;
    }
  }

  /**
   * Send email notification when agent sends a message in a conversation
   * that was created from an inbound email
   */
  private async sendEmailFromConversation(
    inboundEmail: any,
    userEmail: string,
    messageContent: string,
    messageId: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn('Cannot send email - Resend client not initialized');
      return;
    }

    try {
      const fromEmail = inboundEmail.targetEmail || this.fromEmail;
      const subject = `Re: ${inboundEmail.subject || 'No Subject'}`;

      // Build email headers for threading
      const headers: Record<string, string> = {
        'In-Reply-To':
          inboundEmail.messageId || `<${inboundEmail.emailId}@raverpay.com>`,
      };

      // Get all previous message IDs from the conversation for References header
      const previousMessages = await this.prisma.message.findMany({
        where: {
          conversationId: inboundEmail.conversationId,
          senderType: 'AGENT',
          metadata: {
            not: Prisma.JsonNull,
          },
        },
        select: {
          metadata: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Build References header from previous email message IDs
      const references: string[] = [];
      if (inboundEmail.messageId) {
        references.push(inboundEmail.messageId);
      }
      previousMessages.forEach((msg) => {
        const resendEmailId = (msg.metadata as any)?.resendEmailId;
        if (resendEmailId) {
          // We'd need to fetch the messageId from Resend, but for now just use what we have
          // This is a simplified version - ideally we'd store messageId from Resend responses
        }
      });

      if (references.length > 0) {
        headers['References'] = references.join(' ');
      }

      // Send email via Resend
      const emailResult = await this.resend.emails.send({
        from: `${this.fromName} <${fromEmail}>`,
        to: [userEmail],
        subject,
        html: messageContent,
        text: messageContent.replace(/<[^>]*>/g, ''), // Strip HTML for plain text
        headers,
        replyTo: fromEmail,
      });

      if (emailResult.error) {
        this.logger.error(
          `Failed to send email from conversation: ${emailResult.error.message}`,
        );
        return;
      }

      // Update message metadata with Resend email ID for future threading
      if (emailResult.data?.id) {
        const currentMessage = await this.prisma.message.findUnique({
          where: { id: messageId },
          select: { metadata: true },
        });

        await this.prisma.message.update({
          where: { id: messageId },
          data: {
            metadata: {
              ...((currentMessage?.metadata as any) || {}),
              resendEmailId: emailResult.data.id,
              emailSent: true,
            },
          },
        });
      }

      this.logger.log(
        `✅ Email sent to ${userEmail} from conversation (Resend ID: ${emailResult.data?.id})`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending email from conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
