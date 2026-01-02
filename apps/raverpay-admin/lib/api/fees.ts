import apiClient from '../api-client';

/**
 * Fee Management API
 * Handles transaction fee configuration, collection wallet management, and retry logic
 */

// Types
export interface FeeConfig {
  enabled: boolean;
  percentage: number;
  minFeeUsdc: number;
  collectionWallets: Record<string, string>;
}

export interface FeeStats {
  totalCollected: string;
  todayCollected: string;
  thisWeekCollected: string;
  thisMonthCollected: string;
  successRate: number;
  failedCount: number;
  pendingRetries: number;
  collectedCount: number;
  averageFee: string;
}

export interface FeeCalculation {
  amount: number;
  fee: number;
  total: number;
  percentage: number;
  minFee: number;
}

export interface FailedFee {
  id: string;
  mainTransferId: string;
  userId: string;
  walletId: string;
  collectionWallet: string;
  fee: string;
  blockchain: string;
  retryCount: number;
  maxRetries: number;
  lastError: string;
  lastRetryAt?: string;
  nextRetryAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface UpdateFeeConfigDto {
  enabled?: boolean;
  percentage?: number;
  minFeeUsdc?: number;
  collectionWallets?: Record<string, string>;
}

// API Client
export const feesApi = {
  /**
   * Get current fee configuration
   */
  getConfig: async () => {
    const response = await apiClient.get<{
      success: boolean;
      data: FeeConfig;
    }>('/circle/fees/config');
    return response.data;
  },

  /**
   * Update fee configuration (admin only)
   */
  updateConfig: async (config: UpdateFeeConfigDto) => {
    const response = await apiClient.put<{
      success: boolean;
      message: string;
      data: FeeConfig;
    }>('/circle/fees/config', config);
    return response.data;
  },

  /**
   * Calculate fee for a given amount
   */
  calculateFee: async (amount: number) => {
    const response = await apiClient.get<{
      success: boolean;
      data: FeeCalculation;
    }>(`/circle/fees/calculate?amount=${amount}`);
    return response.data;
  },

  /**
   * Get fee collection statistics (admin only)
   */
  getStats: async () => {
    const response = await apiClient.get<{
      success: boolean;
      data: FeeStats;
    }>('/circle/fees/stats');
    return response.data;
  },

  /**
   * Get list of failed fee collections (admin only)
   */
  getFailedFees: async () => {
    const response = await apiClient.get<{
      success: boolean;
      data: FailedFee[];
    }>('/circle/fees/failed');
    return response.data;
  },

  /**
   * Manually retry a failed fee collection (admin only)
   */
  retryFee: async (retryId: string) => {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
    }>(`/circle/fees/retry/${retryId}`);
    return response.data;
  },
};
