// Support System Types

export enum ConversationStatus {
  OPEN = 'OPEN',
  BOT_HANDLING = 'BOT_HANDLING',
  AWAITING_AGENT = 'AWAITING_AGENT',
  AGENT_ASSIGNED = 'AGENT_ASSIGNED',
  AWAITING_RATING = 'AWAITING_RATING',
  ENDED = 'ENDED',
}

export enum SenderType {
  USER = 'USER',
  BOT = 'BOT',
  AGENT = 'AGENT',
  SYSTEM = 'SYSTEM',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface QuickReply {
  label: string;
  value: string;
}

export interface MessageAction {
  label: string;
  action: string;
  data?: any;
}

export interface MessageMetadata {
  quickReplies?: QuickReply[];
  transactionCard?: TransactionContext;
  actions?: MessageAction[];
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: SenderType;
  senderId?: string;
  content: string;
  attachments?: string[];
  isRead: boolean;
  metadata?: MessageMetadata;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  status: ConversationStatus;
  category?: string;
  lastMessagePreview?: string;
  unreadCount: number;
  transactionId?: string;
  transactionType?: string;
  transactionContext?: TransactionContext;
  createdAt: string;
  updatedAt: string;
  ticket?: Ticket;
}

export interface Ticket {
  id: string;
  ticketNumber: number;
  conversationId: string;
  userId: string;
  category: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedAgentId?: string;
  assignedAgent?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  rating?: number;
  ratingComment?: string;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionContext {
  transactionId: string;
  transactionType: string;
  serviceProvider?: string;
  recipientNumber?: string;
  amount?: number;
  status?: string;
  errorCode?: string;
  errorMessage?: string;
  timestamp?: string;
}

export interface HelpCollection {
  id: string;
  title: string;
  description: string;
  icon?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  articles?: HelpArticle[];
  _count?: {
    articles: number;
  };
}

export interface HelpArticle {
  id: string;
  collectionId: string;
  title: string;
  content: string;
  slug: string;
  order: number;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  collection?: {
    id: string;
    title: string;
  };
}

// API Request/Response types
export interface CreateConversationRequest {
  category?: string;
  initialMessage?: string;
  transactionContext?: TransactionContext;
}

export interface CreateConversationResponse {
  conversation: Conversation;
  isExisting: boolean;
}

export interface SendMessageRequest {
  content: string;
  attachments?: string[];
  metadata?: any;
}

export interface RateConversationRequest {
  rating: number;
  comment?: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface MessagesResponse {
  data: Message[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TicketsResponse {
  tickets: Ticket[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface SearchHelpResponse {
  articles: HelpArticle[];
}
