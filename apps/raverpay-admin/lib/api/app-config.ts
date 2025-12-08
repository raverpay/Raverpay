import apiClient from '../api-client';

export interface AppRatingConfig {
  id: string;
  enabled: boolean;
  promptFrequencyDays: number;
  minTransactionsRequired: number;
  minUsageDaysRequired: number;
  promptTitle: string;
  promptMessage: string;
  iosAppStoreUrl: string;
  androidPlayStoreUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateRatingConfigDto {
  enabled?: boolean;
  promptFrequencyDays?: number;
  minTransactionsRequired?: number;
  minUsageDaysRequired?: number;
  promptTitle?: string;
  promptMessage?: string;
  iosAppStoreUrl?: string;
  androidPlayStoreUrl?: string;
}

/**
 * Get rating prompt configuration
 */
export const getRatingConfig = async (): Promise<AppRatingConfig> => {
  const response = await apiClient.get('/app-config/rating-prompt');
  return response.data;
};

/**
 * Update rating configuration (admin only)
 */
export const updateRatingConfig = async (data: UpdateRatingConfigDto): Promise<AppRatingConfig> => {
  const response = await apiClient.patch('/app-config/admin/rating-prompt', data);
  return response.data;
};
