// src/hooks/useCircleWallet.ts
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '../lib/utils/toast';
import { circleService } from '../services/circle.service';
import { useAuthStore } from '../store/auth.store';
import { useCircleStore } from '../store/circle.store';
import {
  CCTPEstimateRequest,
  CCTPTransferRequest,
  CCTPTransferState,
  CircleBlockchain,
  CircleTransactionState,
  CreateCircleWalletRequest,
  EstimateFeeRequest,
  TransferUsdcRequest,
} from '../types/circle.types';

/**
 * Get Circle configuration
 */
export const useCircleConfig = () => {
  const { setConfig, setIsLoadingConfig } = useCircleStore();
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['circle-config'],
    queryFn: async () => {
      setIsLoadingConfig(true);
      try {
        const response = await circleService.getConfig();
        setConfig(response.data);
        return response.data;
      } finally {
        setIsLoadingConfig(false);
      }
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get supported blockchains
 */
export const useCircleChains = () => {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['circle-chains'],
    queryFn: async () => {
      const response = await circleService.getChains();
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 60, // 1 hour (chains don't change often)
  });
};

/**
 * Get user's Circle wallets
 */
export const useCircleWallets = () => {
  const { setWallets, setIsLoadingWallets } = useCircleStore();
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['circle-wallets'],
    queryFn: async () => {
      setIsLoadingWallets(true);
      try {
        const response = await circleService.getWallets();
        setWallets(response.data);
        return response.data;
      } finally {
        setIsLoadingWallets(false);
      }
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60, // 1 minute
  });
};

/**
 * Get a specific Circle wallet
 */
export const useCircleWallet = (walletId: string) => {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['circle-wallet', walletId],
    queryFn: async () => {
      const response = await circleService.getWallet(walletId);
      return response.data;
    },
    enabled: isAuthenticated && !!walletId,
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Create a new Circle wallet
 */
export const useCreateCircleWallet = () => {
  const queryClient = useQueryClient();
  const { addWallet, setIsCreatingWallet } = useCircleStore();

  return useMutation({
    mutationFn: async (data?: CreateCircleWalletRequest) => {
      setIsCreatingWallet(true);
      try {
        return await circleService.createWallet(data);
      } finally {
        setIsCreatingWallet(false);
      }
    },
    onSuccess: (response) => {
      // Create a wallet object from the response
      const wallet = {
        id: response.data.walletId,
        circleWalletId: response.data.walletId,
        walletSetId: '',
        userId: '',
        address: response.data.address,
        blockchain: response.data.blockchain,
        accountType: response.data.accountType,
        state: response.data.state,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addWallet(wallet);
      queryClient.invalidateQueries({ queryKey: ['circle-wallets'] });
      toast.success({
        title: 'Wallet Created',
        message: 'Your Circle USDC wallet has been created successfully!',
      });
    },
    onError: (error: Error) => {
      toast.error({
        title: 'Failed to Create Wallet',
        message: error.message || 'Something went wrong',
      });
    },
  });
};

/**
 * Get wallet balance
 */
export const useCircleWalletBalance = (walletId: string) => {
  const { setBalances, setIsLoadingBalances } = useCircleStore();
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['circle-wallet-balance', walletId],
    queryFn: async () => {
      setIsLoadingBalances(true);
      try {
        const response = await circleService.getWalletBalance(walletId);
        setBalances(walletId, response.data.balances);
        return response.data;
      } finally {
        setIsLoadingBalances(false);
      }
    },
    enabled: isAuthenticated && !!walletId,
    staleTime: 1000 * 15, // 15 seconds (reduced for faster updates)
    refetchInterval: 1000 * 30, // Refresh every 30 seconds (increased frequency)
  });
};

/**
 * Get all wallet balances - Hook to fetch balances for multiple wallets
 */
export const useAllWalletBalances = (walletIds: string[]) => {
  const { setBalances, setIsLoadingBalances } = useCircleStore();
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['circle-all-wallet-balances', walletIds.join(',')],
    queryFn: async () => {
      setIsLoadingBalances(true);
      try {
        const balancePromises = walletIds.map((walletId) =>
          circleService.getWalletBalance(walletId),
        );
        const responses = await Promise.all(balancePromises);

        // Update store with all balances
        responses.forEach((response, index) => {
          setBalances(walletIds[index], response.data.balances);
        });

        return responses.map((r) => r.data);
      } finally {
        setIsLoadingBalances(false);
      }
    },
    enabled: isAuthenticated && walletIds.length > 0,
    staleTime: 1000 * 15, // 15 seconds 
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes
  });
};

/**
 * Get USDC balance for a wallet
 */
export const useCircleUsdcBalance = (walletId: string) => {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['circle-usdc-balance', walletId],
    queryFn: async () => {
      const response = await circleService.getUsdcBalance(walletId);
      return response.data;
    },
    enabled: isAuthenticated && !!walletId,
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Get deposit info for receiving USDC
 */
export const useCircleDepositInfo = (blockchain?: string) => {
  const { setDepositInfo } = useCircleStore();
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['circle-deposit-info', blockchain],
    queryFn: async () => {
      const response = await circleService.getDepositInfo(blockchain);
      setDepositInfo(response.data);
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: Infinity, // Address doesn't change
  });
};

/**
 * Transfer USDC
 */
