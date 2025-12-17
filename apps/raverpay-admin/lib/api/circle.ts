import apiClient from '../api-client';
import { PaginatedResponse } from '@/types';

// Circle Types
export type CircleBlockchain =
  | 'ETH'
  | 'ETH-SEPOLIA'
  | 'MATIC'
  | 'MATIC-AMOY'
  | 'ARB'
  | 'ARB-SEPOLIA'
  | 'SOL'
  | 'SOL-DEVNET'
  | 'AVAX'
  | 'AVAX-FUJI';

export type CircleWalletState = 'LIVE' | 'FROZEN';
export type CircleTransactionState =
  | 'INITIATED'
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETE'
  | 'FAILED'
  | 'CANCELLED'
  | 'DENIED';
export type CCTPTransferState =
  | 'INITIATED'
  | 'BURN_PENDING'
  | 'BURN_COMPLETE'
  | 'ATTESTATION_PENDING'
  | 'ATTESTATION_COMPLETE'
  | 'MINT_PENDING'
  | 'COMPLETE'
  | 'FAILED'
  | 'CANCELLED';

export interface CircleWallet {
  id: string;
  circleWalletId: string;
  walletSetId: string;
  userId: string;
  address: string;
  blockchain: CircleBlockchain;
  accountType: 'EOA' | 'SCA';
  state: CircleWalletState;
  name?: string;
  custodyType: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
}

export interface CircleWalletSet {
  id: string;
  circleWalletSetId: string;
  userId: string;
  name?: string;
  custodyType: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  _count?: {
    wallets: number;
  };
}

export interface CircleTransaction {
  id: string;
  circleTransactionId: string;
  walletId: string;
  userId: string;
  type: 'INBOUND' | 'OUTBOUND';
  state: CircleTransactionState;
  sourceAddress?: string;
  destinationAddress: string;
  amount: string;
  tokenSymbol: string;
  blockchain: CircleBlockchain;
  transactionHash?: string;
  gasUsed?: string;
  networkFee?: string;
  memo?: string;
  errorReason?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  wallet?: CircleWallet;
}

export interface CCTPTransfer {
  id: string;
  userId: string;
  sourceWalletId: string;
  destinationAddress: string;
  sourceChain: CircleBlockchain;
  destinationChain: CircleBlockchain;
  amount: string;
  state: CCTPTransferState;
  transferType: 'FAST' | 'STANDARD';
  burnTxHash?: string;
  mintTxHash?: string;
  attestationHash?: string;
  estimatedTime?: number;
  totalFee?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface CircleWebhookLog {
  id: string;
  eventType: string;
  eventId: string;
  payload: Record<string, unknown>;
  processed: boolean;
  processedAt?: string;
  error?: string;
  createdAt: string;
}

export interface CircleStats {
  totalWalletSets: number;
  totalWallets: number;
  totalTransactions: number;
  totalCCTPTransfers: number;
  transactionsByState: Array<{ state: string; count: number }>;
  transactionsByType: Array<{ type: string; count: number }>;
  walletsByBlockchain: Array<{ blockchain: string; count: number }>;
  totalVolume: string;
  recentActivity: {
    lastTransaction?: CircleTransaction;
    lastCCTPTransfer?: CCTPTransfer;
  };
}

export interface CircleConfig {
  environment: 'testnet' | 'mainnet';
  supportedBlockchains: CircleBlockchain[];
  defaultBlockchain: CircleBlockchain;
  isConfigured: boolean;
}

export const circleApi = {
  // Config
  getConfig: async (): Promise<CircleConfig> => {
    const response = await apiClient.get<{ success: boolean; data: CircleConfig }>(
      '/admin/circle/config',
    );
    return response.data.data;
  },

  // Stats
  getStats: async (): Promise<CircleStats> => {
    const response = await apiClient.get<{ success: boolean; data: CircleStats }>(
      '/admin/circle/stats',
    );
    return response.data.data;
  },

  // Wallet Sets
  getWalletSets: async (
    params?: Record<string, unknown>,
  ): Promise<PaginatedResponse<CircleWalletSet>> => {
    const response = await apiClient.get<PaginatedResponse<CircleWalletSet>>(
      '/admin/circle/wallet-sets',
      { params },
    );
    return response.data;
  },

  getWalletSetById: async (id: string): Promise<CircleWalletSet> => {
    const response = await apiClient.get<{ success: boolean; data: CircleWalletSet }>(
      `/admin/circle/wallet-sets/${id}`,
    );
    return response.data.data;
  },

  // Wallets
  getWallets: async (params?: Record<string, unknown>): Promise<PaginatedResponse<CircleWallet>> => {
    const response = await apiClient.get<PaginatedResponse<CircleWallet>>('/admin/circle/wallets', {
      params,
    });
    return response.data;
  },

  getWalletById: async (id: string): Promise<CircleWallet> => {
    const response = await apiClient.get<{ success: boolean; data: CircleWallet }>(
      `/admin/circle/wallets/${id}`,
    );
    return response.data.data;
  },

  getWalletsByUser: async (userId: string): Promise<CircleWallet[]> => {
    const response = await apiClient.get<{ success: boolean; data: CircleWallet[] }>(
      `/admin/circle/wallets/user/${userId}`,
    );
    return response.data.data;
  },

  // Transactions
  getTransactions: async (
    params?: Record<string, unknown>,
  ): Promise<PaginatedResponse<CircleTransaction>> => {
    const response = await apiClient.get<PaginatedResponse<CircleTransaction>>(
      '/admin/circle/transactions',
      { params },
    );
    return response.data;
  },

  getTransactionById: async (id: string): Promise<CircleTransaction> => {
    const response = await apiClient.get<{ success: boolean; data: CircleTransaction }>(
      `/admin/circle/transactions/${id}`,
    );
    return response.data.data;
  },

  // CCTP Transfers
  getCCTPTransfers: async (
    params?: Record<string, unknown>,
  ): Promise<PaginatedResponse<CCTPTransfer>> => {
    const response = await apiClient.get<PaginatedResponse<CCTPTransfer>>(
      '/admin/circle/cctp-transfers',
      { params },
    );
    return response.data;
  },

  getCCTPTransferById: async (id: string): Promise<CCTPTransfer> => {
    const response = await apiClient.get<{ success: boolean; data: CCTPTransfer }>(
      `/admin/circle/cctp-transfers/${id}`,
    );
    return response.data.data;
  },

  // Webhook Logs
  getWebhookLogs: async (
    params?: Record<string, unknown>,
  ): Promise<PaginatedResponse<CircleWebhookLog>> => {
    const response = await apiClient.get<PaginatedResponse<CircleWebhookLog>>(
      '/admin/circle/webhook-logs',
      { params },
    );
    return response.data;
  },

  // Analytics
  getAnalytics: async (params?: {
    startDate?: string;
    endDate?: string;
    blockchain?: CircleBlockchain;
  }): Promise<{
    dailyVolume: Array<{ date: string; volume: string; count: number }>;
    byBlockchain: Array<{ blockchain: string; volume: string; count: number }>;
    byState: Array<{ state: string; count: number }>;
  }> => {
    const response = await apiClient.get('/admin/circle/analytics', { params });
    return response.data.data;
  },
};

