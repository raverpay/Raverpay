// src/hooks/useWallet.ts
import { apiClient } from '@/src/lib/api/client';
import { API_ENDPOINTS } from '@/src/lib/api/endpoints';
import { useAuthStore } from '@/src/store/auth.store';
import { useWalletStore } from '@/src/store/wallet.store';
import { useQuery } from '@tanstack/react-query';

export const useWallet = () => {
  const { setWallet } = useWalletStore();
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.WALLET.GET);

      setWallet(data);
      return data;
    },
    enabled: isAuthenticated, // Only fetch when authenticated
    staleTime: 1000 * 60, // 1 minute
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};
