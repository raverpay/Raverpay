import apiClient from '../api-client';

export type WithdrawalFeeType = 'FLAT' | 'PERCENTAGE';
export type KYCTier = 'TIER_0' | 'TIER_1' | 'TIER_2' | 'TIER_3';

export interface WithdrawalConfig {
  id: string;
  feeType: WithdrawalFeeType;
  feeValue: string;
  minFee: string;
  maxFee: string | null;
  tierLevel: KYCTier | null;
  minWithdrawal: string;
  maxWithdrawal: string;
  isActive: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWithdrawalConfigDto {
  feeType: WithdrawalFeeType;
  feeValue: number;
  minFee: number;
  maxFee?: number;
  tierLevel?: KYCTier;
  minWithdrawal: number;
  maxWithdrawal: number;
  isActive?: boolean;
  description?: string;
}

export interface UpdateWithdrawalConfigDto {
  feeType?: WithdrawalFeeType;
  feeValue?: number;
  minFee?: number;
  maxFee?: number;
  tierLevel?: KYCTier;
  minWithdrawal?: number;
  maxWithdrawal?: number;
  isActive?: boolean;
  description?: string;
}

/**
 * Get all withdrawal configurations (admin)
 */
export const getAllConfigs = async (): Promise<WithdrawalConfig[]> => {
  const response = await apiClient.get('/admin/transactions/withdrawal-configs');
  return response.data;
};

/**
 * Get withdrawal configuration by ID
 */
export const getConfigById = async (id: string): Promise<WithdrawalConfig> => {
  const response = await apiClient.get(`/admin/transactions/withdrawal-configs/${id}`);
  return response.data;
};

/**
 * Create a new withdrawal configuration
 */
export const createConfig = async (
  data: CreateWithdrawalConfigDto,
): Promise<WithdrawalConfig> => {
  const response = await apiClient.post('/admin/transactions/withdrawal-configs', data);
  return response.data;
};

/**
 * Update an existing withdrawal configuration
 */
export const updateConfig = async (
  id: string,
  data: UpdateWithdrawalConfigDto,
): Promise<WithdrawalConfig> => {
  const response = await apiClient.put(`/admin/transactions/withdrawal-configs/${id}`, data);
  return response.data;
};

/**
 * Delete a withdrawal configuration
 */
export const deleteConfig = async (id: string): Promise<void> => {
  await apiClient.delete(`/admin/transactions/withdrawal-configs/${id}`);
};
