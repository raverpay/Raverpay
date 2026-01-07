import { apiClient } from '@/src/lib/api/client';
import { API_ENDPOINTS } from '@/src/lib/api/endpoints';
import type {
  Notification,
  NotificationListResponse,
  NotificationPreferences,
  UpdateNotificationPreferencesDto,
} from '@/src/types/notification';

export const notificationService = {
  /**
   * Get paginated list of notifications
   */
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<NotificationListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.unreadOnly) queryParams.append('unreadOnly', 'true');

    const url = `${API_ENDPOINTS.NOTIFICATIONS.LIST}${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await apiClient.get<NotificationListResponse>(url);
    return response.data;
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    const response = await apiClient.put<Notification>(
      API_ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId),
    );
    return response.data;
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<{ count: number }> {
    // console.log("third, marking all notifications as read");
    const response = await apiClient.put<{ count: number }>(
      API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ,
    );
    // console.log("fourth, marking all notifications as read", response.data);
    return response.data;
  },

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.NOTIFICATIONS.DELETE(notificationId));
  },

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    const response = await apiClient.get<NotificationPreferences>(
      API_ENDPOINTS.NOTIFICATIONS.PREFERENCES,
    );
    return response.data;
  },

  /**
   * Update notification preferences
   */
  async updatePreferences(
    preferences: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferences> {
    const response = await apiClient.put<NotificationPreferences>(
      API_ENDPOINTS.NOTIFICATIONS.UPDATE_PREFERENCES,
      preferences,
    );
    return response.data;
  },

  /**
   * Reset preferences to defaults
   */
  async resetPreferences(): Promise<NotificationPreferences> {
    const response = await apiClient.post<NotificationPreferences>(
      API_ENDPOINTS.NOTIFICATIONS.RESET_PREFERENCES,
    );
    return response.data;
  },

  /**
   * Opt out of a category
   */
  async optOutCategory(category: string): Promise<NotificationPreferences> {
    const response = await apiClient.post<NotificationPreferences>(
      API_ENDPOINTS.NOTIFICATIONS.OPT_OUT_CATEGORY(category),
    );
    return response.data;
  },

  /**
   * Opt in to a category
   */
  async optInCategory(category: string): Promise<NotificationPreferences> {
    const response = await apiClient.delete<NotificationPreferences>(
      API_ENDPOINTS.NOTIFICATIONS.OPT_IN_CATEGORY(category),
    );
    return response.data;
  },
};
