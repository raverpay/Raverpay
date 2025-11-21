import apiClient from '../api-client';
import {
  GiftCardOrder,
  PaginatedResponse,
  GiftCardStatistics,
  GiftCardReviewResult,
} from '@/types';

export const giftcardsApi = {
  getAll: async (params?: Record<string, unknown>): Promise<PaginatedResponse<GiftCardOrder>> => {
    const response = await apiClient.get<PaginatedResponse<GiftCardOrder>>('/admin/giftcards', {
      params,
    });
    return response.data;
  },

  getById: async (orderId: string): Promise<GiftCardOrder> => {
    const response = await apiClient.get<GiftCardOrder>(`/admin/giftcards/${orderId}`);
    return response.data;
  },

  getStatistics: async (params?: Record<string, unknown>): Promise<GiftCardStatistics> => {
    const response = await apiClient.get<GiftCardStatistics>('/admin/giftcards/stats', { params });
    return response.data;
  },

  getPending: async (
    params?: Record<string, unknown>,
  ): Promise<PaginatedResponse<GiftCardOrder>> => {
    const response = await apiClient.get<PaginatedResponse<GiftCardOrder>>(
      '/admin/giftcards/pending',
      { params },
    );
    return response.data;
  },

  approve: async (orderId: string, amount: number): Promise<GiftCardReviewResult> => {
    const response = await apiClient.post<GiftCardReviewResult>(
      `/admin/giftcards/${orderId}/approve`,
      { amount },
    );
    return response.data;
  },

  reject: async (orderId: string, reason: string): Promise<GiftCardOrder> => {
    const response = await apiClient.post<GiftCardOrder>(`/admin/giftcards/${orderId}/reject`, {
      reason,
    });
    return response.data;
  },

  updateStatus: async (orderId: string, status: string): Promise<GiftCardOrder> => {
    const response = await apiClient.patch<GiftCardOrder>(`/admin/giftcards/${orderId}/status`, {
      status,
    });
    return response.data;
  },
};
