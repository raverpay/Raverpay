import apiClient from '../api-client';
import { Wallet, PaginatedResponse, WalletStatistics, WalletAdjustmentResult } from '@/types';

export const walletsApi = {
  getAll: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Wallet>> => {
    const response = await apiClient.get<PaginatedResponse<Wallet>>('/admin/wallets', {
      params,
    });
    return response.data;
  },

  getById: async (userId: string): Promise<Wallet> => {
    const response = await apiClient.get<Wallet>(`/admin/wallets/${userId}`);
    return response.data;
  },

  getStatistics: async (): Promise<WalletStatistics> => {
    const response = await apiClient.get<WalletStatistics>('/admin/wallets/stats');
    return response.data;
  },

  lock: async (userId: string, reason: string): Promise<Wallet> => {
    const response = await apiClient.post<Wallet>(`/admin/wallets/${userId}/lock`, { reason });
    return response.data;
  },

  unlock: async (userId: string, reason: string): Promise<Wallet> => {
    const response = await apiClient.post<Wallet>(`/admin/wallets/${userId}/unlock`, { reason });
    return response.data;
  },

  adjust: async (
    userId: string,
    amount: number,
    type: 'credit' | 'debit',
    reason: string,
  ): Promise<WalletAdjustmentResult> => {
    const response = await apiClient.post<WalletAdjustmentResult>(
      `/admin/wallets/${userId}/adjust`,
      {
        amount,
        type,
        reason,
      },
    );
    return response.data;
  },

  resetLimits: async (userId: string): Promise<Wallet> => {
    const response = await apiClient.post<Wallet>(`/admin/wallets/${userId}/reset-limits`);
    return response.data;
  },
};
