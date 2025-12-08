import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';
import { SupportService } from './support.service';
import { HelpService } from './help.service';
import { CannedResponseService } from './canned-response.service';
import { SupportGateway } from './support.gateway';
import { SupportNotificationService } from './support-notification.service';
import {
  FindTicketsDto,
  FindConversationsDto,
  FindMessagesDto,
  CreateMessageDto,
  AssignTicketDto,
  UpdateTicketDto,
  CreateHelpCollectionDto,
  UpdateHelpCollectionDto,
  CreateHelpArticleDto,
  UpdateHelpArticleDto,
  CreateCannedResponseDto,
  UpdateCannedResponseDto,
} from './dto';

@Controller('admin/support')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class SupportAdminController {
  constructor(
    private readonly supportService: SupportService,
    private readonly helpService: HelpService,
    private readonly cannedResponseService: CannedResponseService,
    private readonly supportGateway: SupportGateway,
    private readonly supportNotificationService: SupportNotificationService,
  ) {}

  // ============================================
  // DASHBOARD STATS
  // ============================================

  /**
   * Get comprehensive support statistics
   * GET /admin/support/stats
   */
  @Get('stats')
  async getSupportStats() {
    return await this.supportService.getSupportStats();
  }

  // ============================================
  // TICKET QUEUE
  // ============================================

  /**
   * Get ticket queue for agents
   * GET /admin/support/queue
   */
  @Get('queue')
  async getTicketQueue(@Query() query: FindTicketsDto) {
    return this.supportService.getTicketQueue(query);
  }

  /**
   * Get available agents for conversation transfer
   * GET /admin/support/agents
   */
  @Get('agents')
  async getAvailableAgents() {
    return await this.supportService.getAvailableAgents();
  }

  // ============================================
  // CONVERSATION MANAGEMENT
  // ============================================

  /**
   * Get all conversations (admin view)
   * GET /admin/support/conversations
   *
   * - SUPER_ADMIN and ADMIN: See all conversations
   * - SUPPORT: Only see conversations assigned to them
   */
  @Get('conversations')
  async getAllConversations(
    @GetUser('id') agentId: string,
    @GetUser('role') agentRole: string,
    @Query() query: FindConversationsDto,
  ) {
    // For SUPPORT role, filter to only their assigned conversations
    if (agentRole === UserRole.SUPPORT) {
      query.assignedAgentId = agentId;
    }

    return await this.supportService.getAllConversations(query);
  }

  /**
   * Get conversation with full user context
   * GET /admin/support/conversations/:id
   */
  @Get('conversations/:id')
  async getConversationWithContext(@Param('id') conversationId: string) {
    return this.supportService.getConversationWithUserContext(conversationId);
  }

  /**
   * Get conversation messages (agent access)
   * GET /admin/support/conversations/:id/messages
   */
  @Get('conversations/:id/messages')
  async getConversationMessages(
    @Param('id') conversationId: string,
    @Query() query: FindMessagesDto,
  ) {
    return await this.supportService.getConversationMessages(
      conversationId,
      query,
    );
  }

  /**
   * Send message as agent
   * POST /admin/support/conversations/:id/messages
   *
   * Permission rules:
   * - SUPER_ADMIN can send to any conversation
   * - Assigned agent can send to their conversation
   * - If unassigned, sending auto-assigns the conversation to the agent
   */
  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendAgentMessage(
    @GetUser('id') agentId: string,
    @GetUser('role') agentRole: string,
    @Param('id') conversationId: string,
    @Body() dto: CreateMessageDto,
  ) {
    // Get conversation with ticket to check assignment
    const conversation =
      await this.supportService.getConversationById(conversationId);
    const assignedAgentId = conversation.ticket?.assignedAgentId;

    // Check permissions
    const isSuperAdmin = agentRole === UserRole.SUPER_ADMIN;
    const isAssignedAgent = assignedAgentId === agentId;
    const isUnassigned = !assignedAgentId;

    if (!isSuperAdmin && !isAssignedAgent && !isUnassigned) {
      throw new ForbiddenException(
        'You cannot send messages to a conversation assigned to another agent',
      );
    }

    // If unassigned, auto-assign to this agent
    if (isUnassigned) {
      await this.supportService.assignConversation(conversationId, agentId);
      // Notify via WebSocket
      this.supportGateway.notifyConversationUpdate(
        conversationId,
        'AGENT_ASSIGNED',
      );
    }

    const message = await this.supportService.sendMessage(
      conversationId,
      dto,
      agentId,
      'AGENT',
    );

    // Broadcast via WebSocket
    this.supportGateway.server
      .to(`conversation:${conversationId}`)
      .emit('message:receive', {
        message,
        conversationId,
      });

    // Send push notification to user
    this.supportNotificationService.notifyNewMessage(
      conversationId,
      dto.content,
      'AGENT',
    );

    return message;
  }

  /**
   * Assign conversation to current agent
   * POST /admin/support/conversations/:id/assign
   */
  @Post('conversations/:id/assign')
  @HttpCode(HttpStatus.OK)
  async assignConversation(
    @GetUser('id') agentId: string,
    @Param('id') conversationId: string,
  ) {
    const result = await this.supportService.assignConversation(
      conversationId,
      agentId,
    );

    // Send notification to user that an agent has been assigned
    this.supportNotificationService.notifyAgentAssigned(
      conversationId,
      agentId,
    );

    // Notify via WebSocket
    this.supportGateway.notifyConversationUpdate(
      conversationId,
      'AGENT_ASSIGNED',
    );

    return result;
  }

  /**
   * Transfer conversation to another agent
   * POST /admin/support/conversations/:id/transfer
   */
  @Post('conversations/:id/transfer')
  @HttpCode(HttpStatus.OK)
  async transferConversation(
    @Param('id') conversationId: string,
    @Body() dto: { agentId: string },
  ) {
    return await this.supportService.transferConversation(
      conversationId,
      dto.agentId,
    );
  }

  /**
   * End a conversation (admin only) - Sets to AWAITING_RATING so user can rate
   * POST /admin/support/conversations/:id/end
   */
  @Post('conversations/:id/end')
  @HttpCode(HttpStatus.OK)
  async endConversation(@Param('id') conversationId: string) {
    const result = await this.supportService.endConversation(conversationId);
    // Notify via WebSocket so mobile app can show rating UI
    this.supportGateway.notifyConversationUpdate(conversationId, result.status);
    // Send push/email notification to user
    this.supportNotificationService.notifyConversationEnded(conversationId);
    return result;
  }

  // ============================================
  // TICKET MANAGEMENT
  // ============================================

  /**
   * Get ticket details (agent access)
   * GET /admin/support/tickets/:id
   */
  @Get('tickets/:id')
  async getTicket(@Param('id') ticketId: string) {
    return this.supportService.getTicketById(ticketId);
  }

  /**
   * Assign ticket to agent
   * POST /admin/support/tickets/:id/assign
   */
  @Post('tickets/:id/assign')
  @HttpCode(HttpStatus.OK)
  async assignTicket(
    @GetUser('id') agentId: string,
    @Param('id') ticketId: string,
    @Body() dto: AssignTicketDto,
  ) {
    return this.supportService.assignTicket(ticketId, dto.agentId || agentId);
  }

  /**
   * Update ticket
   * PUT /admin/support/tickets/:id
   */
  @Put('tickets/:id')
  async updateTicket(
    @GetUser('id') agentId: string,
    @Param('id') ticketId: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.supportService.updateTicket(ticketId, dto, agentId);
  }

  /**
   * Resolve ticket
   * POST /admin/support/tickets/:id/resolve
   */
  @Post('tickets/:id/resolve')
  @HttpCode(HttpStatus.OK)
  async resolveTicket(
    @GetUser('id') agentId: string,
    @Param('id') ticketId: string,
  ) {
    return this.supportService.resolveTicket(ticketId, agentId);
  }

  /**
   * Close ticket
   * POST /admin/support/tickets/:id/close
   */
  @Post('tickets/:id/close')
  @HttpCode(HttpStatus.OK)
  async closeTicket(
    @GetUser('id') agentId: string,
    @Param('id') ticketId: string,
  ) {
    return this.supportService.closeTicket(ticketId, agentId);
  }

  // ============================================
  // HELP CENTER MANAGEMENT (ADMIN ONLY)
  // ============================================

  /**
   * Get all help collections (including inactive)
   * GET /admin/support/help/collections
   */
  @Get('help/collections')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getHelpCollections() {
    return this.helpService.getCollections(false); // false = include inactive
  }

  /**
   * Get single help collection
   * GET /admin/support/help/collections/:id
   */
  @Get('help/collections/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getHelpCollection(@Param('id') collectionId: string) {
    return this.helpService.getCollectionById(collectionId);
  }

  /**
   * Create help collection
   * POST /admin/support/help/collections
   */
  @Post('help/collections')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createHelpCollection(@Body() dto: CreateHelpCollectionDto) {
    return this.helpService.createCollection(dto);
  }

  /**
   * Update help collection
   * PATCH /admin/support/help/collections/:id
   */
  @Patch('help/collections/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateHelpCollection(
    @Param('id') collectionId: string,
    @Body() dto: UpdateHelpCollectionDto,
  ) {
    return this.helpService.updateCollection(collectionId, dto);
  }

  /**
   * Delete help collection
   * DELETE /admin/support/help/collections/:id
   */
  @Delete('help/collections/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async deleteHelpCollection(@Param('id') collectionId: string) {
    return this.helpService.deleteCollection(collectionId);
  }

  /**
   * Get all help articles (with pagination and filters)
   * GET /admin/support/help/articles
   */
  @Get('help/articles')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getHelpArticles(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('collectionId') collectionId?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'DRAFT' | 'PUBLISHED',
  ) {
    return this.helpService.getArticles({
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 10,
      collectionId,
      search,
      status,
    });
  }

  /**
   * Get single help article
   * GET /admin/support/help/articles/:id
   */
  @Get('help/articles/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getHelpArticle(@Param('id') articleId: string) {
    return this.helpService.getArticleById(articleId);
  }

  /**
   * Create help article
   * POST /admin/support/help/articles
   */
  @Post('help/articles')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createHelpArticle(@Body() dto: any) {
    // Transform status to isActive for backend compatibility
    const transformedDto: CreateHelpArticleDto = {
      ...dto,
      isActive:
        dto.status === 'PUBLISHED'
          ? true
          : dto.status === 'DRAFT'
            ? false
            : dto.isActive,
    };
    delete (transformedDto as any).status;
    return this.helpService.createArticle(transformedDto);
  }

  /**
   * Update help article
   * PATCH /admin/support/help/articles/:id
   */
  @Patch('help/articles/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateHelpArticle(@Param('id') articleId: string, @Body() dto: any) {
    // Transform status to isActive for backend compatibility
    const transformedDto: UpdateHelpArticleDto = {
      ...dto,
      isActive:
        dto.status === 'PUBLISHED'
          ? true
          : dto.status === 'DRAFT'
            ? false
            : dto.isActive,
    };
    delete (transformedDto as any).status;
    return this.helpService.updateArticle(articleId, transformedDto);
  }

  /**
   * Delete help article
   * DELETE /admin/support/help/articles/:id
   */
  @Delete('help/articles/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async deleteHelpArticle(@Param('id') articleId: string) {
    return this.helpService.deleteArticle(articleId);
  }

  /**
   * Publish help article
   * POST /admin/support/help/articles/:id/publish
   */
  @Post('help/articles/:id/publish')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async publishHelpArticle(@Param('id') articleId: string) {
    return this.helpService.publishArticle(articleId);
  }

  /**
   * Unpublish help article
   * POST /admin/support/help/articles/:id/unpublish
   */
  @Post('help/articles/:id/unpublish')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async unpublishHelpArticle(@Param('id') articleId: string) {
    return this.helpService.unpublishArticle(articleId);
  }

  // ============================================
  // CANNED RESPONSES
  // ============================================

  /**
   * Get canned responses
   * GET /admin/support/canned-responses
   */
  @Get('canned-responses')
  async getCannedResponses(@Query('category') category?: string) {
    return this.cannedResponseService.findAll(category);
  }

  /**
   * Create canned response
   * POST /admin/support/canned-responses
   */
  @Post('canned-responses')
  @HttpCode(HttpStatus.CREATED)
  async createCannedResponse(
    @GetUser('id') userId: string,
    @Body() dto: CreateCannedResponseDto,
  ) {
    return this.cannedResponseService.create(userId, dto);
  }

  /**
   * Update canned response
   * PUT /admin/support/canned-responses/:id
   */
  @Put('canned-responses/:id')
  async updateCannedResponse(
    @Param('id') responseId: string,
    @Body() dto: UpdateCannedResponseDto,
  ) {
    return this.cannedResponseService.update(responseId, dto);
  }

  /**
   * Delete canned response
   * DELETE /admin/support/canned-responses/:id
   */
  @Delete('canned-responses/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async deleteCannedResponse(@Param('id') responseId: string) {
    return this.cannedResponseService.delete(responseId);
  }

  /**
   * Increment canned response usage
   * POST /admin/support/canned-responses/:id/use
   */
  @Post('canned-responses/:id/use')
  @HttpCode(HttpStatus.OK)
  async useCannedResponse(@Param('id') responseId: string) {
    return this.cannedResponseService.incrementUsage(responseId);
  }
}
