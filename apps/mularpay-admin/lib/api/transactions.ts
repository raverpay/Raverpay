import apiClient from '../api-client';
import {
  Transaction,
  PaginatedResponse,
  TransactionStatistics,
  TransactionReversalResult,
} from '@/types';

export const transactionsApi = {
  getAll: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Transaction>> => {
    const response = await apiClient.get<PaginatedResponse<Transaction>>('/admin/transactions', {
      params,
    });
    return response.data;
  },

  getById: async (transactionId: string): Promise<Transaction> => {
    const response = await apiClient.get<Transaction>(`/admin/transactions/${transactionId}`);
    return response.data;
  },

  getByReference: async (reference: string): Promise<Transaction> => {
    const response = await apiClient.get<Transaction>(`/admin/transactions/reference/${reference}`);
    return response.data;
  },

  getStatistics: async (params?: Record<string, unknown>): Promise<TransactionStatistics> => {
    const response = await apiClient.get<TransactionStatistics>('/admin/transactions/stats', {
      params,
    });
    return response.data;
  },

  getPending: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Transaction>> => {
    const response = await apiClient.get<PaginatedResponse<Transaction>>(
      '/admin/transactions/pending',
      { params },
    );
    return response.data;
  },

  getFailed: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Transaction>> => {
    const response = await apiClient.get<PaginatedResponse<Transaction>>(
      '/admin/transactions/failed',
      { params },
    );
    return response.data;
  },

  reverse: async (transactionId: string, reason: string): Promise<TransactionReversalResult> => {
    const response = await apiClient.post<TransactionReversalResult>(
      `/admin/transactions/${transactionId}/reverse`,
      {
        reason,
      },
    );
    return response.data;
  },

  retry: async (transactionId: string): Promise<Transaction> => {
    const response = await apiClient.post<Transaction>(
      `/admin/transactions/${transactionId}/retry`,
    );
    return response.data;
  },

  updateStatus: async (transactionId: string, status: string): Promise<Transaction> => {
    const response = await apiClient.patch<Transaction>(
      `/admin/transactions/${transactionId}/status`,
      { status },
    );
    return response.data;
  },
};
