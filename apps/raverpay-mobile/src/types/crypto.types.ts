// src/types/crypto.types.ts

export type TokenSymbol = 'MATIC' | 'USDT' | 'USDC';
export type WalletType = 'NAIRA' | 'CRYPTO' | 'USD';
export type CryptoTransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';
export type TransactionDirection = 'INCOMING' | 'OUTGOING';

export interface CryptoWallet {
  id: string;
  userId: string;
  type: WalletType;
  currency: string;
  balance: string;
  ledgerBalance: string;
  venlyWalletId: string;
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
}

export interface CryptoBalance {
  id: string;
  walletId: string;
  tokenSymbol: TokenSymbol;
  tokenAddress: string | null;
  tokenDecimals: number;
  balance: string;
  rawBalance: string;
  usdPrice: string;
  usdValue: string;
  lastUpdated: string;
}

export interface CryptoTransaction {
  id: string;
  reference: string;
  transactionHash: string;
  userId: string;
  walletId: string;
  type: 'SEND' | 'RECEIVE';
  direction: TransactionDirection;
  fromAddress: string;
  toAddress: string;
  tokenSymbol: TokenSymbol;
  tokenAddress: string | null;
  tokenDecimals: number;
  amount: string;
  rawAmount: string;
  usdValue: string;
  network: string;
  status: CryptoTransactionStatus;
  memo: string | null;
  gasUsed: string | null;
  gasFee: string | null;
  blockNumber: number | null;
  confirmations: number;
  hasReachedFinality: boolean;
  submittedAt: string;
  confirmedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
}

export interface CryptoConversion {
  id: string;
  reference: string;
  userId: string;
  walletId: string;
  tokenSymbol: TokenSymbol;
  cryptoAmount: string;
  usdPrice: string;
  usdValue: string;
  exchangeRate: string;
  nairaAmount: string;
  fee: string;
  netAmount: string;
  status: CryptoTransactionStatus;
  cryptoTransactionId: string | null;
  nairaTransactionId: string | null;
  convertedAt: string | null;
  createdAt: string;
}

export interface DepositInfo {
  walletAddress: string;
  qrCodeData: string;
  network: string;
  supportedTokens: TokenSymbol[];
  instructions?: string;
  warning: string;
}

export interface ConversionQuote {
  tokenSymbol: TokenSymbol;
  cryptoAmount: string;
  usdPrice: string;
  usdValue: string;
  exchangeRate: string;
  nairaAmount: string;
  fee: string;
  feePercentage: string;
  netAmount: string;
  expiresAt: string;
}

export interface ExchangeRate {
  id: string;
  rate: string;
  source: string;
  effectiveAt: string;
  updatedAt: string;
}

// API Request/Response Types
export interface InitializeCryptoWalletRequest {
  pin: string; // 6-digit PIN
}

export interface InitializeCryptoWalletResponse {
  wallet: CryptoWallet;
  message: string;
}

export interface SendCryptoRequest {
  tokenSymbol: TokenSymbol;
  toAddress: string;
  amount: string;
  pin: string;
  memo?: string;
}

export interface SendCryptoResponse {
  transaction: CryptoTransaction;
  transactionHash: string;
  status: string;
  message: string;
}

export interface GetConversionQuoteRequest {
  tokenSymbol: TokenSymbol;
  cryptoAmount: string;
}

export interface ConvertCryptoRequest {
  tokenSymbol: TokenSymbol;
  cryptoAmount: string;
  pin: string;
}

export interface ConvertCryptoResponse {
  conversion: CryptoConversion;
  cryptoTransaction: CryptoTransaction;
  nairaTransaction: any; // Regular transaction type
  message: string;
}
