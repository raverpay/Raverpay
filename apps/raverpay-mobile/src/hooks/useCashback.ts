import { apiClient } from '@/src/lib/api/client';
import { useCashbackStore } from '@/src/store/cashback.store';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth.store';

// Types
interface CashbackWallet {
  availableBalance: number;
  totalEarned: number;
  totalRedeemed: number;
}

interface CashbackTransaction {
  id: string;
  type: 'EARNED' | 'REDEEMED' | 'EXPIRED' | 'REVERSED';
  amount: number;
  description: string;
  balanceAfter: number;
  createdAt: string;
}

interface CashbackConfig {
  [serviceType: string]: {
    [provider: string]: {
      percentage: number;
      minAmount: number;
      maxCashback?: number;
    };
  };
}

interface CalculateCashbackParams {
  serviceType: string;
  provider: string;
  amount: number;
}

interface CalculateCashbackResponse {
  percentage: number;
  cashbackAmount: number;
  isEligible: boolean;
}

/**
 * Get cashback wallet balance
 */
export const useCashbackWallet = () => {
  const setCashbackWallet = useCashbackStore((state) => state.setCashbackWallet);
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['cashback', 'wallet'],
    queryFn: async () => {
      const response = await apiClient.get<CashbackWallet>('/cashback/wallet');
      setCashbackWallet(response.data);
      return response.data;
    },
    staleTime: 30000, // 30 seconds
    enabled: isAuthenticated,
  });
};

/**
 * Get cashback transaction history
 */
export const useCashbackHistory = (page = 1, limit = 20) => {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['cashback', 'history', page, limit],
    queryFn: async () => {
      const response = await apiClient.get<{
        data: CashbackTransaction[];
        meta: { total: number; page: number; limit: number };
      }>(`/cashback/history?page=${page}&limit=${limit}`);
      return response.data;
    },
    enabled: isAuthenticated,
  });
};

/**
 * Get cashback configurations
 */
export const useCashbackConfig = () => {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['cashback', 'config'],
    queryFn: async () => {
      const response = await apiClient.get<CashbackConfig>('/cashback/config');
      return response.data;
    },
    staleTime: 300000, // 5 minutes
    enabled: isAuthenticated,
  });
};

/**
 * Calculate cashback for a purchase
 */
export const useCalculateCashback = () => {
  return useMutation({
    mutationFn: async (params: CalculateCashbackParams) => {
      const response = await apiClient.post<CalculateCashbackResponse>(
        '/cashback/calculate',
        params,
      );
      return response.data;
    },
  });
};
