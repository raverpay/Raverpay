// services/rating.service.ts
import { useRatingStore } from '@/src/store/rating.store';
import { useUserStore } from '@/src/store/user.store';
import { RatingAction, Platform as RatingPlatform } from '@/src/types/rating.types';
import * as StoreReview from 'expo-store-review';
import { Alert, Linking, Platform } from 'react-native';

class RatingService {
  /**
   * Check if user is eligible to see rating prompt
   * Based on admin dashboard configuration
   */
  checkEligibility(): boolean {
    const { config, localData } = useRatingStore.getState();
    const { user } = useUserStore.getState();

    // console.log("[RatingService] Checking eligibility...");
    // console.log("[RatingService] Config:", config);
    // console.log("[RatingService] Local data:", localData);
    // console.log("[RatingService] User createdAt:", user?.createdAt);

    // Feature disabled
    if (!config || !config.enabled) {
      console.log('[RatingService] ❌ Feature not enabled');
      return false;
    }

    // User dismissed permanently
    if (localData.dismissedPermanently) {
      //console.log("[RatingService] ❌ User dismissed permanently");
      return false;
    }

    // Check minimum usage days
    if (user?.createdAt) {
      const userCreatedDate = new Date(user.createdAt);
      const daysSinceInstall = Math.floor(
        (Date.now() - userCreatedDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      // console.log(
      //   `[RatingService] Days since install: ${daysSinceInstall} (required: ${config.minUsageDaysRequired})`
      // );

      if (daysSinceInstall < config.minUsageDaysRequired) {
        //console.log("[RatingService] ❌ Not enough days since install");
        return false;
      }
    } else {
      // console.log(
      //   "[RatingService] ⚠️ No user.createdAt found, skipping days check"
      // );
    }

    // Check frequency (days since last prompt)
    if (localData.lastPromptDate) {
      const lastPromptDate = new Date(localData.lastPromptDate);
      const daysSinceLastPrompt = Math.floor(
        (Date.now() - lastPromptDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      // console.log(
      //   `[RatingService] Days since last prompt: ${daysSinceLastPrompt} (required: ${config.promptFrequencyDays})`
      // );

      if (daysSinceLastPrompt < config.promptFrequencyDays) {
        // console.log("[RatingService] ❌ Too soon since last prompt");
        return false;
      }
    } else {
      //console.log("[RatingService] ✅ No previous prompt, first time eligible");
    }

    // All checks passed
    // console.log("[RatingService] ✅ All eligibility checks passed!");
    return true;
  }

  /**
   * Check if user meets minimum transaction requirement
   * This should be called with actual transaction count from API
   */
  checkMinTransactions(transactionCount: number): boolean {
    const { config } = useRatingStore.getState();
    if (!config) return false;
    return transactionCount >= config.minTransactionsRequired;
  }

  /**
   * Open app store for rating
   * Uses native store review if available, otherwise opens store URL
   */
  async openAppStore(): Promise<void> {
    const { config } = useRatingStore.getState();

    // console.log("[RatingService] 🌟 Opening app store for rating...");
    // console.log("[RatingService] Platform:", Platform.OS);
    // console.log("[RatingService] Config:", config);

    try {
      // Check if in-app review is available (iOS 10.3+ / Android 5.0+)
      const isAvailable = await StoreReview.isAvailableAsync();
      // console.log(
      //   "[RatingService] StoreReview.isAvailableAsync():",
      //   isAvailable
      // );

      // TEMPORARY: Force URL method for testing - Apple throttles native review prompts
      // Set to false to use native review again
      const forceUrlMethod = true;

      if (isAvailable && !forceUrlMethod) {
        // Use native in-app review
        //  console.log("[RatingService] ✅ Using native in-app review");
        await StoreReview.requestReview();
        // console.log("[RatingService] ✅ In-app review requested");
      } else {
        // Fallback to opening store URL
        const storeUrl =
          Platform.OS === 'ios' ? config?.iosAppStoreUrl : config?.androidPlayStoreUrl;

        // console.log(
        //   forceUrlMethod
        //     ? "[RatingService] 🔧 Force URL mode - opening store directly:"
        //     : "[RatingService] ⚠️ In-app review not available, using URL:",
        //   storeUrl
        // );

        if (storeUrl) {
          const canOpen = await Linking.canOpenURL(storeUrl);
          // console.log("[RatingService] Can open URL:", canOpen);
          if (canOpen) {
            console.log('[RatingService] ✅ Opening store URL...');
            await Linking.openURL(storeUrl);
            // console.log("[RatingService] ✅ Store URL opened");
          } else {
            throw new Error('Cannot open store URL');
          }
        } else {
          throw new Error('No store URL configured');
        }
      }

      // Record that user clicked rating
      await useRatingStore.getState().recordRatingClicked();
      //console.log("[RatingService] ✅ Rating click recorded");
    } catch (error) {
      console.error('[RatingService] ❌ Failed to open app store:', error);
      Alert.alert(
        'Unable to Open Store',
        'Please rate us directly from the App Store or Play Store.',
      );
    }
  }

  /**
   * Get store URL based on platform
   */
  getStoreUrl(): string | null {
    const { config } = useRatingStore.getState();
    if (!config) return null;

    return Platform.OS === 'ios' ? config.iosAppStoreUrl : config.androidPlayStoreUrl;
  }

  /**
   * Handle user action on rating prompt
   */
  async handleRatingAction(action: RatingAction): Promise<void> {
    // console.log(`[RatingService] 👆 User action: ${action}`);

    switch (action) {
      case 'rate':
        // console.log("[RatingService] User chose to rate the app");
        await this.openAppStore();
        await useRatingStore.getState().recordPromptShown();
        // console.log("[RatingService] ✅ Prompt shown recorded");
        break;

      case 'later':
        // console.log("[RatingService] User chose 'Maybe Later'");
        await useRatingStore.getState().recordPromptDismissed(false);
        //  console.log("[RatingService] ✅ Prompt dismissed (temporary)");
        break;

      case 'never':
        // console.log("[RatingService] User chose 'Don't ask again'");
        await useRatingStore.getState().recordPromptDismissed(true);
        // console.log("[RatingService] ✅ Prompt dismissed (permanently)");
        break;
    }
  }

  /**
   * Increment app open count (call on app launch)
   */
  async trackAppOpen(): Promise<void> {
    await useRatingStore.getState().incrementAppOpenCount();
  }

  /**
   * Get current platform
   */
  getPlatform(): RatingPlatform {
    return Platform.OS as RatingPlatform;
  }
}

export const ratingService = new RatingService();
