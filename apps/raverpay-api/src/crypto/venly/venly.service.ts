import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { VenlyAuthService } from './venly-auth.service';
import {
  VENLY_BASE_URL,
  VenlyApiResponse,
  CreateVenlyUserRequest,
  CreateVenlyUserResponse,
  CreateVenlyWalletRequest,
  VenlyWallet,
  VenlyNativeBalance,
  VenlyTokenBalance,
  ExecuteTransactionRequest,
  ExecuteTransactionResponse,
  TransactionStatus,
  VenlyUser,
  POLYGON_TOKEN_ADDRESSES,
  POLYGON_AMOY_TOKEN_ADDRESSES,
} from './venly.types';

/**
 * Venly API Service
 * Handles all interactions with Venly's blockchain infrastructure
 * Based on official Venly API Reference
 */
@Injectable()
export class VenlyService {
  private readonly logger = new Logger(VenlyService.name);
  private readonly httpClient: AxiosInstance;
  private readonly baseUrl: string;

  constructor(private readonly venlyAuth: VenlyAuthService) {
    const environment = venlyAuth.getEnvironment();
    this.baseUrl = VENLY_BASE_URL[environment];

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`Venly API initialized with base URL: ${this.baseUrl}`);
  }

  /**
   * Create a new Venly user with PIN signing method (ONE CALL)
   * This is the efficient way - creates user + PIN in one call (50 CUs instead of 100)
   */
  async createUser(params: {
    reference: string;
    pin: string;
  }): Promise<CreateVenlyUserResponse> {
    try {
      this.logger.log(
        `Creating Venly user with reference: ${params.reference}`,
      );

      const headers = await this.venlyAuth.getAuthHeaders();

      const requestBody: CreateVenlyUserRequest = {
        reference: params.reference,
        signingMethod: {
          type: 'PIN',
          value: params.pin,
        },
      };

      const response = await this.httpClient.post<
        VenlyApiResponse<CreateVenlyUserResponse>
      >('/users', requestBody, { headers });

      if (!response.data.success) {
        throw new Error('Venly API returned success: false');
      }

      this.logger.log(
        `Venly user created successfully: ${response.data.result.id}`,
      );

      return response.data.result;
    } catch (error) {
      this.logger.error('Failed to create Venly user', error);

      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          'Response data:',
          JSON.stringify(error.response.data),
        );
      }

      throw new Error('Failed to create crypto wallet user');
    }
  }

  /**
   * Get user details including signing methods
   */
  async getUser(userId: string): Promise<VenlyUser> {
    try {
      const headers = await this.venlyAuth.getAuthHeaders();

      const response = await this.httpClient.get<VenlyApiResponse<VenlyUser>>(
        `/users/${userId}`,
        { headers },
      );

      if (!response.data.success) {
        throw new Error('Venly API returned success: false');
      }

      return response.data.result;
    } catch (error) {
      this.logger.error(`Failed to get user: ${userId}`, error);
      throw new Error('Failed to fetch user details');
    }
  }

  /**
   * Create a new wallet for a Venly user
   */
  async createWallet(params: {
    userId: string;
    identifier?: string;
    description?: string;
    signingMethod: string; // Format: {signingMethodId}:{pin}
  }): Promise<VenlyWallet> {
    try {
      this.logger.log(`Creating MATIC wallet for user: ${params.userId}`);

      const headers = await this.venlyAuth.getAuthHeaders();

      const requestBody: CreateVenlyWalletRequest = {
        secretType: 'MATIC',
        userId: params.userId,
        identifier: params.identifier,
        description: params.description || 'RaverPay Crypto Wallet',
      };

      const response = await this.httpClient.post<
        VenlyApiResponse<VenlyWallet>
      >('/wallets', requestBody, {
        headers: {
          ...headers,
          'Signing-Method': params.signingMethod,
        },
      });

      if (!response.data.success) {
        throw new Error('Venly API returned success: false');
      }

      this.logger.log(
        `Wallet created successfully: ${response.data.result.address}`,
      );

      return response.data.result;
    } catch (error) {
      this.logger.error('Failed to create Venly wallet', error);

      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          'Response data:',
          JSON.stringify(error.response.data),
        );
      }

      throw new Error('Failed to create crypto wallet');
    }
  }

  /**
   * Get wallet by ID
   */
  async getWallet(walletId: string): Promise<VenlyWallet> {
    try {
      const headers = await this.venlyAuth.getAuthHeaders();

      const response = await this.httpClient.get<VenlyApiResponse<VenlyWallet>>(
        `/wallets/${walletId}`,
        { headers },
      );

      if (!response.data.success) {
        throw new Error('Venly API returned success: false');
      }

      return response.data.result;
    } catch (error) {
      this.logger.error(`Failed to get wallet: ${walletId}`, error);
      throw new Error('Failed to fetch wallet details');
    }
  }

  /**
   * Get native balance (MATIC)
   * Retries on SSL/network errors
   */
  async getWalletBalance(walletId: string): Promise<VenlyNativeBalance> {
    const maxRetries = 3;
    const baseDelay = 1000;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const headers = await this.venlyAuth.getAuthHeaders();

        const response = await this.httpClient.get<
          VenlyApiResponse<VenlyNativeBalance>
        >(`/wallets/${walletId}/balance`, { headers });

        if (!response.data.success) {
          throw new Error('Venly API returned success: false');
        }

        return response.data.result;
      } catch (error) {
        lastError = error as Error;

        // Check if it's a retryable error (SSL, network, timeout)
        if (this.isRetryableError(error) && attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          this.logger.warn(
            `Retryable error fetching wallet balance for ${walletId} (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`,
            error instanceof AxiosError ? error.message : String(error),
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue; // Retry
        }

        // Non-retryable error or max retries reached
        this.logger.error(`Failed to get wallet balance: ${walletId}`, error);
        throw new Error('Failed to fetch wallet balance');
      }
    }

    throw lastError || new Error('Failed to fetch wallet balance');
  }

  /**
   * Check if error is retryable (SSL, network, timeout errors)
   */
  private isRetryableError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      const code = error.code;
      const message = error.message?.toLowerCase() || '';

      // SSL/TLS errors
      if (
        code === 'ERR_SSL_SSLV3_ALERT_BAD_RECORD_MAC' ||
        code === 'ECONNRESET' ||
        code === 'ETIMEDOUT' ||
        code === 'ENOTFOUND' ||
        code === 'ECONNREFUSED' ||
        message.includes('ssl') ||
        message.includes('tls') ||
        message.includes('network') ||
        message.includes('timeout')
      ) {
        return true;
      }

      // 5xx server errors (retryable)
      if (error.response?.status && error.response.status >= 500) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get ERC20 token balances
   * Retries on SSL/network errors
   */
  async getTokenBalances(walletId: string): Promise<VenlyTokenBalance[]> {
    const maxRetries = 3;
    const baseDelay = 1000;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const headers = await this.venlyAuth.getAuthHeaders();

        const response = await this.httpClient.get<
          VenlyApiResponse<VenlyTokenBalance[]>
        >(`/wallets/${walletId}/balance/tokens`, {
          headers,
          params: {
            includePossibleSpam: false,
          },
        });

        if (!response.data.success) {
          throw new Error('Venly API returned success: false');
        }

        return response.data.result || [];
      } catch (error) {
        lastError = error as Error;

        // Check if it's a retryable error
        if (this.isRetryableError(error) && attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          this.logger.warn(
            `Retryable error fetching token balances for ${walletId} (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`,
            error instanceof AxiosError ? error.message : String(error),
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue; // Retry
        }

        // Non-retryable error or max retries reached
        this.logger.error(`Failed to get token balances: ${walletId}`, error);
        throw new Error('Failed to fetch token balances');
      }
    }

    throw lastError || new Error('Failed to fetch token balances');
  }

  /**
   * Get specific token balance
   */
  async getTokenBalance(
    walletId: string,
    tokenAddress: string,
  ): Promise<VenlyTokenBalance | null> {
    try {
      const balances = await this.getTokenBalances(walletId);

      const tokenBalance = balances.find(
        (token) =>
          token.tokenAddress.toLowerCase() === tokenAddress.toLowerCase(),
      );

      return tokenBalance || null;
    } catch (error) {
      this.logger.error(
        `Failed to get token balance for wallet: ${walletId}, token: ${tokenAddress}`,
        error,
      );
      throw new Error('Failed to fetch token balance');
    }
  }

  /**
   * Execute a transaction (send crypto/tokens)
   * Uses official Venly API format
   */
  async executeTransaction(params: {
    walletId: string;
    to: string;
    type: 'TRANSFER' | 'TOKEN_TRANSFER';
    value?: number | string;
    tokenAddress?: string;
    signingMethod: string; // Format: {signingMethodId}:{pin}
  }): Promise<ExecuteTransactionResponse> {
    try {
      this.logger.log(
        `Executing ${params.type} transaction from wallet: ${params.walletId}`,
      );

      const headers = await this.venlyAuth.getAuthHeaders();

      const requestBody: ExecuteTransactionRequest = {
        transactionRequest: {
          type: params.type,
          walletId: params.walletId,
          to: params.to,
          secretType: 'MATIC',
        },
      };

      if (params.type === 'TRANSFER') {
        // For native MATIC transfers
        requestBody.transactionRequest.value = params.value;
      } else if (params.type === 'TOKEN_TRANSFER') {
        // For token transfers (USDT, USDC)
        requestBody.transactionRequest.tokenAddress = params.tokenAddress;
        requestBody.transactionRequest.value = params.value;
      }

      const response = await this.httpClient.post<
        VenlyApiResponse<ExecuteTransactionResponse>
      >('/transactions/execute', requestBody, {
        headers: {
          ...headers,
          'Signing-Method': params.signingMethod,
        },
      });

      if (!response.data.success) {
        throw new Error('Venly API returned success: false');
      }

      this.logger.log(
        `Transaction submitted: ${response.data.result.transactionHash}`,
      );

      return response.data.result;
    } catch (error) {
      this.logger.error('Failed to execute transaction', error);

      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          'Response data:',
          JSON.stringify(error.response.data),
        );
      }

      throw new Error('Failed to send crypto');
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(
    secretType: string,
    txHash: string,
  ): Promise<TransactionStatus> {
    try {
      const headers = await this.venlyAuth.getAuthHeaders();

      const response = await this.httpClient.get<
        VenlyApiResponse<TransactionStatus>
      >(`/transactions/${secretType}/${txHash}/status`, { headers });

      if (!response.data.success) {
        throw new Error('Venly API returned success: false');
      }

      return response.data.result;
    } catch (error) {
      this.logger.error(`Failed to get transaction status: ${txHash}`, error);
      throw new Error('Failed to fetch transaction status');
    }
  }

  /**
   * Helper: Send USDT on Polygon
   */
  async sendUSDT(
    walletId: string,
    to: string,
    amount: string,
    signingMethod: string,
  ): Promise<ExecuteTransactionResponse> {
    const isTestnet = this.venlyAuth.getEnvironment() === 'sandbox';
    const tokenAddress = isTestnet
      ? POLYGON_AMOY_TOKEN_ADDRESSES.USDT ||
        process.env.POLYGON_AMOY_USDT_ADDRESS ||
        POLYGON_TOKEN_ADDRESSES.USDT
      : POLYGON_TOKEN_ADDRESSES.USDT;

    return this.executeTransaction({
      walletId,
      to,
      type: 'TOKEN_TRANSFER',
      value: amount,
      tokenAddress,
      signingMethod,
    });
  }

  /**
   * Helper: Send USDC on Polygon
   */
  async sendUSDC(
    walletId: string,
    to: string,
    amount: string,
    signingMethod: string,
  ): Promise<ExecuteTransactionResponse> {
    const isTestnet = this.venlyAuth.getEnvironment() === 'sandbox';
    const tokenAddress = isTestnet
      ? POLYGON_AMOY_TOKEN_ADDRESSES.USDC ||
        process.env.POLYGON_AMOY_USDC_ADDRESS ||
        POLYGON_TOKEN_ADDRESSES.USDC
      : POLYGON_TOKEN_ADDRESSES.USDC;

    return this.executeTransaction({
      walletId,
      to,
      type: 'TOKEN_TRANSFER',
      value: amount,
      tokenAddress,
      signingMethod,
    });
  }

  /**
   * Helper: Send MATIC on Polygon
   */
  async sendMATIC(
    walletId: string,
    to: string,
    amount: string,
    signingMethod: string,
  ): Promise<ExecuteTransactionResponse> {
    return this.executeTransaction({
      walletId,
      to,
      type: 'TRANSFER',
      value: amount,
      signingMethod,
    });
  }
}
