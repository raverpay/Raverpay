// src/services/crypto.service.ts
import { apiClient, handleApiError } from '../lib/api/client';
import { API_ENDPOINTS } from '../lib/api/endpoints';
import {
  ConversionQuote,
  ConvertCryptoRequest,
  ConvertCryptoResponse,
  CryptoBalance,
  CryptoConversion,
  CryptoTransaction,
  CryptoWallet,
  DepositInfo,
  ExchangeRate,
  GetConversionQuoteRequest,
  InitializeCryptoWalletResponse,
  SendCryptoRequest,
  SendCryptoResponse,
  TokenSymbol,
} from '../types/crypto.types';

class CryptoService {
  /**
   * Initialize crypto wallet for the user
   */
  async initializeWallet(pin: string): Promise<InitializeCryptoWalletResponse> {
    try {
      const response = await apiClient.post<InitializeCryptoWalletResponse>(
        API_ENDPOINTS.CRYPTO.INITIALIZE,
        { pin },
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get crypto wallet details
   */
  async getWallet(): Promise<CryptoWallet> {
    try {
      const response = await apiClient.get<CryptoWallet>(API_ENDPOINTS.CRYPTO.GET_WALLET);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get deposit information (address + QR code)
   */
  async getDepositInfo(): Promise<DepositInfo> {
    try {
      const response = await apiClient.get<DepositInfo>(API_ENDPOINTS.CRYPTO.DEPOSIT_INFO);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Sync balances from blockchain
   */
  async syncBalances(): Promise<CryptoBalance[]> {
    try {
      const response = await apiClient.post<CryptoBalance[]>(API_ENDPOINTS.CRYPTO.SYNC_BALANCES);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get balance for specific token
   */
  async getBalance(token: TokenSymbol): Promise<CryptoBalance> {
    try {
      const response = await apiClient.get<CryptoBalance>(API_ENDPOINTS.CRYPTO.GET_BALANCE(token));
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Send crypto to external address
   */
  async sendCrypto(data: SendCryptoRequest): Promise<SendCryptoResponse> {
    try {
      const response = await apiClient.post<SendCryptoResponse>(API_ENDPOINTS.CRYPTO.SEND, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get crypto transaction history
   */
  async getTransactions(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ transactions: CryptoTransaction[]; pagination: any }> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CRYPTO.TRANSACTIONS, {
        params,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get transaction details
   */
  async getTransactionDetails(id: string): Promise<CryptoTransaction> {
    try {
      const response = await apiClient.get<CryptoTransaction>(
        API_ENDPOINTS.CRYPTO.TRANSACTION_DETAIL(id),
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get conversion quote
   */
  async getConversionQuote(data: GetConversionQuoteRequest): Promise<ConversionQuote> {
    try {
      const response = await apiClient.post<ConversionQuote>(
        API_ENDPOINTS.CRYPTO.CONVERT_QUOTE,
        data,
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Convert crypto to Naira
   */
  async convertCrypto(data: ConvertCryptoRequest): Promise<ConvertCryptoResponse> {
    try {
      const response = await apiClient.post<ConvertCryptoResponse>(
        API_ENDPOINTS.CRYPTO.CONVERT,
        data,
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get conversion history
   */
  async getConversions(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ conversions: CryptoConversion[]; pagination: any }> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CRYPTO.CONVERSIONS, {
        params,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get current USD to Naira exchange rate
   */
  async getExchangeRate(): Promise<ExchangeRate> {
    try {
      const response = await apiClient.get<ExchangeRate>(API_ENDPOINTS.CRYPTO.EXCHANGE_RATE);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const cryptoService = new CryptoService();
