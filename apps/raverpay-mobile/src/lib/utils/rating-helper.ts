// lib/utils/rating-helper.ts
import { triggerRatingPromptCheck } from '@/src/hooks/useShowRatingPrompt';
import { useRatingStore } from '@/src/store/rating.store';

/**
 * Call this function after ANY successful transaction (airtime, data, cable, electricity, etc.)
 * to automatically check if the user is eligible for the rating prompt.
 *
 * This will:
 * 1. Increment the local transaction count
 * 2. Check if user meets all rating criteria (min transactions, days since install, frequency, etc.)
 * 3. Show the rating modal if eligible
 *
 * The rating modal is shown globally in _layout.tsx, so you only need to call this function
 * after successful transactions.
 *
 * @example
 * ```tsx
 * import { handleSuccessfulTransaction } from "@/src/lib/utils/rating-helper";
 *
 * // In your transaction success handler:
 * onSuccess: async () => {
 *   // Your existing success logic...
 *   queryClient.invalidateQueries({ queryKey: ["wallet"] });
 *
 *   // Trigger rating prompt check
 *   await handleSuccessfulTransaction();
 *
 *   router.back();
 * }
 * ```
 */
export const handleSuccessfulTransaction = async () => {
  try {
    const { incrementTransactionCount } = useRatingStore.getState();

    // Increment local transaction count
    await incrementTransactionCount();

    // Get updated count AFTER increment
    const { localData } = useRatingStore.getState();
    const transactionCount = localData.successfulTransactionCount || 0;

    console.log(`[RatingHelper] Transaction completed. Count: ${transactionCount}`);

    // Trigger rating prompt check with updated count
    triggerRatingPromptCheck(transactionCount);
  } catch (error) {
    // Fail silently - rating prompt should not break transaction flow
    console.error('[RatingHelper] Failed to handle transaction:', error);
  }
};
