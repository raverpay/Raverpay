import apiClient from '../api-client';
import {
  DashboardAnalytics,
  RevenueAnalytics,
  UserGrowthAnalytics,
  TransactionTrendsAnalytics,
} from '@/types';

export const analyticsApi = {
  getDashboard: async (): Promise<DashboardAnalytics> => {
    const response = await apiClient.get<DashboardAnalytics>('/admin/analytics/dashboard');

    return response.data;
  },

  getRevenue: async (params?: Record<string, unknown>): Promise<RevenueAnalytics> => {
    const response = await apiClient.get<RevenueAnalytics>('/admin/analytics/revenue', { params });
    return response.data;
  },

  getUserGrowth: async (params?: Record<string, unknown>): Promise<UserGrowthAnalytics> => {
    const response = await apiClient.get<UserGrowthAnalytics>('/admin/analytics/users', { params });
    return response.data;
  },

  getTransactionTrends: async (
    params?: Record<string, unknown>,
  ): Promise<TransactionTrendsAnalytics> => {
    const response = await apiClient.get<TransactionTrendsAnalytics>(
      '/admin/analytics/transactions',
      {
        params,
      },
    );
    return response.data;
  },
};
