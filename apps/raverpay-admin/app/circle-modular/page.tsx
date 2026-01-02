'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { parseUnits, createPublicClient, type Hex } from 'viem';
import { polygonAmoy } from 'viem/chains';
import {
  createBundlerClient,
  toWebAuthnAccount,
} from 'viem/account-abstraction';
import {
  toCircleSmartAccount,
  toWebAuthnCredential,
  toModularTransport,
  toPasskeyTransport,
  WebAuthnMode,
  encodeTransfer,
  ContractAddress,
} from '@circle-fin/modular-wallets-core';

// Types
type Step = 'loading' | 'register' | 'login' | 'create-wallet' | 'send' | 'success' | 'error';

interface WalletData {
  address: string;
  credentialId: string;
  publicKey: string;
}

export default function CircleModularPage() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('loading');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  
  // Get params from URL
  const action = searchParams.get('action'); // 'register' | 'login' | 'send'
  const userToken = searchParams.get('token');
  const userId = searchParams.get('userId');
  const username = searchParams.get('username');
  const blockchain = searchParams.get('blockchain') || 'MATIC-AMOY';
  
  // Circle SDK config
  const clientUrl = process.env.NEXT_PUBLIC_CIRCLE_API_URL || 'https://api.circle.com/v1/w3s';
  const clientKey = process.env.NEXT_PUBLIC_CIRCLE_API_KEY || '';

  useEffect(() => {
    console.log('CircleModularPage Params:', { 
      action, 
      userId, 
      username, 
      hasToken: !!userToken,
      clientUrl,
      hasClientKey: !!clientKey, 
      origin: typeof window !== 'undefined' ? window.location.origin : 'server'
    });

    if (!action || !userToken || !userId) {
      setError('Missing required parameters');
      setStep('error');
      return;
    }

    // Set initial step based on action
    if (action === 'register') {
      setStep('register');
    } else if (action === 'login') {
      setStep('login');
    } else if (action === 'send') {
      setStep('send');
    }
  }, [action, userToken, userId, clientUrl, clientKey]);

  // Send message to React Native WebView
  const sendToApp = (type: string, data: any) => {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type, data }));
    }
  };

  // Register passkey
  const handleRegister = async () => {
    try {
      setLoading(true);
      setError('');

      // Create transports
      const passkeyTransport = toPasskeyTransport(clientUrl, clientKey);

      // Register passkey
      const credential = await toWebAuthnCredential({
        transport: passkeyTransport,
        mode: WebAuthnMode.Register,
        username: username || `user_${userId}`,
      });

      // Save credential to backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/circle/modular/passkey/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          credentialId: credential.id,
          publicKey: credential.publicKey,
          rpId: credential.rpId,
          username: username || `user_${userId}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save passkey');
      }

      // Store credential for wallet creation
      localStorage.setItem('circle_credential', JSON.stringify(credential));

      // Send success to app
      sendToApp('passkey_registered', {
        credentialId: credential.id,
        publicKey: credential.publicKey,
      });

      setStep('create-wallet');
    } catch (err: any) {
      console.error('Registration Error Full Object:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
      console.error('Registration Error Details:', {
        message: err.message,
        stack: err.stack,
        code: err.code,
        details: err.details,
        name: err.name,
        meta: err.meta, // Viem often puts details here
        cause: err.cause,
      });

      // Special handling for common WebAuthn errors
      let errorMessage = err.message || 'Failed to register passkey';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Passkey creation was cancelled or timed out.';
      } else if (err.name === 'SecurityError') {
        errorMessage = 'Security Error: WebAuthn requires HTTPS or localhost. ' + window.location.origin;
      }

      setError(errorMessage);
      setStep('error');
      sendToApp('error', { 
        message: errorMessage,
        raw: JSON.stringify(err, Object.getOwnPropertyNames(err))
      });
    } finally {
      setLoading(false);
    }
  };

  // Login with passkey
  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');

      // Create transports
      const passkeyTransport = toPasskeyTransport(clientUrl, clientKey);

      // Login with passkey
      const credential = await toWebAuthnCredential({
        transport: passkeyTransport,
        mode: WebAuthnMode.Login,
      });

      // Update last used
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/circle/modular/passkey/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          credentialId: credential.id,
        }),
      });

      // Store credential
      localStorage.setItem('circle_credential', JSON.stringify(credential));

      // Send success to app
      sendToApp('passkey_login_success', {
        credentialId: credential.id,
      });

      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to login with passkey');
      setStep('error');
      sendToApp('error', { message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Create wallet
  const handleCreateWallet = async () => {
    try {
      setLoading(true);
      setError('');

      // Get stored credential
      const credentialStr = localStorage.getItem('circle_credential');
      if (!credentialStr) {
        throw new Error('No credential found. Please register first.');
      }

      const credential = JSON.parse(credentialStr);

      // Create transports
      const modularTransport = toModularTransport(`${clientUrl}/polygonAmoy`, clientKey);

      // Create public client
      const publicClient = createPublicClient({
        chain: polygonAmoy,
        transport: modularTransport,
      });

      // Create bundler client
      const bundlerClient = createBundlerClient({
        chain: polygonAmoy,
        transport: modularTransport,
      });

      // Create smart account
      const smartAccount = await toCircleSmartAccount({
        client: publicClient,
        owner: toWebAuthnAccount({ credential }),
        name: username || `Wallet_${userId}`,
      });

      // Save wallet to backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/circle/modular/wallets/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          circleWalletId: smartAccount.address, // Using address as wallet ID
          address: smartAccount.address,
          blockchain: 'MATIC-AMOY',
          name: username || `Wallet_${userId}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save wallet');
      }

      const walletInfo: WalletData = {
        address: smartAccount.address,
        credentialId: credential.id,
        publicKey: credential.publicKey,
      };

      setWalletData(walletInfo);

      // Send success to app
      sendToApp('wallet_created', walletInfo);

      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to create wallet');
      setStep('error');
      sendToApp('error', { message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Send transaction with paymaster
  const handleSend = async () => {
    try {
      setLoading(true);
      setError('');

      const to = searchParams.get('to');
      const amount = searchParams.get('amount');

      if (!to || !amount) {
        throw new Error('Missing transaction parameters');
      }

      // Get stored credential
      const credentialStr = localStorage.getItem('circle_credential');
      if (!credentialStr) {
        throw new Error('No credential found. Please login first.');
      }

      const credential = JSON.parse(credentialStr);

      // Create transports
      const modularTransport = toModularTransport(`${clientUrl}/polygonAmoy`, clientKey);

      // Create clients
      const publicClient = createPublicClient({
        chain: polygonAmoy,
        transport: modularTransport,
      });

      const bundlerClient = createBundlerClient({
        chain: polygonAmoy,
        transport: modularTransport,
      });

      // Create smart account
      const smartAccount = await toCircleSmartAccount({
        client: publicClient,
        owner: toWebAuthnAccount({ credential }),
      });

      // Create USDC transfer calldata
      const callData = encodeTransfer(
        to as `0x${string}`,
        ContractAddress.PolygonAmoy_USDC,
        parseUnits(amount, 6), // USDC has 6 decimals
      );

      // Send with paymaster (gas paid in USDC)
      const userOpHash = await bundlerClient.sendUserOperation({
        account: smartAccount,
        calls: [callData],
        paymaster: true, // Enable paymaster
      });

      // Wait for receipt
      const { receipt } = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });

      // Send success to app
      sendToApp('transaction_success', {
        userOpHash,
        transactionHash: receipt.transactionHash,
      });

      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to send transaction');
      setStep('error');
      sendToApp('error', { message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Circle Modular Wallet</h1>
          <p className="text-gray-600 mt-2">Gasless transactions with passkey security</p>
        </div>

        {/* Loading */}
        {step === 'loading' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
            <p className="text-gray-600 mt-4">Initializing...</p>
          </div>
        )}

        {/* Register */}
        {step === 'register' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                You'll be prompted to create a passkey using your device's biometric authentication (Face ID, Touch ID, or fingerprint).
              </p>
            </div>
            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Registering...' : 'Register Passkey'}
            </button>
          </div>
        )}

        {/* Login */}
        {step === 'login' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Use your biometric authentication to login with your passkey.
              </p>
            </div>
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Logging in...' : 'Login with Passkey'}
            </button>
          </div>
        )}

        {/* Create Wallet */}
        {step === 'create-wallet' && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                ✓ Passkey registered successfully! Now let's create your smart wallet.
              </p>
            </div>
            <button
              onClick={handleCreateWallet}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Creating Wallet...' : 'Create Smart Wallet'}
            </button>
          </div>
        )}

        {/* Send */}
        {step === 'send' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                ⚡ Gas fees will be paid in USDC (gasless transaction)
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">To: {searchParams.get('to')}</p>
              <p className="text-sm text-gray-600">Amount: {searchParams.get('amount')} USDC</p>
            </div>
            <button
              onClick={handleSend}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Sending...' : 'Confirm & Send'}
            </button>
          </div>
        )}

        {/* Success */}
        {step === 'success' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Success!</h2>
            {walletData && (
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <p className="text-xs text-gray-500 mb-1">Wallet Address:</p>
                <p className="text-sm font-mono break-all">{walletData.address}</p>
              </div>
            )}
            <p className="text-gray-600">You can close this window</p>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full mx-auto flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Error</h2>
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-lg hover:bg-gray-300 transition-all"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Extend Window interface for React Native WebView
declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}
