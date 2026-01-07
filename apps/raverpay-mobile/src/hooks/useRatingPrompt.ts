// hooks/useRatingPrompt.ts
import { apiClient } from '@/src/lib/api/client';
import { API_ENDPOINTS } from '@/src/lib/api/endpoints';
import { ratingService } from '@/src/services/rating.service';
import { useRatingStore } from '@/src/store/rating.store';
import { RatingConfigResponse } from '@/src/types/rating.types';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

/**
 * Fetch rating configuration from backend
 * This is a public endpoint (no auth required)
 */
export const useRatingConfig = () => {
  const setConfig = useRatingStore((state) => state.setConfig);

  const query = useQuery({
    queryKey: ['rating', 'config'],
    queryFn: async (): Promise<RatingConfigResponse> => {
      const { data } = await apiClient.get<RatingConfigResponse>(
        API_ENDPOINTS.APP_CONFIG.RATING_PROMPT,
      );
      return data;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24, // 24 hours (formerly cacheTime)
    retry: 2,
  });

  // React Query v5: Use useEffect instead of onSuccess
  useEffect(() => {
    if (query.data) {
      setConfig(query.data);
    }
  }, [query.data, setConfig]);

  useEffect(() => {
    if (query.error) {
      console.error('[RatingConfig] Failed to fetch config:', query.error);
      // Use cached config if available
    }
  }, [query.error]);

  return query;
};

/**
 * Hook to check eligibility and manage rating prompt state
 */
export const useRatingEligibility = (transactionCount: number = 0) => {
  const config = useRatingStore((state) => state.config);
  const localData = useRatingStore((state) => state.localData);

  const isEligible = ratingService.checkEligibility();
  const meetsTransactionRequirement = ratingService.checkMinTransactions(transactionCount);

  return {
    isEligible: isEligible && meetsTransactionRequirement,
    config,
    localData,
    canShowPrompt: isEligible && meetsTransactionRequirement,
  };
};

/**
 * Hook to handle opening app store
 */
export const useOpenAppStore = () => {
  return useMutation({
    mutationFn: async () => {
      await ratingService.openAppStore();
    },
    onError: (error) => {
      console.error('[OpenAppStore] Failed:', error);
    },
  });
};

/**
 * Hook to track app opens
 */
export const useTrackAppOpen = () => {
  return useMutation({
    mutationFn: async () => {
      await ratingService.trackAppOpen();
    },
  });
};
