/**
 * Circle API Types
 * Based on Circle's Developer-Controlled Wallets API
 */

// ============================================
// COMMON TYPES
// ============================================

export interface CircleApiResponse<T> {
  data: T;
}

export interface CircleApiError {
  code: number;
  message: string;
}

// ============================================
// BLOCKCHAIN TYPES
// ============================================

export type CircleBlockchain =
  | 'ETH'
  | 'ETH-SEPOLIA'
  | 'AVAX'
  | 'AVAX-FUJI'
  | 'MATIC'
  | 'MATIC-AMOY'
  | 'SOL'
  | 'SOL-DEVNET'
  | 'ARB'
  | 'ARB-SEPOLIA'
  | 'BASE'
  | 'BASE-SEPOLIA'
  | 'OP'
  | 'OP-SEPOLIA'
  | 'UNI'
  | 'UNI-SEPOLIA';

export type CircleTestnetBlockchain =
  | 'ETH-SEPOLIA'
  | 'AVAX-FUJI'
  | 'MATIC-AMOY'
  | 'SOL-DEVNET'
  | 'ARB-SEPOLIA'
  | 'BASE-SEPOLIA'
  | 'OP-SEPOLIA'
  | 'UNI-SEPOLIA';

export type CircleMainnetBlockchain =
  | 'ETH'
  | 'AVAX'
  | 'MATIC'
  | 'SOL'
  | 'ARB'
  | 'BASE'
  | 'OP'
  | 'UNI';

// ============================================
// WALLET SET TYPES
// ============================================

export interface CircleWalletSet {
  id: string;
  custodyType: 'DEVELOPER' | 'ENDUSER';
  name?: string;
  createDate: string;
  updateDate: string;
}

export interface CreateWalletSetRequest {
  idempotencyKey: string;
  entitySecretCiphertext: string;
  name?: string;
}

export interface CreateWalletSetResponse {
  walletSet: CircleWalletSet;
}

// ============================================
// WALLET TYPES
// ============================================

export type CircleAccountType = 'SCA' | 'EOA';
export type CircleWalletState = 'LIVE' | 'FROZEN';
export type CircleCustodyType = 'DEVELOPER' | 'ENDUSER';
export type CircleScaCore =
  | 'circle_4337_v1'
  | 'circle_6900_singleowner_v1'
  | 'circle_6900_singleowner_v2'
  | 'circle_6900_singleowner_v3';

export interface CircleWallet {
  id: string;
  address: string;
  blockchain: CircleBlockchain;
  createDate: string;
  updateDate: string;
  custodyType: CircleCustodyType;
  name?: string;
  refId?: string;
  state: CircleWalletState;
  userId?: string;
  walletSetId: string;
  accountType: CircleAccountType;
  scaCore?: CircleScaCore;
  initialPublicKey?: string;
}

export interface WalletMetadata {
  name?: string;
  refId?: string;
}

export interface CreateWalletRequest {
  idempotencyKey: string;
  entitySecretCiphertext: string;
  walletSetId: string;
  blockchains: CircleBlockchain[];
  accountType?: CircleAccountType;
  count?: number;
  metadata?: WalletMetadata[];
}

export interface CreateWalletResponse {
  wallets: CircleWallet[];
}

export interface GetWalletBalanceResponse {
  tokenBalances: TokenBalance[];
}

export interface TokenBalance {
  token: {
    id: string;
    name: string;
    standard: string;
    blockchain: CircleBlockchain;
    decimals: number;
    isNative: boolean;
    symbol: string;
    tokenAddress?: string;
    updateDate: string;
    createDate: string;
  };
  amount: string;
  updateDate: string;
}

// ============================================
// TRANSACTION TYPES
// ============================================

export type CircleTransactionState =
  | 'INITIATED'
  | 'QUEUED'
  | 'SENT'
  | 'CONFIRMED'
  | 'COMPLETE'
  | 'FAILED'
  | 'CANCELLED'
  | 'DENIED'
  | 'STUCK'
  | 'CLEARED';

export type CircleFeeLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface CreateTransferRequest {
  idempotencyKey: string;
  entitySecretCiphertext: string;
  destinationAddress: string;
  amounts: string[];
  walletId?: string;
  walletAddress?: string;
  blockchain?: CircleBlockchain;
  tokenId?: string;
  tokenAddress?: string;
  feeLevel?: CircleFeeLevel;
  gasLimit?: string;
  gasPrice?: string;
  maxFee?: string;
  priorityFee?: string;
  refId?: string;
}

export interface CreateTransferResponse {
  id: string;
  state: CircleTransactionState;
}

