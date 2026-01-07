import { apiClient } from '@/src/lib/api/client';

class PaymasterService {
  /**
   * Generate permit data for user to sign
   */
  async generatePermit(params: { walletId: string; amount: string; blockchain: string }) {
    const response = await apiClient.post('/circle/paymaster/generate-permit', params);
    return response.data;
  }

  /**
   * Submit UserOperation with permit signature
   */
  async submitUserOp(params: {
    walletId: string;
    destinationAddress: string;
    amount: string;
    blockchain: string;
    permitSignature: string;
    feeLevel?: string;
    memo?: string;
  }) {
    const response = await apiClient.post('/circle/paymaster/submit-userop', params);
    return response.data;
  }

  /**
   * Get UserOperation status
   */
  async getUserOpStatus(userOpHash: string) {
    const response = await apiClient.get(`/circle/paymaster/userop/${userOpHash}`);
    return response.data;
  }

  /**
   * Get Paymaster events for wallet
   */
  async getWalletEvents(walletId: string) {
    const response = await apiClient.get(`/circle/paymaster/events/${walletId}`);
    return response.data;
  }

  /**
   * Get Paymaster statistics
   */
  async getStats() {
    const response = await apiClient.get('/circle/paymaster/stats');
    return response.data;
  }

  /**
   * Check if wallet is Paymaster compatible
   */
  async checkCompatibility(walletId: string) {
    const response = await apiClient.get(`/circle/paymaster/compatible/${walletId}`);
    return response.data;
  }

  /**
   * Generate permit and get Circle SDK challengeId for signing
   * For user-controlled wallets only
   * Returns a challengeId that must be executed via Circle SDK WebView
   */
  async signPermitChallenge(params: {
    walletId: string;
    amount: string;
    blockchain: string;
    userToken: string;
    destinationAddress?: string;
  }) {
    const response = await apiClient.post('/circle/paymaster/sign-permit-challenge', params);
    return response.data;
  }
}

export const paymasterService = new PaymasterService();
