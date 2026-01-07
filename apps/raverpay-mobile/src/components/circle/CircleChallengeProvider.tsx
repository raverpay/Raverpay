// src/components/circle/CircleChallengeProvider.tsx
/**
 * Provider component that manages Circle SDK challenges via WebView
 * Wrap your app with this to enable Circle wallet functionality
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  CircleChallengeWebView,
  CircleChallengeParams,
  CircleChallengeResult,
} from './CircleChallengeWebView';
import { circleWebSDKService } from '@/src/services/circle-web-sdk.service';

interface PendingChallenge {
  params: CircleChallengeParams;
  resolve: (result: CircleChallengeResult) => void;
  reject: (error: Error) => void;
}

interface CircleChallengeContextType {
  executeChallenge: (params: CircleChallengeParams) => Promise<CircleChallengeResult>;
  isExecuting: boolean;
}

const CircleChallengeContext = createContext<CircleChallengeContextType | null>(null);

export const useCircleChallenge = () => {
  const context = useContext(CircleChallengeContext);
  if (!context) {
    throw new Error('useCircleChallenge must be used within CircleChallengeProvider');
  }
  return context;
};

interface CircleChallengeProviderProps {
  children: React.ReactNode;
  appId?: string;
}

export const CircleChallengeProvider: React.FC<CircleChallengeProviderProps> = ({
  children,
  appId,
}) => {
  const [pendingChallenge, setPendingChallenge] = useState<PendingChallenge | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Initialize the service
  useEffect(() => {
    if (appId) {
      circleWebSDKService.initialize({ appId });
    }
  }, [appId]);

  // Execute challenge function
  const executeChallenge = useCallback(
    (params: CircleChallengeParams): Promise<CircleChallengeResult> => {
      return new Promise((resolve, reject) => {
        setIsExecuting(true);
        setPendingChallenge({ params, resolve, reject });
      });
    },
    [],
  );

  // Register callback with service
  useEffect(() => {
    circleWebSDKService.registerChallengeCallback(executeChallenge);
    return () => {
      circleWebSDKService.unregisterChallengeCallback();
    };
  }, [executeChallenge]);

  // Handle challenge completion
  const handleComplete = useCallback(
    (result: CircleChallengeResult) => {
      if (pendingChallenge) {
        pendingChallenge.resolve(result);
        setPendingChallenge(null);
        setIsExecuting(false);
      }
    },
    [pendingChallenge],
  );

  // Handle close
  const handleClose = useCallback(() => {
    if (pendingChallenge) {
      pendingChallenge.resolve({
        success: false,
        error: 'User cancelled',
      });
      setPendingChallenge(null);
      setIsExecuting(false);
    }
  }, [pendingChallenge]);

  return (
    <CircleChallengeContext.Provider value={{ executeChallenge, isExecuting }}>
      {children}
      <CircleChallengeWebView
        visible={!!pendingChallenge}
        params={pendingChallenge?.params ?? null}
        onComplete={handleComplete}
        onClose={handleClose}
        title="Secure Wallet"
      />
    </CircleChallengeContext.Provider>
  );
};
