// src/hooks/useWithdrawal.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/src/lib/api/client';
import { API_ENDPOINTS } from '@/src/lib/api/endpoints';
import { useAuthStore } from '@/src/store/auth.store';
import { Alert } from 'react-native';

export interface WithdrawalConfig {
  feeType: 'FLAT' | 'PERCENTAGE';
  feeValue: number;
  minFee: number;
  maxFee: number | null;
  minWithdrawal: number;
  maxWithdrawal: number;
  kycTier: string;
}

export interface WithdrawalPreview {
  amount: number;
  fee: number;
  totalDebit: number;
  amountToReceive: number;
}

export interface WithdrawFundsDto {
  amount: number;
  accountNumber: string;
  accountName: string;
  bankCode: string;
  pin: string;
  narration?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  isVerified: boolean;
  isPrimary: boolean;
  createdAt: string;
}

export interface Bank {
  code: string;
  name: string;
  slug: string;
  active: boolean;
}

export interface ResolveAccountResponse {
  accountNumber: string;
  accountName: string;
  bankCode: string;
}

/**
 * Get withdrawal configuration for current user
 */
export const useWithdrawalConfig = () => {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['withdrawal', 'config'],
    queryFn: async (): Promise<WithdrawalConfig> => {
      const { data } = await apiClient.get(API_ENDPOINTS.TRANSACTIONS.WITHDRAWAL_CONFIG);
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Preview withdrawal fee
 */
export const useWithdrawalPreview = () => {
  return useMutation({
    mutationFn: async (amount: number): Promise<WithdrawalPreview> => {
      const { data } = await apiClient.post(API_ENDPOINTS.TRANSACTIONS.WITHDRAWAL_PREVIEW, {
        amount,
      });
      return data;
    },
  });
};

/**
 * Withdraw funds
 */
export const useWithdrawFunds = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: WithdrawFundsDto) => {
      const { data } = await apiClient.post(API_ENDPOINTS.TRANSACTIONS.WITHDRAW, dto);
      return data;
    },
    onSuccess: () => {
      // Invalidate wallet and transactions
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Withdrawal failed. Please try again.';
      Alert.alert('Withdrawal Failed', message);
    },
  });
};

/**
 * Get list of banks
 */
export const useBanks = () => {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['banks'],
    queryFn: async (): Promise<{ banks: Bank[] }> => {
      const { data } = await apiClient.get(API_ENDPOINTS.TRANSACTIONS.BANKS);
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 60, // 1 hour - banks don't change often
  });
};

/**
 * Resolve account number
 */
export const useResolveAccount = () => {
  return useMutation({
    mutationFn: async ({
      accountNumber,
      bankCode,
    }: {
      accountNumber: string;
      bankCode: string;
    }): Promise<ResolveAccountResponse> => {
      const { data } = await apiClient.post(API_ENDPOINTS.TRANSACTIONS.RESOLVE_ACCOUNT, {
        accountNumber,
        bankCode,
      });
      return data;
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || 'Failed to verify account. Please check details.';
      Alert.alert('Verification Failed', message);
    },
  });
};

/**
 * Get user's saved bank accounts
 * TODO: Backend needs to implement this endpoint
 */
export const useBankAccounts = () => {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async (): Promise<BankAccount[]> => {
      // TODO: Implement this endpoint in backend
      // const { data } = await apiClient.get('/users/bank-accounts');
      // return data;
      return [];
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Add bank account
 * TODO: Backend needs to implement this endpoint
 */
export const useAddBankAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: {
      bankName: string;
      bankCode: string;
      accountNumber: string;
      accountName: string;
      isPrimary?: boolean;
    }) => {
      // TODO: Implement this endpoint in backend
      // const { data } = await apiClient.post('/users/bank-accounts', dto);
      // return data;
      throw new Error('Not implemented yet');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to add bank account';
      Alert.alert('Error', message);
    },
  });
};
