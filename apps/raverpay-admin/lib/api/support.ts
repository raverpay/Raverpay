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
  InboundEmail,
  EmailStats,
  UserRole,
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
    params?: GetConversationsParams,
  ): Promise<PaginatedResponse<Conversation>> => {
    const response = await apiClient.get<PaginatedResponse<Conversation>>(
      '/admin/support/conversations',
      { params },
    );
    return response.data;
  },

  getConversation: async (id: string): Promise<Conversation> => {
    const response = await apiClient.get<Conversation>(`/admin/support/conversations/${id}`);
    return response.data;
  },

  getConversationMessages: async (
    conversationId: string,
    params?: GetMessagesParams,
  ): Promise<PaginatedResponse<Message>> => {
    const response = await apiClient.get<PaginatedResponse<Message>>(
      `/admin/support/conversations/${conversationId}/messages`,
      { params },
    );
    return response.data;
  },

  sendMessage: async (
    conversationId: string,
    data: { content: string; attachments?: string[] },
  ): Promise<Message> => {
    const response = await apiClient.post<Message>(
      `/admin/support/conversations/${conversationId}/messages`,
      data,
    );
    return response.data;
  },

  assignConversation: async (conversationId: string): Promise<Conversation> => {
    const response = await apiClient.post<Conversation>(
      `/admin/support/conversations/${conversationId}/assign`,
    );
    return response.data;
  },

  transferConversation: async (conversationId: string, agentId: string): Promise<Conversation> => {
    const response = await apiClient.post<Conversation>(
      `/admin/support/conversations/${conversationId}/transfer`,
      { agentId },
    );
    return response.data;
  },

  endConversation: async (conversationId: string): Promise<Conversation> => {
    const response = await apiClient.post<Conversation>(
      `/admin/support/conversations/${conversationId}/end`,
    );
    return response.data;
  },

  // Tickets
  getTickets: async (params?: GetTicketsParams): Promise<PaginatedResponse<Ticket>> => {
    const response = await apiClient.get<PaginatedResponse<Ticket>>('/admin/support/tickets', {
      params,
    });
    return response.data;
  },

  getTicket: async (id: string): Promise<Ticket> => {
    const response = await apiClient.get<Ticket>(`/admin/support/tickets/${id}`);
    return response.data;
  },

  assignTicket: async (ticketId: string): Promise<Ticket> => {
    const response = await apiClient.post<Ticket>(`/admin/support/tickets/${ticketId}/assign`);
    return response.data;
  },

  updateTicketStatus: async (ticketId: string, status: TicketStatus): Promise<Ticket> => {
    const response = await apiClient.patch<Ticket>(`/admin/support/tickets/${ticketId}/status`, {
      status,
    });
    return response.data;
  },

  updateTicketPriority: async (ticketId: string, priority: TicketPriority): Promise<Ticket> => {
    const response = await apiClient.patch<Ticket>(`/admin/support/tickets/${ticketId}/priority`, {
      priority,
    });
    return response.data;
  },

  resolveTicket: async (ticketId: string, resolution: string): Promise<Ticket> => {
    const response = await apiClient.post<Ticket>(`/admin/support/tickets/${ticketId}/resolve`, {
      resolution,
    });
    return response.data;
  },

  // Canned Responses
  getCannedResponses: async (): Promise<CannedResponse[]> => {
    const response = await apiClient.get<CannedResponse[]>('/admin/support/canned-responses');
    return response.data;
  },

  createCannedResponse: async (data: {
    title: string;
    content: string;
    category: string;
    shortcut?: string;
  }): Promise<CannedResponse> => {
    const response = await apiClient.post<CannedResponse>('/admin/support/canned-responses', data);
    return response.data;
  },

  updateCannedResponse: async (
    id: string,
    data: {
      title?: string;
      content?: string;
      category?: string;
      shortcut?: string;
    },
  ): Promise<CannedResponse> => {
    const response = await apiClient.patch<CannedResponse>(
      `/admin/support/canned-responses/${id}`,
      data,
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

  // ============================================
  // INBOUND EMAILS
  // ============================================

  getEmails: async (params?: GetEmailsParams): Promise<PaginatedResponse<InboundEmail>> => {
    const response = await apiClient.get<PaginatedResponse<InboundEmail>>('/admin/emails', {
      params,
    });
    return response.data;
  },

  getEmail: async (id: string): Promise<InboundEmail> => {
    const response = await apiClient.get<InboundEmail>(`/admin/emails/${id}`);
    return response.data;
  },

  getEmailStats: async (): Promise<EmailStats> => {
    const response = await apiClient.get<EmailStats>('/admin/emails/stats');
    return response.data;
  },

  markEmailAsProcessed: async (id: string): Promise<InboundEmail> => {
    const response = await apiClient.patch<InboundEmail>(`/admin/emails/${id}/process`);
    return response.data;
  },

  replyToEmail: async (
    id: string,
    content: string,
    subject?: string,
    attachments?: File[],
  ): Promise<{ success: boolean; message: string; resendEmailId?: string }> => {
    // Use FormData if attachments are provided, otherwise use JSON
    if (attachments && attachments.length > 0) {
      const formData = new FormData();
      formData.append('content', content);
      if (subject) {
        formData.append('subject', subject);
      }
      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await apiClient.post<{
        success: boolean;
        message: string;
        resendEmailId?: string;
      }>(`/admin/emails/${id}/reply`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } else {
      // No attachments - use JSON
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        resendEmailId?: string;
      }>(`/admin/emails/${id}/reply`, {
        content,
        subject,
      });
      return response.data;
    }
  },

  downloadAttachment: async (
    emailId: string,
    attachmentId: string,
  ): Promise<{
    id: string;
    filename: string;
    contentType: string;
    size: number;
    content: string;
  }> => {
    const response = await apiClient.get<{
      id: string;
      filename: string;
      contentType: string;
      size: number;
      content: string;
    }>(`/admin/emails/${emailId}/attachments/${attachmentId}`);
    return response.data;
  },

  forwardEmail: async (
    emailId: string,
    toEmail?: string,
  ): Promise<{
    success: boolean;
    message: string;
    forwardedEmailId?: string;
    attachmentsForwarded: number;
  }> => {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      forwardedEmailId?: string;
      attachmentsForwarded: number;
    }>(`/admin/emails/${emailId}/forward`, {
      toEmail,
    });
    return response.data;
  },

  sendFreshEmail: async (data: {
    to: string;
    subject: string;
    content: string;
    fromEmail?: string;
    cc?: string[];
    bcc?: string[];
    attachments?: File[];
  }): Promise<{
    success: boolean;
    message: string;
    resendEmailId?: string;
    to: string;
    from: string;
    subject: string;
  }> => {
    // Use FormData if attachments are provided, otherwise use JSON
    if (data.attachments && data.attachments.length > 0) {
      const formData = new FormData();
      formData.append('to', data.to);
      formData.append('subject', data.subject);
      formData.append('content', data.content);
      if (data.fromEmail) {
        formData.append('fromEmail', data.fromEmail);
      }
      if (data.cc && data.cc.length > 0) {
        data.cc.forEach((email) => {
          formData.append('cc[]', email);
        });
      }
      if (data.bcc && data.bcc.length > 0) {
        data.bcc.forEach((email) => {
          formData.append('bcc[]', email);
        });
      }
      data.attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await apiClient.post<{
        success: boolean;
        message: string;
        resendEmailId?: string;
        to: string;
        from: string;
        subject: string;
      }>('/admin/emails/send', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } else {
      // No attachments - use JSON
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        resendEmailId?: string;
        to: string;
        from: string;
        subject: string;
      }>('/admin/emails/send', {
        to: data.to,
        subject: data.subject,
        content: data.content,
        fromEmail: data.fromEmail,
        cc: data.cc,
        bcc: data.bcc,
      });
      return response.data;
    }
  },
};

export interface GetEmailsParams {
  page?: number;
  limit?: number;
  targetEmail?: string;
  targetRole?: UserRole;
  isProcessed?: boolean;
  search?: string;
}

export interface GetOutboundEmailsParams {
  page?: number;
  limit?: number;
  fromEmail?: string;
  search?: string;
  status?: string;
}

export interface OutboundEmail {
  id: string;
  resendEmailId: string | null;
  sentBy: string;
  fromEmail: string;
  to: string;
  cc: string[];
  bcc: string[];
  subject: string;
  content: string;
  status: string;
  createdAt: string;
  sender?: {
    firstName: string;
    lastName: string;
  };
  user?: {
    firstName: string;
    lastName: string;
  };
  inboundEmail?: {
    subject: string;
  };
}

// Add to supportApi object
export const getOutboundEmails = async (
  params?: GetOutboundEmailsParams,
): Promise<PaginatedResponse<OutboundEmail>> => {
  const response = await apiClient.get<PaginatedResponse<OutboundEmail>>(
    '/admin/emails/outbound',
    {
      params,
    },
  );
  return response.data;
};
