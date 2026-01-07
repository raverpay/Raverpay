import { useState } from 'react';
import { paymasterService } from '../services/paymaster.service';

export interface PermitData {
  typedData: any;
  permitAmount: string;
  paymasterAddress: string;
  usdcAddress: string;
  estimatedGasUsdc?: string;
}

export interface UserOpStatus {
  userOpHash: string;
  status: string;
  estimatedGasUsdc: string;
  actualGasUsdc?: string;
  transactionHash?: string;
}

export function usePaymaster() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate permit data for user to sign
   */
  const generatePermit = async (params: {
    walletId: string;
    amount: string;
    blockchain: string;
  }): Promise<PermitData | null> => {
    setLoading(true);
    setError(null);

    try {
      const permitData = await paymasterService.generatePermit(params);
      return permitData;
    } catch (err: any) {
      setError(err.message || 'Failed to generate permit');
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Submit UserOperation with permit signature
   */
  const submitUserOp = async (params: {
    walletId: string;
    destinationAddress: string;
    amount: string;
    blockchain: string;
    permitSignature: string;
    feeLevel?: string;
    memo?: string;
  }): Promise<UserOpStatus | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await paymasterService.submitUserOp(params);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to submit UserOperation');
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get UserOperation status
   */
  const getUserOpStatus = async (userOpHash: string): Promise<UserOpStatus | null> => {
    setLoading(true);
    setError(null);

    try {
      const status = await paymasterService.getUserOpStatus(userOpHash);
      return status;
    } catch (err: any) {
      setError(err.message || 'Failed to get UserOperation status');
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get Paymaster events for wallet
   */
  const getWalletEvents = async (walletId: string) => {
    setLoading(true);
    setError(null);

    try {
      const events = await paymasterService.getWalletEvents(walletId);
      return events;
    } catch (err: any) {
      setError(err.message || 'Failed to get wallet events');
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign permit via Circle SDK challenge
   * For user-controlled wallets only
   * Returns challengeId to execute via Circle WebView
   */
  const signPermitChallenge = async (params: {
    walletId: string;
    amount: string;
    blockchain: string;
    userToken: string;
    destinationAddress?: string;
  }): Promise<{
    challengeId: string;
    permitData: PermitData;
    walletId: string;
    blockchain: string;
    userToken?: string; // Fresh token from backend
    encryptionKey?: string; // Fresh encryption key from backend
  } | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await paymasterService.signPermitChallenge(params);
      return result.data;
    } catch (err: any) {
      setError(err.message || 'Failed to sign permit challenge');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    generatePermit,
    submitUserOp,
    getUserOpStatus,
    getWalletEvents,
    signPermitChallenge,
  };
}
