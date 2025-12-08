import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupportService } from './support.service';
import { BotService } from './bot.service';
import { SenderType } from '@prisma/client';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*', // Configure appropriately for production
  },
  namespace: '/support',
})
export class SupportGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SupportGateway.name);
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(
    private readonly jwtService: JwtService,
    private readonly supportService: SupportService,
    private readonly botService: BotService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Support WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn('WebSocket connection rejected: No token provided');
        client.disconnect();
        return;
      }

      // Verify JWT
      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.userRole = payload.role;

      // Store connection
      this.connectedUsers.set(payload.sub, client.id);

      this.logger.log(`Client connected: ${client.id} (User: ${payload.sub})`);

      // Join user's personal room
      client.join(`user:${payload.sub}`);

      // If agent, join agent room
      if (['SUPPORT', 'ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
        client.join('agents');
      }
    } catch (error) {
      this.logger.error('WebSocket authentication failed:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ============================================
  // CONVERSATION EVENTS
  // ============================================

  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const { conversationId } = data;

    try {
      // Verify user has access to conversation
      const isAgent = ['SUPPORT', 'ADMIN', 'SUPER_ADMIN'].includes(
        client.userRole || '',
      );

      const conversation = await this.supportService.getConversationById(
        conversationId,
        isAgent ? undefined : client.userId,
      );

      // Join conversation room
      client.join(`conversation:${conversationId}`);

      this.logger.log(
        `User ${client.userId} joined conversation ${conversationId}`,
      );

      return { success: true, conversation };
    } catch (error) {
      this.logger.error('Error joining conversation:', error);
      return { success: false, error: 'Failed to join conversation' };
    }
  }

  @SubscribeMessage('conversation:leave')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const { conversationId } = data;
    client.leave(`conversation:${conversationId}`);

    this.logger.log(
      `User ${client.userId} left conversation ${conversationId}`,
    );

    return { success: true };
  }

  // ============================================
  // MESSAGE EVENTS
  // ============================================

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      conversationId: string;
      content: string;
      attachments?: string[];
      metadata?: any;
    },
  ) {
    const { conversationId, content, attachments, metadata } = data;

    try {
      const isAgent = ['SUPPORT', 'ADMIN', 'SUPER_ADMIN'].includes(
        client.userRole || '',
      );

      const senderType = isAgent ? SenderType.AGENT : SenderType.USER;

      // For agents, validate they have permission to send messages
      if (isAgent) {
        const conversation =
          await this.supportService.getConversationById(conversationId);
        const assignedAgentId = conversation.ticket?.assignedAgentId;
        const isSuperAdmin = client.userRole === 'SUPER_ADMIN';
        const isAssignedAgent = assignedAgentId === client.userId;
        const isUnassigned = !assignedAgentId;

        if (!isSuperAdmin && !isAssignedAgent && !isUnassigned) {
          return {
            success: false,
            error:
              'You cannot send messages to a conversation assigned to another agent',
          };
        }

        // Auto-assign if unassigned
        if (isUnassigned) {
          await this.supportService.assignConversation(
            conversationId,
            client.userId!,
          );
          this.notifyConversationUpdate(conversationId, 'AGENT_ASSIGNED');
        }
      }

      // Save message
      const message = await this.supportService.sendMessage(
        conversationId,
        { content, attachments, metadata },
        client.userId!,
        senderType,
      );

      // Broadcast to conversation room
      this.server.to(`conversation:${conversationId}`).emit('message:receive', {
        message,
        conversationId,
      });

      // If user message, trigger bot response
      if (senderType === SenderType.USER) {
        // Extract the quick reply value from metadata if present, otherwise use content
        const messageForBot = metadata?.quickReplyValue || content;
        // Process with bot (async)
        this.processBotResponse(conversationId, messageForBot, client.userId!);
      }

      return { success: true, message };
    } catch (error) {
      this.logger.error('Error sending message:', error);
      return { success: false, error: 'Failed to send message' };
    }
  }

  @SubscribeMessage('message:read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const { conversationId } = data;

    try {
      await this.supportService.markMessagesAsRead(
        conversationId,
        client.userId!,
      );

      return { success: true };
    } catch (error) {
      this.logger.error('Error marking messages as read:', error);
      return { success: false, error: 'Failed to mark as read' };
    }
  }

  // ============================================
  // TYPING INDICATORS
  // ============================================

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const { conversationId } = data;
    const isAgent = ['SUPPORT', 'ADMIN', 'SUPER_ADMIN'].includes(
      client.userRole || '',
    );

    client.to(`conversation:${conversationId}`).emit('typing:start', {
      conversationId,
      userId: client.userId,
      isAgent,
    });

    return { success: true };
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const { conversationId } = data;
    const isAgent = ['SUPPORT', 'ADMIN', 'SUPER_ADMIN'].includes(
      client.userRole || '',
    );

    client.to(`conversation:${conversationId}`).emit('typing:stop', {
      conversationId,
      userId: client.userId,
      isAgent,
    });

    return { success: true };
  }

  // ============================================
  // AGENT NOTIFICATIONS
  // ============================================

  notifyAgents(event: string, data: any) {
    this.server.to('agents').emit(event, data);
  }

  notifyUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Notify conversation participants about status changes
  notifyConversationUpdate(conversationId: string, status: string) {
    this.server
      .to(`conversation:${conversationId}`)
      .emit('conversation:updated', {
        conversationId,
        status,
      });
  }

  // ============================================
  // BOT INTEGRATION
  // ============================================

  private async processBotResponse(
    conversationId: string,
    userMessage: string,
    userId: string,
  ) {
    try {
      // Check if bot should respond
      const conversation =
        await this.supportService.getConversationById(conversationId);

      // Only bot handles if no agent assigned
      if (
        conversation.status === 'OPEN' ||
        conversation.status === 'BOT_HANDLING'
      ) {
        const botResponse = await this.botService.processMessage(
          conversationId,
          userMessage,
          userId,
        );

        if (botResponse) {
          // Save bot message
          const message = await this.supportService.sendMessage(
            conversationId,
            {
              content: botResponse.content,
              metadata: botResponse.metadata,
            },
            'BOT',
            SenderType.BOT,
          );

          // Broadcast bot message
          this.server
            .to(`conversation:${conversationId}`)
            .emit('message:receive', {
              message,
              conversationId,
            });
        }
      }
    } catch (error) {
      this.logger.error('Error processing bot response:', error);
    }
  }
}
