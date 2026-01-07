// hooks/useShowRatingPrompt.ts
import { ratingService } from '@/src/services/rating.service';
import { useRatingStore } from '@/src/store/rating.store';
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';

/**
 * Event name for triggering rating prompt check after transactions
 */
export const RATING_PROMPT_EVENT = 'RATING_PROMPT_CHECK';

/**
 * Hook to manage rating prompt display logic
 * This is used in the main app layout to show the prompt centrally
 */
export const useShowRatingPrompt = () => {
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);
  const config = useRatingStore((state) => state.config);
  const localData = useRatingStore((state) => state.localData);

  /**
   * Check if we should show the rating prompt
   * This is called after a successful transaction via event
   */
  const checkAndShowPrompt = useCallback(
    async (transactionCount: number) => {
      if (!config || !config.enabled) {
        // console.log("[RatingPrompt] Not showing: Config not enabled");
        return false;
      }

      // Check eligibility (days since install, frequency, not dismissed, etc.)
      const isEligible = ratingService.checkEligibility();
      if (!isEligible) {
        // console.log("[RatingPrompt] Not showing: User not eligible");
        return false;
      }

      // Check minimum transactions requirement
      const meetsTransactionRequirement = ratingService.checkMinTransactions(transactionCount);
      if (!meetsTransactionRequirement) {
        // console.log(
        //   `[RatingPrompt] Not showing: Transaction count ${transactionCount} < required ${config.minTransactionsRequired}`
        // );
        return false;
      }

      // All checks passed, show the prompt
      // console.log("[RatingPrompt] All checks passed! Showing prompt...");
      setShouldShowPrompt(true);
      return true;
    },
    [config],
  );

  /**
   * Listen for transaction completion events
   */
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      RATING_PROMPT_EVENT,
      (transactionCount: number) => {
        checkAndShowPrompt(transactionCount);
      },
    );

    return () => {
      subscription.remove();
    };
  }, [checkAndShowPrompt]);

  /**
   * Close the prompt
   */
  const closePrompt = useCallback(() => {
    setShouldShowPrompt(false);
  }, []);

  return {
    shouldShowPrompt,
    closePrompt,
    config,
    localData,
  };
};

/**
 * Trigger rating prompt check from anywhere in the app
 * Call this after successful transactions
 */
export const triggerRatingPromptCheck = (transactionCount: number) => {
  DeviceEventEmitter.emit(RATING_PROMPT_EVENT, transactionCount);
};
