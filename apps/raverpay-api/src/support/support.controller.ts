import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { SupportService } from './support.service';
import { BotService } from './bot.service';
import { SupportGateway } from './support.gateway';
import { SenderType } from '@prisma/client';
import {
  CreateConversationDto,
  CreateMessageDto,
  FindConversationsDto,
  FindMessagesDto,
  FindTicketsDto,
  RateConversationDto,
} from './dto';

@ApiTags('Support')
@ApiBearerAuth()
@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(
    private readonly supportService: SupportService,
    private readonly botService: BotService,
    private readonly supportGateway: SupportGateway,
  ) {}

  // ============================================
  // CONVERSATIONS
  // ============================================

  /**
   * Start a new conversation or return existing active one
   * POST /support/conversations
   * If it's a new conversation, the bot will send a greeting with categories
   */
  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create Conversation',
    description: 'Start a new support conversation',
  })
  @ApiResponse({ status: 201, description: 'Conversation created' })
  async createConversation(
    @GetUser('id') userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    const result = await this.supportService.createConversation(userId, dto);

    // If this is a new conversation, send bot greeting with categories
    if (!result.isExisting) {
      const conversationId = result.conversation.id;

      // Generate bot greeting (with transaction context if provided)
      const botGreeting = await this.botService.generateGreeting(
        conversationId,
        userId,
        dto.transactionContext,
      );

      // Save the bot greeting message
      const botMessage = await this.supportService.sendMessage(
        conversationId,
        {
          content: botGreeting.content,
          metadata: botGreeting.metadata,
        },
        'BOT',
        SenderType.BOT,
      );

      // Update conversation status to BOT_HANDLING
      await this.supportService.updateConversationStatus(
        conversationId,
        'BOT_HANDLING',
      );

      // Broadcast via WebSocket so the mobile app receives it immediately
      this.supportGateway.server
        .to(`conversation:${conversationId}`)
        .emit('message:receive', {
          message: botMessage,
          conversationId,
        });
    }

    return result;
  }

  /**
   * Get user's conversations
   * GET /support/conversations
   */
  @Get('conversations')
  @ApiOperation({
    summary: 'Get Conversations',
    description: 'List user conversations',
  })
  @ApiResponse({ status: 200, description: 'Conversations retrieved' })
  async getConversations(
    @GetUser('id') userId: string,
    @Query() query: FindConversationsDto,
  ) {
    return this.supportService.getConversations(userId, query);
  }

  /**
   * Get a specific conversation
   * GET /support/conversations/:id
   */
  @Get('conversations/:id')
  @ApiOperation({
    summary: 'Get Conversation',
    description: 'Get details of a specific conversation',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Conversation retrieved' })
  async getConversation(
    @GetUser('id') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.supportService.getConversationById(conversationId, userId);
  }

  /**
   * Get messages in a conversation
   * GET /support/conversations/:id/messages
   */
  @Get('conversations/:id/messages')
  @ApiOperation({
    summary: 'Get Messages',
    description: 'Get messages in a conversation',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Messages retrieved' })
  async getConversationMessages(
    @GetUser('id') userId: string,
    @Param('id') conversationId: string,
    @Query() query: FindMessagesDto,
  ) {
    return await this.supportService.getConversationMessages(
      conversationId,
      query,
      userId,
    );
  }

  /**
   * Send a message in a conversation (REST fallback for WebSocket)
   * POST /support/conversations/:id/messages
   * Also triggers bot processing if conversation is in bot-handling mode
   */
  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Send Message',
    description: 'Send a message in a conversation',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  async sendMessage(
    @GetUser('id') userId: string,
    @Param('id') conversationId: string,
    @Body() dto: CreateMessageDto,
  ) {
    // Save user message
    const message = await this.supportService.sendMessage(
      conversationId,
      dto,
      userId,
    );

    // Broadcast via WebSocket
    this.supportGateway.server
      .to(`conversation:${conversationId}`)
      .emit('message:receive', {
        message,
        conversationId,
      });

    // Check if bot should respond
    const conversation = await this.supportService.getConversationById(
      conversationId,
      userId,
    );

    if (
      conversation.status === 'OPEN' ||
      conversation.status === 'BOT_HANDLING'
    ) {
      // Extract the quick reply value from metadata if present, otherwise use content
      const messageForBot = dto.metadata?.quickReplyValue || dto.content;

      const botResponse = await this.botService.processMessage(
        conversationId,
        messageForBot,
        userId,
      );

      if (botResponse) {
        // Save and broadcast bot response
        const botMessage = await this.supportService.sendMessage(
          conversationId,
          {
            content: botResponse.content,
            metadata: botResponse.metadata,
          },
          'BOT',
          SenderType.BOT,
        );

        // Broadcast bot message via WebSocket
        this.supportGateway.server
          .to(`conversation:${conversationId}`)
          .emit('message:receive', {
            message: botMessage,
            conversationId,
          });
      }
    }

    return message;
  }

  /**
   * Mark messages as read
   * PUT /support/conversations/:id/read
   */
  @Put('conversations/:id/read')
  @ApiOperation({
    summary: 'Mark Read',
    description: 'Mark conversation messages as read',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  async markAsRead(
    @GetUser('id') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.supportService.markMessagesAsRead(conversationId, userId);
  }

  /**
   * Rate a conversation after resolution
   * POST /support/conversations/:id/rate
   */
  @Post('conversations/:id/rate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rate Conversation',
    description: 'Rate a closed conversation',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Conversation rated' })
  async rateConversation(
    @GetUser('id') userId: string,
    @Param('id') conversationId: string,
    @Body() dto: RateConversationDto,
  ) {
    return this.supportService.rateConversation(conversationId, userId, dto);
  }

  /**
   * Close a conversation
   * POST /support/conversations/:id/close
   */
  @Post('conversations/:id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Close Conversation',
    description: 'Close an active conversation',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Conversation closed' })
  async closeConversation(
    @GetUser('id') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.supportService.closeConversation(conversationId, userId);
  }

  // ============================================
  // TICKETS
  // ============================================

  /**
   * Get user's tickets
   * GET /support/tickets
   */
  @Get('tickets')
  @ApiOperation({
    summary: 'Get Tickets',
    description: 'Get user support tickets',
  })
  @ApiResponse({ status: 200, description: 'Tickets retrieved' })
  async getUserTickets(
    @GetUser('id') userId: string,
    @Query() query: FindTicketsDto,
  ) {
    return this.supportService.getUserTickets(userId, query);
  }

  /**
   * Get a specific ticket
   * GET /support/tickets/:id
   */
  @Get('tickets/:id')
  @ApiOperation({
    summary: 'Get Ticket',
    description: 'Get details of a specific ticket',
  })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({ status: 200, description: 'Ticket retrieved' })
  async getTicket(
    @GetUser('id') userId: string,
    @Param('id') ticketId: string,
  ) {
    return this.supportService.getTicketById(ticketId, userId);
  }

  // ============================================
  // UNREAD COUNT
  // ============================================

  /**
   * Get unread message count
   * GET /support/unread-count
   */
  @Get('unread-count')
  @ApiOperation({
    summary: 'Get Unread Count',
    description: 'Get count of unread messages',
  })
  @ApiResponse({ status: 200, description: 'Count retrieved' })
  async getUnreadCount(@GetUser('id') userId: string) {
    return this.supportService.getUnreadCount(userId);
  }
}
