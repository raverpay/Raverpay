import apiClient from '../api-client';

export type VTUServiceType = 'AIRTIME' | 'DATA' | 'CABLE_TV' | 'ELECTRICITY';

export interface CashbackConfig {
  id: string;
  serviceType: VTUServiceType;
  percentage: string;
  isActive: boolean;
  provider: string | null;
  minAmount: string;
  maxCashback: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCashbackConfigDto {
  serviceType: VTUServiceType;
  percentage: number;
  isActive?: boolean;
  provider?: string;
  minAmount?: number;
  maxCashback?: number;
  description?: string;
}

export interface UpdateCashbackConfigDto {
  percentage?: number;
  isActive?: boolean;
  minAmount?: number;
  maxCashback?: number;
  description?: string;
}

export interface CashbackAnalytics {
  totalCashbackEarned: number;
  totalCashbackRedeemed: number;
  outstandingBalance: number;
  activeUsers: number;
  transactionsLast24Hours: number;
}

/**
 * Get all cashback configurations (admin)
 */
export const getAllConfigs = async (): Promise<CashbackConfig[]> => {
  const response = await apiClient.get('/cashback/admin/config');
  return response.data;
};

/**
 * Create a new cashback configuration
 */
export const createConfig = async (
  data: CreateCashbackConfigDto,
): Promise<CashbackConfig> => {
  const response = await apiClient.post('/cashback/admin/config', data);
  return response.data;
};

/**
 * Update an existing cashback configuration
 */
export const updateConfig = async (
  id: string,
  data: UpdateCashbackConfigDto,
): Promise<CashbackConfig> => {
  const response = await apiClient.patch(`/cashback/admin/config/${id}`, data);
  return response.data;
};

/**
 * Delete (deactivate) a cashback configuration
 */
export const deleteConfig = async (id: string): Promise<CashbackConfig> => {
  const response = await apiClient.delete(`/cashback/admin/config/${id}`);
  return response.data;
};

/**
 * Get cashback analytics
 */
export const getAnalytics = async (): Promise<CashbackAnalytics> => {
  const response = await apiClient.get('/cashback/admin/analytics');
  return response.data;
};
