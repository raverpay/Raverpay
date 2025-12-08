import apiClient from '../api-client';
import { User, PaginatedResponse, UserRole } from '@/types';

export interface CreateAdminDto {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  role: UserRole;
}

export interface UpdateAdminDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: UserRole;
}

export interface AdminStatistics {
  total: number;
  byRole: Record<string, number>;
  active: number;
}

export const adminsApi = {
  getAll: async (params?: Record<string, unknown>): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get<PaginatedResponse<User>>('/admin/admins', {
      params,
    });
    return response.data;
  },

  getById: async (adminId: string): Promise<User> => {
    const response = await apiClient.get<User>(`/admin/admins/${adminId}`);
    return response.data;
  },

  create: async (data: CreateAdminDto): Promise<User> => {
    const response = await apiClient.post<User>('/admin/admins', data);
    return response.data;
  },

  update: async (adminId: string, data: UpdateAdminDto): Promise<User> => {
    const response = await apiClient.patch<User>(`/admin/admins/${adminId}`, data);
    return response.data;
  },

  delete: async (adminId: string): Promise<void> => {
    await apiClient.delete(`/admin/admins/${adminId}`);
  },

  getStats: async (): Promise<AdminStatistics> => {
    const response = await apiClient.get<AdminStatistics>('/admin/admins/stats');
    return response.data;
  },
};
