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
  messages?: Message[]; // Optional messages array for email detail pages
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
  emailSent?: boolean;
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

// ============================================
// INBOUND EMAIL TYPES
// ============================================

export enum UserRole {
  USER = 'USER',
  SUPPORT = 'SUPPORT',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export interface InboundEmail {
  id: string;
  emailId: string;
  messageId?: string;
  from: string;
  fromName?: string;
  to: string;
  cc: string[];
  bcc: string[];
  subject: string;
  textBody?: string;
  htmlBody?: string;
  targetRole?: UserRole;
  targetEmail: string;
  ticketId?: string;
  ticket?: Ticket;
  conversationId?: string;
  conversation?: Conversation;
  userId?: string;
  user?: User;
  attachments?: Array<{
    id: string;
    filename: string;
    content_type: string;
    content_disposition: string;
    content_id?: string;
  }>;
  isProcessed: boolean;
  processedAt?: string;
  processingError?: string;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailStats {
  total: number;
  unprocessed: number;
  byRole: Array<{
    role: UserRole | null;
    count: number;
  }>;
  byEmail: Array<{
    email: string;
    count: number;
  }>;
}
