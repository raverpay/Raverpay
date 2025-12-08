import apiClient from '../api-client';
import { PaginatedResponse } from '@/types';

// Venly Wallet Types
export interface VenlyWalletUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  hasVenlyWallet: boolean;
  venlyUserId?: string;
  wallets: VenlyWallet[];
  createdAt: string;
}

export interface VenlyWallet {
  id: string;
  venlyWalletId?: string;
  walletAddress?: string;
  chain?: string;
  balance: string;
  createdAt: string;
}

export interface VenlyWalletStats {
  totalUsers: number;
  usersWithWallets: number;
  totalWallets: number;
  adoptionRate: string;
  transactions: {
    byStatus: Array<{
      status: string;
      count: number;
    }>;
  };
}

export interface CryptoTransaction {
  id: string;
  userId: string;
  venlyWalletId?: string;
  type: string;
  amount: string;
  currency: string;
  status: string;
  transactionHash: string;
  fromAddress?: string;
  toAddress?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface CryptoConversion {
  id: string;
  userId: string;
  tokenSymbol: string;
  cryptoAmount: string;
  usdValue: string;
  nairaAmount: string;
  exchangeRate: string;
  status: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  platformFeePercent: string;
  isActive: boolean;
  setBy: string;
  updatedAt: string;
}

export interface VenlyAnalytics {
  byType: Array<{
    type: string;
    count: number;
    volumeUSD: string;
  }>;
  byStatus: Array<{
    status: string;
    count: number;
  }>;
  conversions: {
    totalCount: number;
    totalVolumeUSD: string;
    totalVolumeNGN: string;
    averageAmountUSD: string;
  };
  dailyVolume: Array<{
    date: string;
    count: number;
    volume: string;
  }>;
}

export const venlyWalletsApi = {
  // Wallet Management
  getWallets: async (params?: Record<string, unknown>): Promise<PaginatedResponse<VenlyWalletUser>> => {
    const response = await apiClient.get<PaginatedResponse<VenlyWalletUser>>('/admin/venly-wallets', {
      params,
    });
    return response.data;
  },

  getStats: async (): Promise<VenlyWalletStats> => {
    const response = await apiClient.get<VenlyWalletStats>('/admin/venly-wallets/stats');
    return response.data;
  },

  getUserWallet: async (userId: string): Promise<any> => {
    const response = await apiClient.get(`/admin/venly-wallets/user/${userId}`);
    return response.data;
  },

  // Transaction Management
  getTransactions: async (
    params?: Record<string, unknown>
  ): Promise<PaginatedResponse<CryptoTransaction>> => {
    const response = await apiClient.get<PaginatedResponse<CryptoTransaction>>(
      '/admin/venly-wallets/transactions',
      { params }
    );
    return response.data;
  },

  getTransactionById: async (transactionId: string): Promise<CryptoTransaction> => {
    const response = await apiClient.get<CryptoTransaction>(
      `/admin/venly-wallets/transactions/${transactionId}`
    );
    return response.data;
  },

  flagTransaction: async (transactionId: string, reason: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/admin/venly-wallets/transactions/${transactionId}/flag`, {
      reason,
    });
    return response.data;
  },

  // Conversion Management
  getConversions: async (
    params?: Record<string, unknown>
  ): Promise<PaginatedResponse<CryptoConversion> & { stats: { totalVolumeUSD: string; averageConversionUSD: string } }> => {
    const response = await apiClient.get('/admin/venly-wallets/conversions', { params });
    return response.data;
  },

  // Exchange Rate Management
  getExchangeRates: async (): Promise<ExchangeRate[]> => {
    const response = await apiClient.get<ExchangeRate[]>('/admin/venly-wallets/exchange-rates');
    return response.data;
  },

  updateExchangeRate: async (data: {
    currency: string;
    toNaira: number;
    platformFeePercent?: number;
  }): Promise<ExchangeRate> => {
    const response = await apiClient.patch<ExchangeRate>('/admin/venly-wallets/exchange-rates', data);
    return response.data;
  },

  // Analytics
  getAnalytics: async (params?: Record<string, unknown>): Promise<VenlyAnalytics> => {
    const response = await apiClient.get<VenlyAnalytics>('/admin/venly-wallets/analytics', { params });
    return response.data;
  },
};
