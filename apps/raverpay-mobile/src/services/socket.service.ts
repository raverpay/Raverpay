import { config } from '@/src/constants/config';
import { useAuthStore } from '@/src/store/auth.store';
import { Message } from '@/src/types/support';
import { io, Socket } from 'socket.io-client';

type MessageHandler = (message: Message) => void;
type TypingHandler = (data: { conversationId: string; isTyping: boolean }) => void;
type ConversationUpdateHandler = (data: { conversationId: string; status: string }) => void;

class SocketService {
  private socket: Socket | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private typingHandlers: Map<string, TypingHandler[]> = new Map();
  private conversationUpdateHandlers: Map<string, ConversationUpdateHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): void {
    const token = useAuthStore.getState().accessToken;

    if (!token) {
      console.log('[Socket] No auth token, skipping connection');
      return;
    }

    if (this.socket?.connected) {
      console.log('[Socket] Already connected');
      return;
    }

    // Get base URL without /api suffix for WebSocket connection
    const wsUrl = config.API_BASE_URL?.replace('/api', '') || '';

    console.log('[Socket] Connecting to:', wsUrl);

    // Connect to the /support namespace
    this.socket = io(`${wsUrl}/support`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupListeners();
  }

  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('[Socket] Max reconnection attempts reached');
        this.disconnect();
      }
    });

    // Listen for new messages - gateway sends { message, conversationId }
    this.socket.on('message:receive', (data: { message: Message; conversationId: string }) => {
      console.log('[Socket] Message received:', data.message?.id);
      const handlers =
        this.messageHandlers.get(data.conversationId) ||
        this.messageHandlers.get(data.message?.conversationId) ||
        [];
      handlers.forEach((handler) => handler(data.message));
    });

    // Listen for typing indicators - gateway sends typing:start and typing:stop
    this.socket.on(
      'typing:start',
      (data: { conversationId: string; userId: string; isAgent: boolean }) => {
        console.log('[Socket] Typing start:', data.conversationId);
        const handlers = this.typingHandlers.get(data.conversationId) || [];
        handlers.forEach((handler) =>
          handler({ conversationId: data.conversationId, isTyping: true }),
        );
      },
    );

    this.socket.on(
      'typing:stop',
      (data: { conversationId: string; userId: string; isAgent: boolean }) => {
        console.log('[Socket] Typing stop:', data.conversationId);
        const handlers = this.typingHandlers.get(data.conversationId) || [];
        handlers.forEach((handler) =>
          handler({ conversationId: data.conversationId, isTyping: false }),
        );
      },
    );

    // Listen for conversation updates
    this.socket.on('conversation:updated', (data: { conversationId: string; status: string }) => {
      console.log('[Socket] Conversation updated:', data);
      const handlers = this.conversationUpdateHandlers.get(data.conversationId) || [];
      handlers.forEach((handler) => handler(data));
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.messageHandlers.clear();
      this.typingHandlers.clear();
      this.conversationUpdateHandlers.clear();
      console.log('[Socket] Disconnected manually');
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Join a conversation room
  joinConversation(conversationId: string): void {
    if (!this.socket?.connected) {
      console.log('[Socket] Not connected, cannot join conversation');
      return;
    }

    this.socket.emit('conversation:join', { conversationId });
    console.log('[Socket] Joined conversation:', conversationId);
  }

  // Leave a conversation room
  leaveConversation(conversationId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('conversation:leave', { conversationId });
    this.messageHandlers.delete(conversationId);
    this.typingHandlers.delete(conversationId);
    this.conversationUpdateHandlers.delete(conversationId);
    console.log('[Socket] Left conversation:', conversationId);
  }

  // Send a message via WebSocket
  sendMessage(conversationId: string, content: string, attachments?: string[]): void {
    if (!this.socket?.connected) {
      console.log('[Socket] Not connected, cannot send message');
      return;
    }

    this.socket.emit('message:send', {
      conversationId,
      content,
      attachments,
    });
  }

  // Send typing indicator
  sendTyping(conversationId: string, isTyping: boolean): void {
    if (!this.socket?.connected) return;

    this.socket.emit(isTyping ? 'typing:start' : 'typing:stop', {
      conversationId,
    });
  }

  // Register message handler for a conversation
  onMessage(conversationId: string, handler: MessageHandler): () => void {
    const handlers = this.messageHandlers.get(conversationId) || [];
    handlers.push(handler);
    this.messageHandlers.set(conversationId, handlers);

    // Return unsubscribe function
    return () => {
      const currentHandlers = this.messageHandlers.get(conversationId) || [];
      const index = currentHandlers.indexOf(handler);
      if (index > -1) {
        currentHandlers.splice(index, 1);
        this.messageHandlers.set(conversationId, currentHandlers);
      }
    };
  }

  // Register typing handler for a conversation
  onTyping(conversationId: string, handler: TypingHandler): () => void {
    const handlers = this.typingHandlers.get(conversationId) || [];
    handlers.push(handler);
    this.typingHandlers.set(conversationId, handlers);

    // Return unsubscribe function
    return () => {
      const currentHandlers = this.typingHandlers.get(conversationId) || [];
      const index = currentHandlers.indexOf(handler);
      if (index > -1) {
        currentHandlers.splice(index, 1);
        this.typingHandlers.set(conversationId, currentHandlers);
      }
    };
  }

  // Register conversation update handler for a conversation
  onConversationUpdate(conversationId: string, handler: ConversationUpdateHandler): () => void {
    const handlers = this.conversationUpdateHandlers.get(conversationId) || [];
    handlers.push(handler);
    this.conversationUpdateHandlers.set(conversationId, handlers);

    // Return unsubscribe function
    return () => {
      const currentHandlers = this.conversationUpdateHandlers.get(conversationId) || [];
      const index = currentHandlers.indexOf(handler);
      if (index > -1) {
        currentHandlers.splice(index, 1);
        this.conversationUpdateHandlers.set(conversationId, currentHandlers);
      }
    };
  }
}

// Export singleton instance
export const socketService = new SocketService();
