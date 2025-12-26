'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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

export default function CircleChallengePage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'executing' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const sdkRef = useRef<W3SSdk | null>(null);
  const initStarted = useRef(false);

  // Get params from URL
  const appId = searchParams.get('appId');
  const userToken = searchParams.get('userToken');
  const encryptionKey = searchParams.get('encryptionKey');
  const challengeId = searchParams.get('challengeId');

  // Send message to React Native WebView
  const sendToReactNative = useCallback((type: string, data: object) => {
    if (typeof window !== 'undefined' && window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type, data }));
    }
    console.log('Message to RN:', type, data);
  }, []);

  // Error handler
  const handleError = useCallback((message: string) => {
    setStatus('error');
    setErrorMessage(message);
    sendToReactNative('error', { error: message });
  }, [sendToReactNative]);

  useEffect(() => {
    // Prevent double initialization
    if (initStarted.current) return;
    
    // Validate params before starting
    if (!appId || !userToken || !encryptionKey || !challengeId) {
      // Use setTimeout to avoid setState during render
      const timer = setTimeout(() => {
        handleError('Missing required parameters');
      }, 0);
      return () => clearTimeout(timer);
    }

    initStarted.current = true;

    const initAndExecute = async () => {
      try {
        console.log('Initializing Circle SDK with appId:', appId);
        
        // Initialize SDK
        const sdk = new W3SSdk();
        sdkRef.current = sdk;

        sdk.setAppSettings({ appId });
        sdk.setAuthentication({ userToken, encryptionKey });

        sendToReactNative('initialized', { success: true });
        setStatus('executing');

        // Execute challenge
        sdk.execute(challengeId, (error, result) => {
          if (error) {
            console.error('Challenge error:', error);
            handleError(error.message || 'Challenge failed');
            return;
          }

          console.log('Challenge completed:', result);
          setStatus('success');
          sendToReactNative('challengeComplete', { 
            result: {
              resultType: result.status === 'COMPLETE' ? 'success' : 'failed',
              status: result.status,
              type: result.type,
              data: result.data
            }
          });
        });

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'SDK initialization failed';
        console.error('Init error:', err);
        handleError(errorMsg);
      }
    };

    initAndExecute();
  }, [appId, userToken, encryptionKey, challengeId, sendToReactNative, handleError]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {status === 'loading' && (
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing secure wallet...</p>
        </div>
      )}

      {status === 'executing' && (
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your wallet...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-gray-800 font-semibold">Wallet setup complete!</p>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-red-600 font-semibold mb-2">Something went wrong</p>
          <p className="text-gray-600 text-sm">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
