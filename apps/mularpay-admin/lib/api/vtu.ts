import apiClient from '../api-client'
import { VTUOrder, PaginatedResponse, VTUStatistics } from '@/types'

export const vtuApi = {
  getAll: async (params?: Record<string, any>): Promise<PaginatedResponse<VTUOrder>> => {
    const response = await apiClient.get<PaginatedResponse<VTUOrder>>('/admin/vtu', { params })
    return response.data
  },

  getById: async (orderId: string): Promise<VTUOrder> => {
    const response = await apiClient.get<VTUOrder>(`/admin/vtu/${orderId}`)
    return response.data
  },

  getStatistics: async (params?: Record<string, any>): Promise<VTUStatistics> => {
    const response = await apiClient.get<VTUStatistics>('/admin/vtu/stats', { params })
    return response.data
  },

  getPending: async (params?: Record<string, any>): Promise<PaginatedResponse<VTUOrder>> => {
    const response = await apiClient.get<PaginatedResponse<VTUOrder>>('/admin/vtu/pending', {
      params,
    })
    return response.data
  },

  getFailed: async (params?: Record<string, any>): Promise<PaginatedResponse<VTUOrder>> => {
    const response = await apiClient.get<PaginatedResponse<VTUOrder>>('/admin/vtu/failed', {
      params,
    })
    return response.data
  },

  refund: async (orderId: string, reason: string): Promise<any> => {
    const response = await apiClient.post(`/admin/vtu/${orderId}/refund`, { reason })
    return response.data
  },

  retry: async (orderId: string): Promise<VTUOrder> => {
    const response = await apiClient.post<VTUOrder>(`/admin/vtu/${orderId}/retry`)
    return response.data
  },

  updateStatus: async (orderId: string, status: string): Promise<VTUOrder> => {
    const response = await apiClient.patch<VTUOrder>(`/admin/vtu/${orderId}/status`, { status })
    return response.data
  },
}
