import apiClient from '../api-client';

export interface IpWhitelistEntry {
  id: string;
  ipAddress: string;
  description: string | null;
  userId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
  usageCount: number;
  creator: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface IpWhitelistResponse {
  data: IpWhitelistEntry[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateIpWhitelistDto {
  ipAddress: string;
  description?: string;
  userId?: string;
  isActive?: boolean;
}

export interface UpdateIpWhitelistDto {
  ipAddress?: string;
  description?: string;
  isActive?: boolean;
}

export const securityApi = {
  // IP Whitelist endpoints
  getIpWhitelist: async (params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    userId?: string;
  }): Promise<IpWhitelistResponse> => {
    const response = await apiClient.get<IpWhitelistResponse>('/admin/security/ip-whitelist', {
      params,
    });
    return response.data;
  },

  addIpWhitelist: async (data: CreateIpWhitelistDto): Promise<IpWhitelistEntry> => {
    const response = await apiClient.post<IpWhitelistEntry>('/admin/security/ip-whitelist', data);
    return response.data;
  },

  updateIpWhitelist: async (id: string, data: UpdateIpWhitelistDto): Promise<IpWhitelistEntry> => {
    const response = await apiClient.patch<IpWhitelistEntry>(
      `/admin/security/ip-whitelist/${id}`,
      data,
    );
    return response.data;
  },

  removeIpWhitelist: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/admin/security/ip-whitelist/${id}`);
    return response.data;
  },

  getCurrentIp: async (): Promise<{ ipAddress: string }> => {
    const response = await apiClient.get<{ ipAddress: string }>(
      '/admin/security/ip-whitelist/current-ip',
    );
    return response.data;
  },
};
