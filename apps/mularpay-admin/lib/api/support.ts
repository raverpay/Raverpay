import apiClient from '../api-client';
import {
  Conversation,
  ConversationStatus,
  Ticket,
  TicketStatus,
  TicketPriority,
  Message,
  CannedResponse,
  SupportStats,
  PaginatedResponse,
} from '@/types/support';

export interface GetConversationsParams {
  page?: number;
  limit?: number;
  status?: ConversationStatus;
  assignedToMe?: boolean;
  search?: string;
}

export interface GetTicketsParams {
  page?: number;
  limit?: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedToMe?: boolean;
  search?: string;
}

export interface GetMessagesParams {
  page?: number;
  limit?: number;
}

export const supportApi = {
  // Dashboard Stats
  getStats: async (): Promise<SupportStats> => {
    const response = await apiClient.get<SupportStats>('/admin/support/stats');
    return response.data;
  },

  // Conversations
  getConversations: async (
    params?: GetConversationsParams
  ): Promise<PaginatedResponse<Conversation>> => {
    const response = await apiClient.get<PaginatedResponse<Conversation>>(
      '/admin/support/conversations',
      { params }
    );
    return response.data;
  },

  getConversation: async (id: string): Promise<Conversation> => {
    const response = await apiClient.get<Conversation>(
      `/admin/support/conversations/${id}`
    );
    return response.data;
  },

  getConversationMessages: async (
    conversationId: string,
    params?: GetMessagesParams
  ): Promise<PaginatedResponse<Message>> => {
    const response = await apiClient.get<PaginatedResponse<Message>>(
      `/admin/support/conversations/${conversationId}/messages`,
      { params }
    );
    return response.data;
  },

  sendMessage: async (
    conversationId: string,
    data: { content: string; attachments?: string[] }
  ): Promise<Message> => {
    const response = await apiClient.post<Message>(
      `/admin/support/conversations/${conversationId}/messages`,
      data
    );
    return response.data;
  },

  assignConversation: async (conversationId: string): Promise<Conversation> => {
    const response = await apiClient.post<Conversation>(
      `/admin/support/conversations/${conversationId}/assign`
    );
    return response.data;
  },

  transferConversation: async (
    conversationId: string,
    agentId: string
  ): Promise<Conversation> => {
    const response = await apiClient.post<Conversation>(
      `/admin/support/conversations/${conversationId}/transfer`,
      { agentId }
    );
    return response.data;
  },

  endConversation: async (conversationId: string): Promise<Conversation> => {
    const response = await apiClient.post<Conversation>(
      `/admin/support/conversations/${conversationId}/end`
    );
    return response.data;
  },

  // Tickets
  getTickets: async (
    params?: GetTicketsParams
  ): Promise<PaginatedResponse<Ticket>> => {
    const response = await apiClient.get<PaginatedResponse<Ticket>>(
      '/admin/support/tickets',
      { params }
    );
    return response.data;
  },

  getTicket: async (id: string): Promise<Ticket> => {
    const response = await apiClient.get<Ticket>(`/admin/support/tickets/${id}`);
    return response.data;
  },

  assignTicket: async (ticketId: string): Promise<Ticket> => {
    const response = await apiClient.post<Ticket>(
      `/admin/support/tickets/${ticketId}/assign`
    );
    return response.data;
  },

  updateTicketStatus: async (
    ticketId: string,
    status: TicketStatus
  ): Promise<Ticket> => {
    const response = await apiClient.patch<Ticket>(
      `/admin/support/tickets/${ticketId}/status`,
      { status }
    );
    return response.data;
  },

  updateTicketPriority: async (
    ticketId: string,
    priority: TicketPriority
  ): Promise<Ticket> => {
    const response = await apiClient.patch<Ticket>(
      `/admin/support/tickets/${ticketId}/priority`,
      { priority }
    );
    return response.data;
  },

  resolveTicket: async (
    ticketId: string,
    resolution: string
  ): Promise<Ticket> => {
    const response = await apiClient.post<Ticket>(
      `/admin/support/tickets/${ticketId}/resolve`,
      { resolution }
    );
    return response.data;
  },

  // Canned Responses
  getCannedResponses: async (): Promise<CannedResponse[]> => {
    const response = await apiClient.get<CannedResponse[]>(
      '/admin/support/canned-responses'
    );
    return response.data;
  },

  createCannedResponse: async (data: {
    title: string;
    content: string;
    category: string;
    shortcut?: string;
  }): Promise<CannedResponse> => {
    const response = await apiClient.post<CannedResponse>(
      '/admin/support/canned-responses',
      data
    );
    return response.data;
  },

  updateCannedResponse: async (
    id: string,
    data: {
      title?: string;
      content?: string;
      category?: string;
      shortcut?: string;
    }
  ): Promise<CannedResponse> => {
    const response = await apiClient.patch<CannedResponse>(
      `/admin/support/canned-responses/${id}`,
      data
    );
    return response.data;
  },

  deleteCannedResponse: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/support/canned-responses/${id}`);
  },

  // Get available agents for transfer
  getAvailableAgents: async (): Promise<
    Array<{ id: string; firstName: string; lastName: string; activeChats: number }>
  > => {
    const response = await apiClient.get('/admin/support/agents');
    return response.data;
  },
};
