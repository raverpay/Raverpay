import apiClient from '../api-client';
import { VTUOrder, PaginatedResponse, VTUStatistics, VTURefundResult, VTPassBalance } from '@/types';

export const vtuApi = {
  getBalance: async (): Promise<VTPassBalance> => {
    const response = await apiClient.get<VTPassBalance>('/admin/vtu/balance');
    return response.data;
  },

  getAll: async (params?: Record<string, unknown>): Promise<PaginatedResponse<VTUOrder>> => {
    const response = await apiClient.get<PaginatedResponse<VTUOrder>>('/admin/vtu/orders', {
      params,
    });
    return response.data;
  },

  getById: async (orderId: string): Promise<VTUOrder> => {
    const response = await apiClient.get<VTUOrder>(`/admin/vtu/orders/${orderId}`);
    return response.data;
  },

  getStatistics: async (params?: Record<string, unknown>): Promise<VTUStatistics> => {
    const response = await apiClient.get<VTUStatistics>('/admin/vtu/stats', { params });
    return response.data;
  },

  getPending: async (params?: Record<string, unknown>): Promise<PaginatedResponse<VTUOrder>> => {
    const response = await apiClient.get<PaginatedResponse<VTUOrder>>('/admin/vtu/orders', {
      params: { ...params, status: 'PENDING' },
    });
    return response.data;
  },

  getFailed: async (params?: Record<string, unknown>): Promise<PaginatedResponse<VTUOrder>> => {
    const response = await apiClient.get<PaginatedResponse<VTUOrder>>('/admin/vtu/failed', {
      params,
    });
    return response.data;
  },

  refund: async (orderId: string, reason: string): Promise<VTURefundResult> => {
    const response = await apiClient.post<VTURefundResult>(
      `/admin/vtu/orders/${orderId}/refund`,
      {
        reason,
      },
    );
    return response.data;
  },

  retry: async (orderId: string): Promise<VTUOrder> => {
    const response = await apiClient.post<VTUOrder>(`/admin/vtu/orders/${orderId}/retry`);
    return response.data;
  },

  markCompleted: async (orderId: string, notes?: string): Promise<VTUOrder> => {
    const response = await apiClient.post<VTUOrder>(`/admin/vtu/orders/${orderId}/mark-completed`, {
      notes,
    });
    return response.data;
  },
};
