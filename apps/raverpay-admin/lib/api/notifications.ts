import apiClient from '../api-client';
import { Notification, PaginatedResponse, NotificationType } from '@/types';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';

export interface NotificationStatistics {
  totalCount: number;
  unreadCount: number;
  readRate: string;
  byType: Array<{
    type: NotificationType;
    count: number;
  }>;
}

export interface CreateBroadcastDto {
  type: NotificationType;
  title: string;
  message: string;
  channels: NotificationChannel[];
  eventType?: string;
}

export interface BroadcastResponse {
  success: boolean;
  broadcastId: string;
  totalUsers: number;
  eligibleUsers: number;
  totalQueued: number;
  channels: NotificationChannel[];
  message: string;
}

export interface SendNotificationDto {
  type: NotificationType;
  title: string;
  message: string;
}

export interface QueueStats {
  total: number;
  queued: number;
  processing: number;
  sent: number;
  failed: number;
  byChannel: Array<{
    channel: NotificationChannel;
    status: string;
    _count: number;
  }>;
}

export const notificationsApi = {
  getAll: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Notification>> => {
    const response = await apiClient.get<PaginatedResponse<Notification>>('/admin/notifications', {
      params,
    });
    return response.data;
  },

  getStats: async (): Promise<NotificationStatistics> => {
    const response = await apiClient.get<NotificationStatistics>('/admin/notifications/stats');
    return response.data;
  },

  getUserNotifications: async (
    userId: string,
    params?: Record<string, unknown>,
  ): Promise<PaginatedResponse<Notification>> => {
    const response = await apiClient.get<PaginatedResponse<Notification>>(
      `/admin/notifications/user/${userId}`,
      { params },
    );
    return response.data;
  },

  getById: async (notificationId: string): Promise<Notification> => {
    const response = await apiClient.get<Notification>(`/admin/notifications/${notificationId}`);
    return response.data;
  },

  broadcast: async (data: CreateBroadcastDto): Promise<BroadcastResponse> => {
    // Broadcast can take a long time due to rate limiting (600ms per user for email)
    // Set a longer timeout for this specific request
    const response = await apiClient.post<BroadcastResponse>(
      '/admin/notifications/broadcast',
      data,
      { timeout: 120000 }, // 2 minutes timeout for bulk operations
    );
    return response.data;
  },

  sendToUser: async (userId: string, data: SendNotificationDto): Promise<Notification> => {
    const response = await apiClient.post<Notification>(
      `/admin/notifications/user/${userId}`,
      data,
    );
    return response.data;
  },

  markAsRead: async (notificationId: string): Promise<Notification> => {
    const response = await apiClient.patch<Notification>(
      `/admin/notifications/${notificationId}/read`,
    );
    return response.data;
  },

  delete: async (notificationId: string): Promise<void> => {
    await apiClient.delete(`/admin/notifications/${notificationId}`);
  },

  bulkDelete: async (ids: string[]): Promise<{ deleted: number }> => {
    const response = await apiClient.post<{ deleted: number }>('/admin/notifications/bulk-delete', {
      ids,
    });
    return response.data;
  },

  getQueueStats: async (): Promise<QueueStats> => {
    const response = await apiClient.get<QueueStats>('/admin/notifications/queue/stats');
    return response.data;
  },

  testBirthday: async (userId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `/admin/notifications/birthday-test/${userId}`,
    );
    return response.data;
  },
};
