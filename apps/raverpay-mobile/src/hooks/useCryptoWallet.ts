// src/hooks/useCryptoWallet.ts
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '../lib/utils/toast';
import { cryptoService } from '../services/crypto.service';
import { useAuthStore } from '../store/auth.store';
import { useCryptoStore } from '../store/crypto.store';
import {
  ConvertCryptoRequest,
  GetConversionQuoteRequest,
  SendCryptoRequest,
  TokenSymbol,
} from '../types/crypto.types';

/**
 * Get crypto wallet details
 */
export const useCryptoWallet: any = () => {
  const { setWallet } = useCryptoStore();
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['crypto-wallet'],
    queryFn: async () => {
      const wallet = await cryptoService.getWallet();
      setWallet(wallet);
      return wallet;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60, // 1 minute
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
};

/**
 * Initialize crypto wallet
 */
export const useInitializeCryptoWallet = () => {
  const queryClient = useQueryClient();
  const { setWallet } = useCryptoStore();

  return useMutation({
    mutationFn: (pin: string) => cryptoService.initializeWallet(pin),
    onSuccess: (response) => {
      setWallet(response.wallet);
      queryClient.invalidateQueries({ queryKey: ['crypto-wallet'] });
      toast.success({
        title: 'Wallet Initialized',
        message: 'Your crypto wallet has been set up successfully!',
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to initialize wallet';

      if (errorMessage.includes('Unique constraint') || errorMessage.includes('already exists')) {
        toast.error({
          title: 'Wallet Already Exists',
          message: 'You already have a crypto wallet. Please refresh the page.',
        });
      } else {
        toast.error({
          title: 'Setup Failed',
          message: errorMessage,
        });
      }
    },
  });
};

/**
 * Get deposit information (address + QR code)
 */
export const useDepositInfo = () => {
  const { setDepositInfo } = useCryptoStore();

  return useQuery({
    queryKey: ['crypto-deposit-info'],
    queryFn: async () => {
      const info = await cryptoService.getDepositInfo();
      setDepositInfo(info);
      return info;
    },
    staleTime: Infinity, // Deposit address doesn't change
  });
};

/**
 * Sync balances from blockchain
 */
export const useSyncBalances = () => {
  const queryClient = useQueryClient();
  const { setBalances } = useCryptoStore();

  return useMutation({
    mutationFn: () => cryptoService.syncBalances(),
    onSuccess: (balances) => {
      setBalances(balances);
      queryClient.invalidateQueries({ queryKey: ['crypto-balances'] });
      queryClient.invalidateQueries({ queryKey: ['crypto-wallet'] });
    },
    onError: (error: any) => {
      // toast.error({
      //   title: "Sync Failed",
      //   message: error.message || "Failed to sync balances",
      // });

      console.error(error);
    },
  });
};

/**
 * Get balance for specific token
 */
export const useTokenBalance = (token: TokenSymbol) => {
  return useQuery({
    queryKey: ['crypto-balance', token],
    queryFn: () => cryptoService.getBalance(token),
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Send crypto to external address
 */
export const useSendCrypto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendCryptoRequest) => cryptoService.sendCrypto(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crypto-balances'] });
      queryClient.invalidateQueries({ queryKey: ['crypto-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['crypto-transactions'] });
      toast.success({
        title: 'Transaction Sent',
        message: 'Your crypto has been sent successfully!',
      });
    },
    onError: (error: any) => {
      toast.error({
        title: 'Send Failed',
        message: error.message || 'Failed to send crypto',
      });
    },
  });
};

/**
 * Get crypto transaction history with infinite query support
 */
export const useCryptoTransactions = (params?: { limit?: number }) => {
  return useInfiniteQuery({
    queryKey: ['crypto-transactions', params],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await cryptoService.getTransactions({
        page: pageParam,
        limit: params?.limit || 20,
      });
      return response;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      // Check if there's a next page using pagination from backend
      return lastPage.pagination?.hasMore ? lastPage.pagination.page + 1 : undefined;
    },
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Get crypto transaction details
 */
export const useCryptoTransactionDetails = (id: string) => {
  return useQuery({
    queryKey: ['crypto-transaction', id],
    queryFn: () => cryptoService.getTransactionDetails(id),
    enabled: !!id,
  });
};

/**
 * Get conversion quote
 */
export const useConversionQuote = () => {
  return useMutation({
    mutationFn: (data: GetConversionQuoteRequest) => cryptoService.getConversionQuote(data),
  });
};

/**
 * Convert crypto to Naira
 */
export const useConvertCrypto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConvertCryptoRequest) => cryptoService.convertCrypto(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crypto-balances'] });
      queryClient.invalidateQueries({ queryKey: ['crypto-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['crypto-conversions'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] }); // Also update main wallet
      toast.success({
        title: 'Conversion Successful',
        message: 'Your crypto has been converted to Naira!',
      });
    },
    onError: (error: any) => {
      toast.error({
        title: 'Conversion Failed',
        message: error.message || 'Failed to convert crypto',
      });
    },
  });
};

/**
 * Get conversion history
 */
export const useCryptoConversions = (params?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['crypto-conversions', params],
    queryFn: () => cryptoService.getConversions(params),
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Get current USD to Naira exchange rate
 */
export const useExchangeRate = () => {
  return useQuery({
    queryKey: ['exchange-rate'],
    queryFn: () => cryptoService.getExchangeRate(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes
  });
};
