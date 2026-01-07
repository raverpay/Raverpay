// src/services/circle-web-sdk.service.ts
/**
 * Circle Web SDK Service
 * Manages Circle wallet challenges via WebView
 *
 * This replaces the native React Native SDK approach which had
 * Swift version compatibility issues with Xcode 16.1+
 */

import Constants from 'expo-constants';

export interface CircleWebSDKConfig {
  appId: string;
  endpoint?: string;
}

export interface ChallengeParams {
  userToken: string;
  encryptionKey: string;
  challengeId: string;
}

export interface ChallengeResult {
  success: boolean;
  result?: any;
  error?: string;
}

// Callback type for when a challenge needs to be executed
type ChallengeCallback = (params: {
  appId: string;
  userToken: string;
  encryptionKey: string;
  challengeId: string;
}) => Promise<ChallengeResult>;

class CircleWebSDKService {
  private appId: string = '';
  private endpoint: string = '';
  private initialized = false;
  private challengeCallback: ChallengeCallback | null = null;

  /**
   * Initialize the Circle Web SDK service
   */
  initialize(config: CircleWebSDKConfig): void {
    const envAppId =
      Constants.expoConfig?.extra?.circleAppId || process.env.EXPO_PUBLIC_CIRCLE_APP_ID || '';
    this.appId = config.appId || envAppId;
    this.endpoint = config.endpoint || '';
    this.initialized = true;
    console.log('[CircleWebSDK] Service initialized with appId:', this.appId ? 'set' : 'not set');
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized && !!this.appId;
  }

  /**
   * Get the app ID
   */
  getAppId(): string {
    return this.appId;
  }

  /**
   * Register a callback to handle challenge execution via WebView
   * This should be called by the UI component that manages the WebView
   */
  registerChallengeCallback(callback: ChallengeCallback): void {
    this.challengeCallback = callback;
    console.log('[CircleWebSDK] Challenge callback registered');
  }

  /**
   * Unregister the challenge callback
   */
  unregisterChallengeCallback(): void {
    this.challengeCallback = null;
    console.log('[CircleWebSDK] Challenge callback unregistered');
  }

  /**
   * Execute a challenge (wallet creation, PIN setup, transaction signing)
   * This triggers the WebView to open and handle the challenge
   */
  async executeChallenge(params: ChallengeParams): Promise<ChallengeResult> {
    if (!this.initialized || !this.appId) {
      throw new Error('CircleWebSDK not initialized. Call initialize() first.');
    }

    if (!this.challengeCallback) {
      throw new Error(
        'No challenge callback registered. Make sure CircleChallengeProvider is mounted.',
      );
    }

    console.log('[CircleWebSDK] Executing challenge:', params.challengeId);

    try {
      const result = await this.challengeCallback({
        appId: this.appId,
        userToken: params.userToken,
        encryptionKey: params.encryptionKey,
        challengeId: params.challengeId,
      });

      console.log('[CircleWebSDK] Challenge result:', result.success);
      return result;
    } catch (error) {
      console.error('[CircleWebSDK] Challenge execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute multiple challenges in sequence
   */
  async executeChallenges(
    userToken: string,
    encryptionKey: string,
    challengeIds: string[],
  ): Promise<ChallengeResult> {
    for (const challengeId of challengeIds) {
      const result = await this.executeChallenge({
        userToken,
        encryptionKey,
        challengeId,
      });

      if (!result.success) {
        return result;
      }
    }

    return { success: true };
  }
}

// Export singleton instance
export const circleWebSDKService = new CircleWebSDKService();

// Re-export for backward compatibility with existing code
export { circleWebSDKService as circleSDKService };