export interface CircleTransaction {
  id: string;
  state: CircleTransactionState;
  blockchain: CircleBlockchain;
  walletId: string;
  sourceAddress: string;
  destinationAddress: string;
  transactionType: 'INBOUND' | 'OUTBOUND';
  custodyType: CircleCustodyType;
  tokenId?: string;
  amounts: string[];
  nftTokenIds?: string[];
  txHash?: string;
  blockHash?: string;
  blockHeight?: number;
  networkFee?: string;
  networkFeeUsd?: string;
  firstConfirmDate?: string;
  operation?: string;
  feeLevel?: CircleFeeLevel;
  estimatedFee?: {
    gasLimit: string;
    baseFee: string;
    priorityFee: string;
    maxFee: string;
    networkFee: string;
  };
  refId?: string;
  abiParameters?: object;
  createDate: string;
  updateDate: string;
  errorReason?: string;
  errorDetails?: {
    code: string;
    message: string;
  };
}

export interface EstimateFeeRequest {
  walletId?: string;
  walletAddress?: string;
  blockchain?: CircleBlockchain;
  destinationAddress: string;
  amounts: string[];
  tokenId?: string;
  tokenAddress?: string;
}

export interface EstimateFeeResponse {
  low: FeeEstimate;
  medium: FeeEstimate;
  high: FeeEstimate;
}

export interface FeeEstimate {
  gasLimit: string;
  baseFee: string;
  priorityFee: string;
  maxFee: string;
  networkFee: string;
}

// ============================================
// WEBHOOK TYPES
// ============================================

export type CircleWebhookEventType =
  | 'transactions.created'
  | 'transactions.inbound'
  | 'transactions.outbound'
  | 'transactions.queued'
  | 'transactions.sent'
  | 'transactions.confirmed'
  | 'transactions.complete'
  | 'transactions.failed'
  | 'transactions.denied'
  | 'transactions.cancelled'
  | 'wallets.created'
  | 'wallets.updated';

export interface CircleWebhookEvent {
  subscriptionId: string;
  notificationId: string;
  notificationType: CircleWebhookEventType;
  notification: {
    id: string;
    state?: CircleTransactionState;
    walletId?: string;
    blockchain?: CircleBlockchain;
    address?: string;
    txHash?: string;
    tokenId?: string;
    sourceAddress?: string;
    destinationAddress?: string;
    amounts?: string[];
    nftTokenIds?: string[];
    transactionType?: 'INBOUND' | 'OUTBOUND';
    errorReason?: string;
    errorDetails?: {
      code: string;
      message: string;
    };
    outboundTransactionId?: string;
    networkFee?: string;
    userOpHash?: string;
    refId?: string;
    createDate?: string;
    updateDate?: string;
    [key: string]: unknown;
  };
  timestamp: string;
  version: number;
}

export interface CreateWebhookSubscriptionRequest {
  idempotencyKey: string;
  endpoint: string;
}

export interface WebhookSubscription {
  id: string;
  endpoint: string;
  subscriptionDetails: {
    subscribedEvents: CircleWebhookEventType[];
    secretEndpoint?: string;
  }[];
  createDate: string;
  updateDate: string;
}

// ============================================
// CCTP TYPES
// ============================================

export interface CCTPBurnRequest {
  idempotencyKey: string;
  entitySecretCiphertext: string;
  walletId: string;
  destinationAddress: string;
  destinationChain: CircleBlockchain;
  amount: string;
  feeLevel?: CircleFeeLevel;
}

export interface CCTPMintRequest {
  idempotencyKey: string;
  entitySecretCiphertext: string;
  walletId: string;
  attestationHash: string;
  messageBytes: string;
  feeLevel?: CircleFeeLevel;
}

// ============================================
// ADDRESS SCREENING TYPES
// ============================================

export interface AddressScreeningRequest {
  address: string;
  chain: CircleBlockchain;
}

export interface AddressScreeningResponse {
  result: 'PASS' | 'FAIL' | 'PENDING';
  riskScore?: number;
  riskFactors?: string[];
}

// ============================================
// TOKEN TYPES
// ============================================

export interface CircleToken {
  id: string;
  name: string;
  standard: string;
  blockchain: CircleBlockchain;
  decimals: number;
  isNative: boolean;
  symbol: string;
  tokenAddress?: string;
  updateDate: string;
  createDate: string;
}

// ============================================
// ENTITY TYPES
// ============================================

export interface EntityPublicKey {
  publicKey: string;
  createDate: string;
  updateDate: string;
}
