import apiClient from '../api-client';
import { AccountDeletionRequest, PaginatedResponse } from '@/types';

export interface DeletionStatistics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
}

export const deletionsApi = {
  getAll: async (params?: Record<string, unknown>): Promise<PaginatedResponse<AccountDeletionRequest>> => {
    const response = await apiClient.get<PaginatedResponse<AccountDeletionRequest>>('/admin/deletions', {
      params,
    });
    return response.data;
  },

  getPending: async (params?: Record<string, unknown>): Promise<PaginatedResponse<AccountDeletionRequest>> => {
    const response = await apiClient.get<PaginatedResponse<AccountDeletionRequest>>(
      '/admin/deletions/pending',
      { params },
    );
    return response.data;
  },

  getById: async (requestId: string): Promise<AccountDeletionRequest> => {
    const response = await apiClient.get<AccountDeletionRequest>(`/admin/deletions/${requestId}`);
    return response.data;
  },

  approve: async (requestId: string): Promise<AccountDeletionRequest> => {
    const response = await apiClient.post<AccountDeletionRequest>(
      `/admin/deletions/${requestId}/approve`,
    );
    return response.data;
  },

  reject: async (requestId: string, reason: string): Promise<AccountDeletionRequest> => {
    const response = await apiClient.post<AccountDeletionRequest>(
      `/admin/deletions/${requestId}/reject`,
      { reason },
    );
    return response.data;
  },

  getStats: async (): Promise<DeletionStatistics> => {
    const response = await apiClient.get<DeletionStatistics>('/admin/deletions/stats');
    return response.data;
  },
};
