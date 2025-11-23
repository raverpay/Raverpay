// Support System Types

export enum ConversationStatus {
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

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profilePicture?: string;
}

export interface Conversation {
  id: string;
  userId: string;
  user: User;
  status: ConversationStatus;
  category?: string;
  assignedAgentId?: string;
  assignedAgent?: User;
  transactionContext?: TransactionContext;
  lastMessagePreview?: string;
  unreadCount: number;
  rating?: number;
  ratingComment?: string;
  ticket?: Ticket;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: SenderType;
  senderId?: string;
  sender?: User;
  content: string;
  attachments?: string[];
  metadata?: MessageMetadata;
  isRead: boolean;
  createdAt: string;
}

export interface MessageMetadata {
  quickReplies?: QuickReply[];
  action?: MessageAction;
  transactionRef?: string;
}

export interface QuickReply {
  label: string;
  value: string;
}

export interface MessageAction {
  type: string;
  label: string;
  data?: Record<string, unknown>;
}

export interface TransactionContext {
  transactionId?: string;
  transactionType?: string;
  amount?: number;
  status?: string;
  reference?: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  userId: string;
  user: User;
  conversationId?: string;
  conversation?: Conversation;
  title: string;
  description: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedAgentId?: string;
  assignedAgent?: User;
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HelpCollection {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  order: number;
  _count?: {
    articles: number;
  };
  articles?: HelpArticle[];
  createdAt: string;
  updatedAt: string;
}

export interface HelpArticle {
  id: string;
  collectionId: string;
  collection?: HelpCollection;
  title: string;
  slug: string;
  content: string;
  status: 'DRAFT' | 'PUBLISHED';
  order: number;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  shortcut?: string;
  createdById: string;
  createdBy?: User;
  createdAt: string;
  updatedAt: string;
}

export interface SupportStats {
  openTickets: number;
  inProgressTickets: number;
  resolvedToday: number;
  avgResponseTime: number; // in minutes
  avgResolutionTime: number; // in hours
  csatScore: number; // 0-5
  activeConversations: number;
  waitingForAgent: number;
  ticketsByPriority: Record<TicketPriority, number>;
  ticketsByCategory: Record<string, number>;
  conversationsByStatus: Record<ConversationStatus, number>;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
