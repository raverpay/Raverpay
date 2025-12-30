'use client';

import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';

// Extend Window interface for ReactNativeWebView
declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

function CircleChallengeContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'ready' | 'executing' | 'success' | 'error'>(
    'loading',
  );
  const [errorMessage, setErrorMessage] = useState('');
  const sdkRef = useRef<W3SSdk | null>(null);
  const executionStarted = useRef(false);

  // Get params from URL
  const appId = searchParams.get('appId');
  const userToken = searchParams.get('userToken');
  const encryptionKey = searchParams.get('encryptionKey');
  const challengeId = searchParams.get('challengeId');

  // Log params on every render for debugging
  console.log('=== Circle Challenge Params ===');
  console.log('appId:', appId);
  console.log('userToken length:', userToken?.length);
  console.log('encryptionKey:', encryptionKey);
  console.log('encryptionKey length:', encryptionKey?.length);
  console.log('challengeId:', challengeId);
  console.log('==============================');

  // Send message to React Native WebView
  const sendToReactNative = useCallback((type: string, data: object) => {
    if (typeof window !== 'undefined' && window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type, data }));
    }
    console.log('Message to RN:', type, data);
  }, []);

  // Initialize SDK once on mount
  useEffect(() => {
    console.log('[CircleSDK] Creating SDK instance...');
    const sdk = new W3SSdk();
    sdkRef.current = sdk;
    console.log('[CircleSDK] SDK instance created');
    setStatus('ready');

    return () => {
      console.log('[CircleSDK] Cleaning up SDK instance');
      sdkRef.current = null;
    };
  }, []);

  // Execute challenge when SDK is ready and we have params
  useEffect(() => {
    if (status !== 'ready') return;
    if (!appId || !userToken || !encryptionKey || !challengeId) {
      console.error('[CircleSDK] Missing required parameters');
      setStatus('error');
      setErrorMessage('Missing required parameters');
      sendToReactNative('error', { error: 'Missing required parameters' });
      return;
    }
    if (executionStarted.current) return;

    executionStarted.current = true;
    const sdk = sdkRef.current;

    if (!sdk) {
      console.error('[CircleSDK] SDK not initialized');
      setStatus('error');
      setErrorMessage('SDK not initialized');
      sendToReactNative('error', { error: 'SDK not initialized' });
      return;
    }

    console.log('[CircleSDK] Setting app settings...');
    sdk.setAppSettings({ appId });

    console.log('[CircleSDK] Setting authentication...');
    console.log('[CircleSDK] userToken (first 50 chars):', userToken.substring(0, 50));
    console.log('[CircleSDK] encryptionKey:', encryptionKey);
    sdk.setAuthentication({ userToken, encryptionKey });

    sendToReactNative('initialized', { success: true });
    setStatus('executing');

    console.log('[CircleSDK] Executing challenge:', challengeId);
    // Following Circle's reference implementation - only check for error
    // If no error, the challenge completed successfully
    sdk.execute(challengeId, (error: any) => {
      if (error) {
        console.error('=== Circle SDK Error ===');
        console.error('Full error object:', error);
        console.error('error.code:', error?.code);
        console.error('error.message:', error?.message);
        console.error('========================');

        setStatus('error');
        setErrorMessage(error.message || 'Challenge failed');
        sendToReactNative('error', {
          error: error.message || 'Challenge failed',
          code: error.code,
          details: JSON.stringify(error),
        });
        return;
      }

      // No error = success (matching Circle's reference implementation)
      console.log('[CircleSDK] Challenge completed successfully - no error returned');
      setStatus('success');
      sendToReactNative('challengeComplete', {
        result: {
          resultType: 'success',
          status: 'COMPLETE',
          type: 'INITIALIZE',
        },
      });
    });
  }, [status, appId, userToken, encryptionKey, challengeId, sendToReactNative]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      {(status === 'loading' || status === 'ready') && (
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Initializing secure wallet...</p>
        </div>
      )}

      {status === 'executing' && (
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Setting up your wallet...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-gray-800 dark:text-white font-semibold">Wallet setup complete!</p>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <p className="text-red-600 font-semibold mb-2">Something went wrong</p>
          <p className="text-gray-600 dark:text-gray-400 text-sm break-words">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}

export default function CircleChallengePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <CircleChallengeContent />
    </Suspense>
  );
}
