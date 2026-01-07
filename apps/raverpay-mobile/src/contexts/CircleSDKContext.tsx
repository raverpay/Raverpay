// src/contexts/CircleSDKContext.tsx
/**
 * Circle SDK Context
 *
 * This context now uses the WebView-based Circle Web SDK instead of
 * the native React Native SDK due to Swift compatibility issues.
 */

import Constants from "expo-constants";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  CircleChallengeParams,
  CircleChallengeResult,
  CircleChallengeWebView,
} from "../components/circle/CircleChallengeWebView";
import { circleWebSDKService } from "../services/circle-web-sdk.service";

interface CircleSDKContextType {
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  executeChallenge: (
    userToken: string,
    encryptionKey: string,
    challengeIds: string[]
  ) => Promise<any>;
  setBiometrics: (
    userToken: string,
    encryptionKey: string,
    challengeId: string
  ) => Promise<any>;
  setSecurityQuestions: (
    userToken: string,
    encryptionKey: string,
    challengeId: string,
    questions: { question: string; answer: string }[]
  ) => Promise<any>;
  performTransaction: (
    userToken: string,
    encryptionKey: string,
    challengeId: string
  ) => Promise<any>;
}

const CircleSDKContext = createContext<CircleSDKContextType | undefined>(
  undefined
);

interface PendingChallenge {
  params: CircleChallengeParams;
  resolve: (result: CircleChallengeResult) => void;
}

interface CircleSDKProviderProps {
  children: ReactNode;
}

export function CircleSDKProvider({ children }: CircleSDKProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingChallenge, setPendingChallenge] =
    useState<PendingChallenge | null>(null);

  useEffect(() => {
    initializeSDK();
  }, []);

  const initializeSDK = async () => {
    try {
      setIsInitializing(true);
      setError(null);

      // Get Circle App ID from environment variables
      const appId =
        Constants.expoConfig?.extra?.circleAppId ||
        process.env.EXPO_PUBLIC_CIRCLE_APP_ID;

      if (!appId) {
        throw new Error(
          "Circle App ID not configured. Please set EXPO_PUBLIC_CIRCLE_APP_ID in your environment."
        );
      }

      // Initialize the WebView-based service
      circleWebSDKService.initialize({
        appId,
      });

      setIsInitialized(true);
      console.log(
        "[CircleSDKContext] SDK initialized successfully (WebView mode)"
      );
    } catch (err: any) {
      console.error("[CircleSDKContext] SDK initialization failed:", err);
      setError(err.message || "Failed to initialize Circle SDK");
      setIsInitialized(false);
    } finally {
      setIsInitializing(false);
    }
  };

  // Execute challenge by opening WebView
  const executeChallengeViaWebView = useCallback(
    (params: CircleChallengeParams): Promise<CircleChallengeResult> => {
      return new Promise((resolve) => {
        setPendingChallenge({ params, resolve });
      });
    },
    []
  );

  // Register callback with service when it changes
  useEffect(() => {
    circleWebSDKService.registerChallengeCallback(executeChallengeViaWebView);
    return () => {
      circleWebSDKService.unregisterChallengeCallback();
    };
  }, [executeChallengeViaWebView]);

  // Handle WebView completion
  const handleChallengeComplete = useCallback(
    (result: CircleChallengeResult) => {
      if (pendingChallenge) {
        pendingChallenge.resolve(result);
        setPendingChallenge(null);
      }
    },
    [pendingChallenge]
  );

  // Handle WebView close
  const handleChallengeClose = useCallback(() => {
    if (pendingChallenge) {
      pendingChallenge.resolve({
        success: false,
        error: "User cancelled",
      });
      setPendingChallenge(null);
    }
  }, [pendingChallenge]);

  const executeChallenge = async (
    userToken: string,
    encryptionKey: string,
    challengeIds: string[]
  ) => {
    try {
      const appId = circleWebSDKService.getAppId();

      // Execute each challenge in sequence
      for (const challengeId of challengeIds) {
        const result = await executeChallengeViaWebView({
          appId,
          userToken,
          encryptionKey,
          challengeId,
        });

        if (!result.success) {
          return {
            result: {
              resultType: "error" as const,
              error: { message: result.error || "Challenge failed" },
            },
          };
        }
      }

      return {
        result: {
          resultType: "success" as const,
        },
      };
    } catch (err: any) {
      console.error("[CircleSDKContext] Execute challenge error:", err);
      throw err;
    }
  };

  const setBiometrics = async (
    userToken: string,
    encryptionKey: string,
    challengeId: string
  ) => {
    try {
      const appId = circleWebSDKService.getAppId();
      const result = await executeChallengeViaWebView({
        appId,
        userToken,
        encryptionKey,
        challengeId,
      });

      return {
        result: {
          resultType: result.success
            ? ("success" as const)
            : ("error" as const),
          error: result.error ? { message: result.error } : undefined,
        },
      };
    } catch (err: any) {
      console.error("[CircleSDKContext] Set biometrics error:", err);
      throw err;
    }
  };

  const setSecurityQuestions = async (
    userToken: string,
    encryptionKey: string,
    challengeId: string,
    _questions: { question: string; answer: string }[]
  ) => {
    try {
      const appId = circleWebSDKService.getAppId();
      // Web SDK handles security questions through the challenge UI
      const result = await executeChallengeViaWebView({
        appId,
        userToken,
        encryptionKey,
        challengeId,
      });

      return {
        result: {
          resultType: result.success
            ? ("success" as const)
            : ("error" as const),
          error: result.error ? { message: result.error } : undefined,
        },
      };
    } catch (err: any) {
      console.error("[CircleSDKContext] Set security questions error:", err);
      throw err;
    }
  };

  const performTransaction = async (
    userToken: string,
    encryptionKey: string,
    challengeId: string
  ) => {
    try {
      const appId = circleWebSDKService.getAppId();
      const result = await executeChallengeViaWebView({
        appId,
        userToken,
        encryptionKey,
        challengeId,
      });

      return {
        result: {
          resultType: result.success
            ? ("success" as const)
            : ("error" as const),
          data: result.result,
          error: result.error ? { message: result.error } : undefined,
        },
      };
    } catch (err: any) {
      console.error("[CircleSDKContext] Perform transaction error:", err);
      throw err;
    }
  };

  const value: CircleSDKContextType = {
    isInitialized,
    isInitializing,
    error,
    executeChallenge,
    setBiometrics,
    setSecurityQuestions,
    performTransaction,
  };

  return (
    <CircleSDKContext.Provider value={value}>
      {children}

      {/* WebView modal for handling Circle challenges */}
      <CircleChallengeWebView
        visible={!!pendingChallenge}
        params={pendingChallenge?.params ?? null}
        onComplete={handleChallengeComplete}
        onClose={handleChallengeClose}
        title="Secure Wallet"
      />
    </CircleSDKContext.Provider>
  );
}

export function useCircleSDK() {
  const context = useContext(CircleSDKContext);
  if (context === undefined) {
    throw new Error("useCircleSDK must be used within a CircleSDKProvider");
  }
  return context;
}
