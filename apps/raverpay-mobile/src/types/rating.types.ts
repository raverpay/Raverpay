// types/rating.types.ts

/**
 * Rating configuration from backend (admin dashboard)
 */
export interface RatingConfig {
  enabled: boolean;
  promptFrequencyDays: number;
  minTransactionsRequired: number;
  minUsageDaysRequired: number;
  promptTitle: string;
  promptMessage: string;
  iosAppStoreUrl: string;
  androidPlayStoreUrl: string;
}

/**
 * Local rating data stored on device
 */
export interface RatingLocalData {
  lastPromptDate: string | null;
  dismissedPermanently: boolean;
  appOpenCount: number;
  manualRatingClicked: boolean;
  totalPromptsShown: number;
  successfulTransactionCount?: number; // Track local transaction count
}

/**
 * Platform types for app store
 */
export type Platform = 'ios' | 'android';

/**
 * User action when rating prompt is shown
 */
export type RatingAction = 'rate' | 'later' | 'never';

/**
 * API response for rating config
 */
export interface RatingConfigResponse {
  enabled: boolean;
  promptFrequencyDays: number;
  minTransactionsRequired: number;
  minUsageDaysRequired: number;
  promptTitle: string;
  promptMessage: string;
  iosAppStoreUrl: string;
  androidPlayStoreUrl: string;
}
