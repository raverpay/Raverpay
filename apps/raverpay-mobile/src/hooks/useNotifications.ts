import { notificationService } from '@/src/services/notification.service';
import type { UpdateNotificationPreferencesDto } from '@/src/types/notification';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth.store';

/**
 * Query keys for notifications
 */
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (params?: { unreadOnly?: boolean }) => [...notificationKeys.lists(), params] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
};

/**
 * Hook to fetch infinite scroll notifications
 */
export function useNotifications(params?: { unreadOnly?: boolean; limit?: number }) {
  const { isAuthenticated } = useAuthStore();
  return useInfiniteQuery({
    queryKey: notificationKeys.list(params),
    queryFn: ({ pageParam = 1 }) =>
      notificationService.getNotifications({
        page: pageParam,
        limit: params?.limit || 20,
        unreadOnly: params?.unreadOnly,
      }),
    enabled: isAuthenticated,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
  });
}

/**
 * Hook to get unread notification count
 */
export function useUnreadCount() {
  const { data } = useNotifications({ unreadOnly: false, limit: 1 });
  return data?.pages[0]?.unreadCount || 0;
}

/**
 * Hook to mark notification as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationService.markAsRead(notificationId),
    onSuccess: () => {
      // Invalidate all notification queries
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Hook to mark all notifications as read
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  // console.log("second, marking all notifications as read");

  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      // Invalidate all notification queries
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Hook to delete a notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationService.deleteNotification(notificationId),
    onSuccess: () => {
      // Invalidate all notification queries
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Hook to get notification preferences
 */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: () => notificationService.getPreferences(),
  });
}

/**
 * Hook to update notification preferences
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: UpdateNotificationPreferencesDto) =>
      notificationService.updatePreferences(preferences),
    onSuccess: () => {
      // Invalidate preferences query
      queryClient.invalidateQueries({
        queryKey: notificationKeys.preferences(),
      });
    },
  });
}

/**
 * Hook to reset preferences to defaults
 */
export function useResetPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationService.resetPreferences(),
    onSuccess: () => {
      // Invalidate preferences query
      queryClient.invalidateQueries({
        queryKey: notificationKeys.preferences(),
      });
    },
  });
}

/**
 * Hook to opt out of a category
 */
export function useOptOutCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (category: string) => notificationService.optOutCategory(category),
    onSuccess: () => {
      // Invalidate preferences query
      queryClient.invalidateQueries({
        queryKey: notificationKeys.preferences(),
      });
    },
  });
}

/**
 * Hook to opt in to a category
 */
export function useOptInCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (category: string) => notificationService.optInCategory(category),
    onSuccess: () => {
      // Invalidate preferences query
      queryClient.invalidateQueries({
        queryKey: notificationKeys.preferences(),
      });
    },
  });
}
