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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { SupportService } from './support.service';
import {
  CreateConversationDto,
  CreateMessageDto,
  FindConversationsDto,
  FindMessagesDto,
  FindTicketsDto,
  RateConversationDto,
} from './dto';

@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // ============================================
  // CONVERSATIONS
  // ============================================

  /**
   * Start a new conversation or return existing active one
   * POST /support/conversations
   */
  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  async createConversation(
    @GetUser('id') userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.supportService.createConversation(userId, dto);
  }

  /**
   * Get user's conversations
   * GET /support/conversations
   */
  @Get('conversations')
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
   */
  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @GetUser('id') userId: string,
    @Param('id') conversationId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.supportService.sendMessage(conversationId, dto, userId);
  }

  /**
   * Mark messages as read
   * PUT /support/conversations/:id/read
   */
  @Put('conversations/:id/read')
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
  async getUnreadCount(@GetUser('id') userId: string) {
    return this.supportService.getUnreadCount(userId);
  }
}
