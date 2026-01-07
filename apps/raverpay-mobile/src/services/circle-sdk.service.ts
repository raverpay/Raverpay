// src/services/circle-sdk.service.ts
/**
 * Circle SDK Service
 *
 * NOTE: This file now proxies to circle-web-sdk.service.ts which uses
 * WebView-based Circle Web SDK instead of the native React Native SDK.
 *
 * The native SDK had Swift 6.0 binary compatibility issues with Xcode 16.1+.
 * See: https://github.com/nicholasoxford/buy-domain/issues/1
 *
 * This file maintains the same interface for backward compatibility.
 */

import type { ChallengeResult } from "./circle-web-sdk.service";
import { circleWebSDKService } from "./circle-web-sdk.service";

export interface CircleSDKConfig {
  appId: string;
  endpoint?: string;
}

export interface ExecuteResult {
  result: {
    resultType: "success" | "error";
    data?: any;
    error?: { message: string };
  };
}

// Convert WebView result to legacy format
function toLegacyResult(result: ChallengeResult): ExecuteResult {
  return {
    result: {
      resultType: result.success ? "success" : "error",
      data: result.result,
      error: result.error ? { message: result.error } : undefined,
    },
  };
}

class CircleSDKService {
  private initialized = false;

  /**
   * Initialize the Circle SDK (now uses Web SDK via WebView)
   */
  async initialize(config: CircleSDKConfig): Promise<void> {
    circleWebSDKService.initialize(config);
    this.initialized = true;
    console.log("[CircleSDK] Initialized (using Web SDK via WebView)");
  }

  /**
   * Check if SDK is initialized
   */
  isInitialized(): boolean {
    return this.initialized && circleWebSDKService.isInitialized();
  }

  /**
   * Execute a challenge (e.g., wallet creation, PIN setup)
   */
  async executeChallenge(
    userToken: string,
    encryptionKey: string,
    challengeIds: string[]
  ): Promise<ExecuteResult> {
    console.log("[CircleSDK] Executing challenges via WebView:", challengeIds);

    const result = await circleWebSDKService.executeChallenges(
      userToken,
      encryptionKey,
      challengeIds
    );

    return toLegacyResult(result);
  }

  /**
   * Set security questions
   * Note: With Web SDK, this is handled through executeChallenge
   */
  async setSecurityQuestions(
    userToken: string,
    encryptionKey: string,
    challengeId: string,
    _questions: { question: string; answer: string }[]
  ): Promise<ExecuteResult> {
    console.log("[CircleSDK] Setting security questions via WebView");

    // Web SDK handles security questions through the challenge UI
    const result = await circleWebSDKService.executeChallenge({
      userToken,
      encryptionKey,
      challengeId,
    });

    return toLegacyResult(result);
  }

  /**
   * Set biometrics (PIN)
   * Note: With Web SDK, this is handled through executeChallenge
   */
  async setBiometrics(
    userToken: string,
    encryptionKey: string,
    challengeId: string
  ): Promise<ExecuteResult> {
    console.log("[CircleSDK] Setting biometrics via WebView");

    const result = await circleWebSDKService.executeChallenge({
      userToken,
      encryptionKey,
      challengeId,
    });

    return toLegacyResult(result);
  }

  /**
   * Perform transaction signing
   */
  async performTransaction(
    userToken: string,
    encryptionKey: string,
    challengeId: string
  ): Promise<ExecuteResult> {
    console.log("[CircleSDK] Performing transaction via WebView");

    const result = await circleWebSDKService.executeChallenge({
      userToken,
      encryptionKey,
      challengeId,
    });

    return toLegacyResult(result);
  }

  /**
   * Move PIN input to foreground
   * Note: Not needed with WebView approach
   */
  moveRnTaskToFront(): void {
    // No-op for WebView approach
  }

  /**
   * Set layout provider for custom UI
   * Note: Not applicable to WebView approach
   */
  setLayoutProvider(_provider: any): void {
    console.log("[CircleSDK] setLayoutProvider not available in WebView mode");
  }

  /**
   * Set custom error messages
   * Note: Not applicable to WebView approach
   */
  setErrorStringMap(_errorMap: Record<string, string>): void {
    console.log("[CircleSDK] setErrorStringMap not available in WebView mode");
  }
}

export const circleSDKService = new CircleSDKService();
