// src/services/circle.service.ts
import { apiClient, handleApiError } from '../lib/api/client';
import { API_ENDPOINTS } from '../lib/api/endpoints';
import {
  CCTPEstimateRequest,
  CCTPFeeEstimateResponse,
  CCTPTransferRequest,
  CCTPTransferResponse,
  CCTPTransfersResponse,
  CCTPChainsResponse,
  CircleBalanceResponse,
  CircleConfigResponse,
  CircleDepositInfoResponse,
  CircleFeeEstimateResponse,
  CircleTransactionResponse,
  CircleTransactionsResponse,
  CircleUsdcBalanceResponse,
  CircleWalletResponse,
  CircleWalletsResponse,
  CreateCircleWalletRequest,
  CreateCircleWalletResponse,
  EstimateFeeRequest,
  TransferUsdcRequest,
  TransferUsdcResponse,
  ValidateAddressResponse,
  CircleBlockchain,
  CircleTransactionState,
  CCTPTransferState,
  GetChainsResponse,
} from '../types/circle.types';

class CircleService {
  // ============================================
  // CONFIG
  // ============================================

  async getConfig(): Promise<CircleConfigResponse> {
    try {
      const response = await apiClient.get<CircleConfigResponse>(API_ENDPOINTS.CIRCLE.CONFIG);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get supported blockchains with metadata
   */
  async getChains(): Promise<GetChainsResponse> {
    try {
      const response = await apiClient.get<GetChainsResponse>(API_ENDPOINTS.CIRCLE.GET_CHAINS);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // ============================================
  // WALLETS
  // ============================================

  /**
   * Create a new Circle wallet
   */
  async createWallet(data?: CreateCircleWalletRequest): Promise<CreateCircleWalletResponse> {
    try {
      const response = await apiClient.post<CreateCircleWalletResponse>(
        API_ENDPOINTS.CIRCLE.CREATE_WALLET,
        data || {},
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get all user's Circle wallets
   */
  async getWallets(): Promise<CircleWalletsResponse> {
    try {
      const response = await apiClient.get<CircleWalletsResponse>(API_ENDPOINTS.CIRCLE.GET_WALLETS);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get a specific wallet
   */
  async getWallet(walletId: string): Promise<CircleWalletResponse> {
    try {
      const response = await apiClient.get<CircleWalletResponse>(
        API_ENDPOINTS.CIRCLE.GET_WALLET(walletId),
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get wallet balance (all tokens)
   */
  async getWalletBalance(walletId: string): Promise<CircleBalanceResponse> {
    try {
      const response = await apiClient.get<CircleBalanceResponse>(
        API_ENDPOINTS.CIRCLE.GET_WALLET_BALANCE(walletId),
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get USDC balance only
   */
  async getUsdcBalance(walletId: string): Promise<CircleUsdcBalanceResponse> {
    try {
      const response = await apiClient.get<CircleUsdcBalanceResponse>(
        API_ENDPOINTS.CIRCLE.GET_USDC_BALANCE(walletId),
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get deposit info (addresses for receiving USDC)
   */
  async getDepositInfo(blockchain?: string): Promise<CircleDepositInfoResponse> {
    try {
      const response = await apiClient.get<CircleDepositInfoResponse>(
        API_ENDPOINTS.CIRCLE.GET_DEPOSIT_INFO,
        { params: blockchain ? { blockchain } : undefined },
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Update wallet metadata (name)
   */
  async updateWallet(walletId: string, data: { name?: string }): Promise<CircleWalletResponse> {
    try {
      const response = await apiClient.put<CircleWalletResponse>(
        API_ENDPOINTS.CIRCLE.UPDATE_WALLET(walletId),
        data,
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // ============================================
  // TRANSACTIONS
  // ============================================

  /**
   * Transfer USDC
   */
  async transferUsdc(data: TransferUsdcRequest): Promise<TransferUsdcResponse> {
    try {
      const response = await apiClient.post<TransferUsdcResponse>(
        API_ENDPOINTS.CIRCLE.TRANSFER_USDC,
        data,
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get user's transactions
   */
  async getTransactions(params?: {
    type?: string;
    state?: CircleTransactionState;
    limit?: number;
    offset?: number;
  }): Promise<CircleTransactionsResponse> {
    try {
      const response = await apiClient.get<CircleTransactionsResponse>(
        API_ENDPOINTS.CIRCLE.GET_TRANSACTIONS,
        { params },
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get a specific transaction
   */
  async getTransaction(transactionId: string): Promise<CircleTransactionResponse> {
    try {
      const response = await apiClient.get<CircleTransactionResponse>(
        API_ENDPOINTS.CIRCLE.GET_TRANSACTION(transactionId),
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Estimate transfer fee
   */
  async estimateFee(data: EstimateFeeRequest): Promise<CircleFeeEstimateResponse> {
    try {
      const response = await apiClient.post<CircleFeeEstimateResponse>(
        API_ENDPOINTS.CIRCLE.ESTIMATE_FEE,
        data,
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Cancel a pending transaction
   */
  async cancelTransaction(transactionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        API_ENDPOINTS.CIRCLE.CANCEL_TRANSACTION(transactionId),
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Accelerate a stuck transaction
   */
  async accelerateTransaction(
    transactionId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        API_ENDPOINTS.CIRCLE.ACCELERATE_TRANSACTION(transactionId),
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Validate an address
   */
  async validateAddress(
    address: string,
    blockchain: CircleBlockchain,
  ): Promise<ValidateAddressResponse> {
    try {
      const response = await apiClient.post<ValidateAddressResponse>(
        API_ENDPOINTS.CIRCLE.VALIDATE_ADDRESS,
        { address, blockchain },
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // ============================================
  // CCTP (Cross-Chain)
  // ============================================

  /**
   * Initiate a CCTP cross-chain transfer
   */
  async initiateCCTPTransfer(data: CCTPTransferRequest): Promise<CCTPTransferResponse> {
    try {
      const response = await apiClient.post<CCTPTransferResponse>(
        API_ENDPOINTS.CIRCLE.CCTP_TRANSFER,
        data,
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get user's CCTP transfers
   */
  async getCCTPTransfers(params?: {
    state?: CCTPTransferState;
    limit?: number;
    offset?: number;
  }): Promise<CCTPTransfersResponse> {
    try {
      const response = await apiClient.get<CCTPTransfersResponse>(
        API_ENDPOINTS.CIRCLE.GET_CCTP_TRANSFERS,
        { params },
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get a specific CCTP transfer
   */
  async getCCTPTransfer(transferId: string): Promise<CCTPTransferResponse> {
    try {
      const response = await apiClient.get<CCTPTransferResponse>(
        API_ENDPOINTS.CIRCLE.GET_CCTP_TRANSFER(transferId),
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Cancel a pending CCTP transfer
   */
  async cancelCCTPTransfer(transferId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        API_ENDPOINTS.CIRCLE.CANCEL_CCTP_TRANSFER(transferId),
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Estimate CCTP transfer fee
   */
  async estimateCCTPFee(data: CCTPEstimateRequest): Promise<CCTPFeeEstimateResponse> {
    try {
      const response = await apiClient.post<CCTPFeeEstimateResponse>(
        API_ENDPOINTS.CIRCLE.ESTIMATE_CCTP_FEE,
        data,
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get supported CCTP chains
   */
  async getSupportedCCTPChains(): Promise<CCTPChainsResponse> {
    try {
      const response = await apiClient.get<CCTPChainsResponse>(
        API_ENDPOINTS.CIRCLE.GET_CCTP_CHAINS,
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // ============================================
  // PRICES
  // ============================================

  /**
   * Get current crypto prices (ETH, USDC, POL, etc.)
   */
  async getPrices(): Promise<{
    success: boolean;
    data: {
      prices: Record<string, number>;
      updatedAt: string;
    };
  }> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: {
          prices: Record<string, number>;
          updatedAt: string;
        };
      }>('/v1/crypto/prices');
      return response.data;
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
      // Return default prices if fetch fails
      return {
        success: false,
        data: {
          prices: {
            USDC: 1.0,
            USDT: 1.0,
          },
          updatedAt: new Date().toISOString(),
        },
      };
    }
  }
}

export const circleService = new CircleService();
