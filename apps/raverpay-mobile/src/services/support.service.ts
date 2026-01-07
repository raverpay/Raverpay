import { apiClient } from "@/src/lib/api/client";
import { API_ENDPOINTS } from "@/src/lib/api/endpoints";
import {
  Conversation,
  ConversationsResponse,
  CreateConversationRequest,
  CreateConversationResponse,
  HelpArticle,
  HelpCollection,
  Message,
  MessagesResponse,
  RateConversationRequest,
  SendMessageRequest,
  Ticket,
  TicketsResponse,
  UnreadCountResponse,
} from "@/src/types/support";

export const supportService = {
  // ============================================
  // CONVERSATIONS
  // ============================================

  async createConversation(
    data: CreateConversationRequest
  ): Promise<CreateConversationResponse> {
    const response = await apiClient.post<CreateConversationResponse>(
      API_ENDPOINTS.SUPPORT.CONVERSATIONS,
      data
    );
    return response.data;
  },

  async getConversations(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ConversationsResponse> {
    const response = await apiClient.get<ConversationsResponse>(
      API_ENDPOINTS.SUPPORT.CONVERSATIONS,
      { params }
    );
    return response.data;
  },

  async getConversationById(conversationId: string): Promise<Conversation> {
    const response = await apiClient.get<Conversation>(
      API_ENDPOINTS.SUPPORT.CONVERSATION_DETAIL(conversationId)
    );
    return response.data;
  },

  async getConversationMessages(
    conversationId: string,
    params?: { page?: number; limit?: number }
  ): Promise<MessagesResponse> {
    const response = await apiClient.get<MessagesResponse>(
      API_ENDPOINTS.SUPPORT.CONVERSATION_MESSAGES(conversationId),
      { params }
    );
    return response.data;
  },

  async sendMessage(
    conversationId: string,
    data: SendMessageRequest
  ): Promise<Message> {
    const response = await apiClient.post<Message>(
      API_ENDPOINTS.SUPPORT.CONVERSATION_MESSAGES(conversationId),
      data
    );
    return response.data;
  },

  async markMessagesAsRead(
    conversationId: string
  ): Promise<{ success: boolean }> {
    const response = await apiClient.put<{ success: boolean }>(
      API_ENDPOINTS.SUPPORT.CONVERSATION_READ(conversationId)
    );
    return response.data;
  },

  async rateConversation(
    conversationId: string,
    data: RateConversationRequest
  ): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>(
      API_ENDPOINTS.SUPPORT.CONVERSATION_RATE(conversationId),
      data
    );
    return response.data;
  },

  async closeConversation(
    conversationId: string
  ): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>(
      API_ENDPOINTS.SUPPORT.CONVERSATION_CLOSE(conversationId)
    );
    return response.data;
  },

  // ============================================
  // TICKETS
  // ============================================

  async getTickets(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<TicketsResponse> {
    const response = await apiClient.get<TicketsResponse>(
      API_ENDPOINTS.SUPPORT.TICKETS,
      {
        params,
      }
    );
    return response.data;
  },

  async getTicketById(ticketId: string): Promise<Ticket> {
    const response = await apiClient.get<Ticket>(
      API_ENDPOINTS.SUPPORT.TICKET_DETAIL(ticketId)
    );
    return response.data;
  },

  // ============================================
  // UNREAD COUNT
  // ============================================

  async getUnreadCount(): Promise<UnreadCountResponse> {
    const response = await apiClient.get<UnreadCountResponse>(
      API_ENDPOINTS.SUPPORT.UNREAD_COUNT
    );
    return response.data;
  },
};

export const helpService = {
  // ============================================
  // COLLECTIONS
  // ============================================

  async getCollections(): Promise<HelpCollection[]> {
    const response = await apiClient.get<HelpCollection[]>(
      API_ENDPOINTS.HELP.COLLECTIONS
    );
    return response.data;
  },

  async getCollectionById(collectionId: string): Promise<HelpCollection> {
    const response = await apiClient.get<HelpCollection>(
      API_ENDPOINTS.HELP.COLLECTION_DETAIL(collectionId)
    );
    return response.data;
  },

  // ============================================
  // ARTICLES
  // ============================================

  async getArticleById(articleId: string): Promise<HelpArticle> {
    const response = await apiClient.get<HelpArticle>(
      API_ENDPOINTS.HELP.ARTICLE_DETAIL(articleId)
    );
    return response.data;
  },

  async getArticleBySlug(slug: string): Promise<HelpArticle> {
    const response = await apiClient.get<HelpArticle>(
      API_ENDPOINTS.HELP.ARTICLE_BY_SLUG(slug)
    );
    return response.data;
  },

  async searchArticles(query: string, limit?: number): Promise<HelpArticle[]> {
    const response = await apiClient.get<HelpArticle[]>(
      API_ENDPOINTS.HELP.SEARCH,
      {
        params: { query, limit },
      }
    );
    return response.data;
  },

  async getPopularArticles(limit?: number): Promise<HelpArticle[]> {
    const response = await apiClient.get<HelpArticle[]>(
      API_ENDPOINTS.HELP.POPULAR,
      {
        params: { limit },
      }
    );
    return response.data;
  },

  async markArticleHelpful(
    articleId: string,
    helpful: boolean
  ): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>(
      API_ENDPOINTS.HELP.ARTICLE_HELPFUL(articleId),
      { helpful }
    );
    return response.data;
  },

  async incrementArticleView(articleId: string): Promise<{ success: boolean }> {
    const response = await apiClient.post<{ success: boolean }>(
      API_ENDPOINTS.HELP.ARTICLE_VIEW(articleId)
    );
    return response.data;
  },
};
