/**
 * Venly API Type Definitions
 * Based on official Venly API Reference
 */

// ============================================
// API RESPONSE WRAPPER
// ============================================

export interface VenlyApiResponse<T> {
  success: boolean;
  result: T;
}

// ============================================
// USER TYPES
// ============================================

export interface VenlyUser {
  id: string;
  reference: string;
  createdAt: string;
  signingMethods?: VenlySigningMethod[];
}

export interface VenlySigningMethod {
  id: string;
  type: 'PIN';
  incorrectAttempts: number;
  remainingAttempts: number;
  lastUsedSuccess?: string;
  hasMasterSecret: boolean;
}

export interface CreateVenlyUserRequest {
  reference: string;
  signingMethod: {
    type: 'PIN';
    value: string; // 6-digit PIN
  };
}

export interface CreateVenlyUserResponse {
  id: string;
  reference: string;
  createdAt: string;
}

// ============================================
// WALLET TYPES
// ============================================

export interface VenlyWallet {
  id: string;
  address: string;
  walletType: 'API_WALLET';
  secretType: 'MATIC' | 'ETHEREUM' | 'BSC' | 'AVAC' | 'ARBITRUM';
  createdAt: string;
  archived: boolean;
  description?: string;
  primary: boolean;
  hasCustomPin: boolean;
  identifier?: string;
  userId: string;
  custodial: boolean;
  balance: {
    available: boolean;
    secretType: string;
    balance: number;
    gasBalance: number;
    symbol: string;
    gasSymbol: string;
    rawBalance: string;
    rawGasBalance: string;
    decimals: number;
    exchange?: {
      usdPrice: number;
      usdBalanceValue: number;
    };
  };
}

export interface CreateVenlyWalletRequest {
  secretType: 'MATIC';
  userId: string;
  identifier?: string;
  description?: string;
}

// ============================================
// BALANCE TYPES
// ============================================

export interface VenlyNativeBalance {
  available: boolean;
  secretType: string;
  balance: number;
  gasBalance: number;
  symbol: string;
  gasSymbol: string;
  rawBalance: string;
  rawGasBalance: string;
  decimals: number;
  exchange?: {
    usdPrice: number;
    usdBalanceValue: number;
  };
}

export interface VenlyTokenBalance {
  tokenAddress: string;
  rawBalance: string;
  balance: number;
  decimals: number;
  symbol: string;
  logo?: string;
  type: 'ERC20' | 'ERC721' | 'ERC1155';
  transferable: boolean;
  name?: string;
  exchange?: {
    usdPrice: number;
    usdBalanceValue: number;
  };
  portfolioPercentage?: string;
}

// ============================================
// TRANSACTION TYPES
// ============================================

export interface ExecuteTransactionRequest {
  transactionRequest: {
    type: 'TRANSFER' | 'TOKEN_TRANSFER';
    walletId: string;
    to: string;
    secretType: 'MATIC';
    value?: number | string; // For native transfers (MATIC)
    tokenAddress?: string; // For token transfers (USDT, USDC)
  };
}

export interface ExecuteTransactionResponse {
  transactionHash: string;
  id?: string;
}

export interface TransactionStatus {
  hash: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  confirmations: number;
  blockHash?: string;
  blockNumber?: number;
  hasReachedFinality: boolean;
  chain?: string;
  nonce?: number;
  gas?: number;
  gasUsed?: number;
  gasPrice?: number;
  from?: string;
  to?: string;
  rawValue?: number;
  value?: number;
  timestamp?: string;
}

// ============================================
// WEBHOOK TYPES
// ============================================

export interface VenlyWebhookEvent {
  eventType: 'TRANSACTION_SUCCEEDED' | 'TRANSACTION_FAILED';
  result: {
    hash: string;
    status: 'SUCCEEDED' | 'FAILED';
    confirmations: number;
    blockHash: string;
    blockNumber: number;
    hasReachedFinality: boolean;
    chain: string;
    nonce: number;
    gas: number;
    gasUsed: number;
    gasPrice: number;
    from: string;
    to: string;
    rawValue: number;
    value: number;
    timestamp: string;
  };
}

// ============================================
// OAUTH TYPES
// ============================================

export interface VenlyOAuthToken {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

// ============================================
// CONSTANTS
// ============================================

// Environment-based URLs
export const VENLY_BASE_URL = {
  sandbox: 'https://api-wallet-sandbox.venly.io/api',
  production: 'https://api-wallet.venly.io/api',
};

export const VENLY_AUTH_URL = {
  sandbox:
    'https://login-sandbox.venly.io/auth/realms/Arkane/protocol/openid-connect/token',
  production:
    'https://login.venly.io/auth/realms/Arkane/protocol/openid-connect/token',
};

// Polygon Mainnet Token Addresses
export const POLYGON_TOKEN_ADDRESSES = {
  USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // 6 decimals
  USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // 6 decimals
} as const;

// Polygon Amoy Testnet Token Addresses
// Set these via environment variables when you have testnet token contracts
export const POLYGON_AMOY_TOKEN_ADDRESSES = {
  USDT: process.env.POLYGON_AMOY_USDT_ADDRESS || null,
  USDC: process.env.POLYGON_AMOY_USDC_ADDRESS || null,
} as const;
