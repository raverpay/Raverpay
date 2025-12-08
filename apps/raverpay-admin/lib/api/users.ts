import apiClient from '../api-client';
import { User, PaginatedResponse, UserStatistics, AuditLog } from '@/types';

export const usersApi = {
  getAll: async (params?: Record<string, unknown>): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get<PaginatedResponse<User>>('/admin/users', { params });
    return response.data;
  },

  getById: async (userId: string): Promise<User> => {
    const response = await apiClient.get<User>(`/admin/users/${userId}`);
    return response.data;
  },

  getStatistics: async (): Promise<UserStatistics> => {
    const response = await apiClient.get<UserStatistics>('/admin/users/stats');
    return response.data;
  },

  updateRole: async (userId: string, role: string): Promise<User> => {
    const response = await apiClient.patch<User>(`/admin/users/${userId}/role`, { role });
    return response.data;
  },

  updateStatus: async (userId: string, status: string, reason?: string): Promise<User> => {
    const response = await apiClient.patch<User>(`/admin/users/${userId}/status`, {
      status,
      reason,
    });
    return response.data;
  },

  updateKYCTier: async (userId: string, tier: string, notes?: string): Promise<User> => {
    const response = await apiClient.patch<User>(`/admin/users/${userId}/kyc-tier`, {
      tier,
      notes,
    });
    return response.data;
  },

  getAuditLogs: async (
    userId: string,
    params?: Record<string, unknown>,
  ): Promise<PaginatedResponse<AuditLog>> => {
    const response = await apiClient.get<PaginatedResponse<AuditLog>>(
      `/admin/users/${userId}/audit-logs`,
      {
        params,
      },
    );
    return response.data;
  },

  lockAccount: async (
    userId: string,
    reason?: string,
    lockDurationMinutes?: number,
  ): Promise<User> => {
    const response = await apiClient.patch<User>(`/admin/users/${userId}/lock-account`, {
      reason,
      lockDurationMinutes,
    });
    return response.data;
  },

  unlockAccount: async (userId: string, reason?: string): Promise<User> => {
    const response = await apiClient.patch<User>(`/admin/users/${userId}/unlock-account`, {
      reason,
    });
    return response.data;
  },
};
