// src/hooks/useTransactions.ts
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api/client';
import { API_ENDPOINTS } from '@/src/lib/api/endpoints';
import { useAuthStore } from '@/src/store/auth.store';

interface TransactionsParams {
  limit?: number;
  type?: 'CREDIT' | 'DEBIT';
  status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  startDate?: string;
  endDate?: string;
}

export const useTransactions = (params: TransactionsParams = {}) => {
  const { isAuthenticated } = useAuthStore();

  return useInfiniteQuery({
    queryKey: ['transactions', params],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await apiClient.get(API_ENDPOINTS.WALLET.TRANSACTIONS, {
        params: { page: pageParam, limit: params.limit || 20, ...params },
      });
      return data;
    },
    enabled: isAuthenticated, // Only fetch when authenticated
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      // Check if there's a next page using hasNext from backend
      return lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

export const useTransactionDetails = (transactionId: string) => {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: async () => {
      const { data } = await apiClient.get(`${API_ENDPOINTS.WALLET.TRANSACTIONS}/${transactionId}`);
      return data;
    },
    enabled: isAuthenticated && !!transactionId, // Only fetch when authenticated and ID exists
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
