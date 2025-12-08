import apiClient from '../api-client';
import { VirtualAccount, PaginatedResponse, VirtualAccountStatistics } from '@/types';

export const virtualAccountsApi = {
  getAll: async (params?: Record<string, unknown>): Promise<PaginatedResponse<VirtualAccount>> => {
    const response = await apiClient.get<PaginatedResponse<VirtualAccount>>(
      '/admin/virtual-accounts',
      { params },
    );
    return response.data;
  },

  getById: async (accountId: string): Promise<VirtualAccount | VirtualAccount[]> => {
    const response = await apiClient.get<VirtualAccount | VirtualAccount[]>(
      `/admin/virtual-accounts/${accountId}`,
    );
    return response.data;
  },

  getByUserId: async (userId: string): Promise<VirtualAccount[]> => {
    const response = await apiClient.get<VirtualAccount[]>(
      `/admin/virtual-accounts/user/${userId}`,
    );
    return response.data;
  },

  getStatistics: async (): Promise<VirtualAccountStatistics> => {
    const response = await apiClient.get<VirtualAccountStatistics>('/admin/virtual-accounts/stats');
    return response.data;
  },

  freeze: async (accountId: string, reason: string): Promise<VirtualAccount> => {
    const response = await apiClient.post<VirtualAccount>(
      `/admin/virtual-accounts/${accountId}/freeze`,
      { reason },
    );
    return response.data;
  },

  unfreeze: async (accountId: string): Promise<VirtualAccount> => {
    const response = await apiClient.post<VirtualAccount>(
      `/admin/virtual-accounts/${accountId}/unfreeze`,
    );
    return response.data;
  },

  close: async (accountId: string, reason: string): Promise<VirtualAccount> => {
    const response = await apiClient.post<VirtualAccount>(
      `/admin/virtual-accounts/${accountId}/close`,
      { reason },
    );
    return response.data;
  },

  getFailedCreations: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<any>> => {
    const response = await apiClient.get<PaginatedResponse<any>>(
      '/admin/virtual-accounts/failed',
      { params },
    );
    return response.data;
  },

  getCreationStatus: async (userId: string): Promise<any> => {
    const response = await apiClient.get<any>(
      `/admin/virtual-accounts/${userId}/status`,
    );
    return response.data;
  },

  createDVAForUser: async (
    userId: string,
    preferredBank?: string,
  ): Promise<VirtualAccount> => {
    const response = await apiClient.post<VirtualAccount>(
      `/admin/virtual-accounts/${userId}/create`,
      { preferred_bank: preferredBank },
    );
    return response.data;
  },
};