export const useTransferUsdc = () => {
  const queryClient = useQueryClient();
  const { setIsTransferring } = useCircleStore();

  return useMutation({
    mutationFn: async (data: TransferUsdcRequest) => {
      setIsTransferring(true);
      try {
        return await circleService.transferUsdc(data);
      } finally {
        setIsTransferring(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circle-wallets'] });
      queryClient.invalidateQueries({ queryKey: ['circle-wallet-balance'] });
      queryClient.invalidateQueries({ queryKey: ['circle-transactions'] });
      toast.success({
        title: 'Transfer Initiated',
        message: 'Your USDC transfer has been submitted!',
      });
    },
    onError: (error: Error) => {
      toast.error({
        title: 'Transfer Failed',
        message: error.message || 'Failed to send USDC',
      });
    },
  });
};

/**
 * Estimate transfer fee
 */
export const useEstimateFee = () => {
  return useMutation({
    mutationFn: (data: EstimateFeeRequest) => circleService.estimateFee(data),
  });
};

/**
 * Validate an address
 */
export const useValidateAddress = () => {
  return useMutation({
    mutationFn: ({ address, blockchain }: { address: string; blockchain: CircleBlockchain }) =>
      circleService.validateAddress(address, blockchain),
  });
};

/**
 * Get Circle transactions
 */
export const useCircleTransactions = (params?: {
  type?: string;
  state?: CircleTransactionState;
  limit?: number;
}) => {
  const { isAuthenticated } = useAuthStore();

  return useInfiniteQuery({
    queryKey: ['circle-transactions', params],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await circleService.getTransactions({
        ...params,
        offset: pageParam,
        limit: params?.limit || 20,
      });
      return response;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.flatMap((p) => p.data).length;
      if (lastPage.data.length < (params?.limit || 20)) {
        return undefined;
      }
      return totalFetched;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Get a specific transaction
 */
export const useCircleTransaction = (transactionId: string, options?: { enabled?: boolean }) => {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['circle-transaction', transactionId],
    queryFn: async () => {
      const response = await circleService.getTransaction(transactionId);
      return response.data;
    },
    enabled: isAuthenticated && !!transactionId && (options?.enabled ?? true),
    staleTime: 1000 * 10, // 10 seconds - refresh frequently for pending txs
  });
};

/**
 * Cancel a pending transaction
 */
export const useCancelTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string) => circleService.cancelTransaction(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circle-transactions'] });
      toast.success({
        title: 'Transaction Cancelled',
        message: 'Your transaction has been cancelled',
      });
    },
    onError: (error: Error) => {
      toast.error({
        title: 'Cancel Failed',
        message: error.message || 'Failed to cancel transaction',
      });
    },
  });
};

/**
 * Accelerate a stuck transaction
 */
export const useAccelerateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string) => circleService.accelerateTransaction(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circle-transactions'] });
      toast.success({
        title: 'Transaction Accelerated',
        message: 'Your transaction has been accelerated',
      });
    },
    onError: (error: Error) => {
      toast.error({
        title: 'Acceleration Failed',
        message: error.message || 'Failed to accelerate transaction',
      });
    },
  });
};

// ============================================
// CCTP (Cross-Chain) Hooks
// ============================================

/**
 * Get supported CCTP chains
 */
export const useCCTPChains = () => {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['cctp-chains'],
    queryFn: async () => {
      const response = await circleService.getSupportedCCTPChains();
      return response.data.chains;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

/**
 * Initiate CCTP transfer
 */
export const useCCTPTransfer = () => {
  const queryClient = useQueryClient();
  const { setIsTransferring } = useCircleStore();

  return useMutation({
    mutationFn: async (data: CCTPTransferRequest) => {
      setIsTransferring(true);
      try {
        return await circleService.initiateCCTPTransfer(data);
      } finally {
        setIsTransferring(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circle-wallets'] });
      queryClient.invalidateQueries({ queryKey: ['circle-wallet-balance'] });
      queryClient.invalidateQueries({ queryKey: ['cctp-transfers'] });
      toast.success({
        title: 'Cross-Chain Transfer Initiated',
        message: 'Your USDC is being transferred across chains',
      });
    },
    onError: (error: Error) => {
      toast.error({
        title: 'Transfer Failed',
        message: error.message || 'Failed to initiate cross-chain transfer',
      });
    },
  });
};

/**
 * Get CCTP transfers
 */
export const useCCTPTransfers = (params?: { state?: CCTPTransferState; limit?: number }) => {
  const { isAuthenticated } = useAuthStore();

  return useInfiniteQuery({
    queryKey: ['cctp-transfers', params],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await circleService.getCCTPTransfers({
        ...params,
        offset: pageParam,
        limit: params?.limit || 20,
      });
      return response;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.flatMap((p) => p.data).length;
      if (lastPage.data.length < (params?.limit || 20)) {
        return undefined;
      }
      return totalFetched;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Get a specific CCTP transfer
 */
export const useCCTPTransfer_Single = (transferId: string, options?: { enabled?: boolean }) => {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['cctp-transfer', transferId],
    queryFn: async () => {
      const response = await circleService.getCCTPTransfer(transferId);
      return response.data;
    },
    enabled: isAuthenticated && !!transferId && (options?.enabled ?? true),
    staleTime: 1000 * 10, // 10 seconds - refresh frequently
    refetchInterval: 1000 * 30, // Auto refresh every 30s for pending transfers
  });
};

/**
 * Estimate CCTP fee
 */
export const useEstimateCCTPFee = () => {
  return useMutation({
    mutationFn: (data: CCTPEstimateRequest) => circleService.estimateCCTPFee(data),
  });
};

/**
 * Cancel CCTP transfer
 */
export const useCancelCCTPTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transferId: string) => circleService.cancelCCTPTransfer(transferId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cctp-transfers'] });
      toast.success({
        title: 'Transfer Cancelled',
        message: 'Your cross-chain transfer has been cancelled',
      });
    },
    onError: (error: Error) => {
      toast.error({
        title: 'Cancel Failed',
        message: error.message || 'Failed to cancel transfer',
      });
    },
  });
};
