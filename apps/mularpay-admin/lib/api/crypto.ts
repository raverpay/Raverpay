import apiClient from '../api-client'
import { CryptoOrder, PaginatedResponse, CryptoStatistics } from '@/types'

export const cryptoApi = {
  getAll: async (params?: Record<string, any>): Promise<PaginatedResponse<CryptoOrder>> => {
    const response = await apiClient.get<PaginatedResponse<CryptoOrder>>('/admin/crypto', {
      params,
    })
    return response.data
  },

  getById: async (orderId: string): Promise<CryptoOrder> => {
    const response = await apiClient.get<CryptoOrder>(`/admin/crypto/${orderId}`)
    return response.data
  },

  getStatistics: async (params?: Record<string, any>): Promise<CryptoStatistics> => {
    const response = await apiClient.get<CryptoStatistics>('/admin/crypto/stats', { params })
    return response.data
  },

  getPending: async (params?: Record<string, any>): Promise<PaginatedResponse<CryptoOrder>> => {
    const response = await apiClient.get<PaginatedResponse<CryptoOrder>>('/admin/crypto/pending', {
      params,
    })
    return response.data
  },

  approve: async (orderId: string, amount: number): Promise<any> => {
    const response = await apiClient.post(`/admin/crypto/${orderId}/approve`, { amount })
    return response.data
  },

  reject: async (orderId: string, reason: string): Promise<any> => {
    const response = await apiClient.post(`/admin/crypto/${orderId}/reject`, { reason })
    return response.data
  },

  updateStatus: async (orderId: string, status: string): Promise<CryptoOrder> => {
    const response = await apiClient.patch<CryptoOrder>(`/admin/crypto/${orderId}/status`, {
      status,
    })
    return response.data
  },
}
