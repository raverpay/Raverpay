import apiClient from '../api-client';
import { AuditLog, PaginatedResponse } from '@/types';

export interface AuditLogStatistics {
  totalCount: number;
  today: number;
  byAction: Array<{
    action: string;
    count: number;
  }>;
  byResource: Array<{
    resource: string;
    count: number;
  }>;
  topActions?: Array<{
    action: string;
    count: number;
  }>;
}

export const auditLogsApi = {
  getAll: async (params?: Record<string, unknown>): Promise<PaginatedResponse<AuditLog>> => {
    const response = await apiClient.get<PaginatedResponse<AuditLog>>('/admin/audit-logs', {
      params,
    });
    return response.data;
  },

  getStats: async (): Promise<AuditLogStatistics> => {
    const response = await apiClient.get<AuditLogStatistics>('/admin/audit-logs/stats');
    return response.data;
  },

  getUserLogs: async (
    userId: string,
    params?: Record<string, unknown>,
  ): Promise<PaginatedResponse<AuditLog>> => {
    const response = await apiClient.get<PaginatedResponse<AuditLog>>(
      `/admin/audit-logs/user/${userId}`,
      { params },
    );
    return response.data;
  },

  getResourceLogs: async (
    resource: string,
    resourceId: string,
    params?: Record<string, unknown>,
  ): Promise<PaginatedResponse<AuditLog>> => {
    const response = await apiClient.get<PaginatedResponse<AuditLog>>(
      `/admin/audit-logs/resource/${resource}/${resourceId}`,
      { params },
    );
    return response.data;
  },

  getById: async (logId: string): Promise<AuditLog> => {
    const response = await apiClient.get<AuditLog>(`/admin/audit-logs/${logId}`);
    return response.data;
  },
};
