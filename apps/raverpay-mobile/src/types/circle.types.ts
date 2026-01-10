// src/types/circle.types.ts

// Circle Blockchain types
export type CircleBlockchain =
  | 'ETH'
  | 'ETH-SEPOLIA'
  | 'MATIC'
  | 'MATIC-AMOY'
  | 'ARB'
  | 'ARB-SEPOLIA'
  | 'SOL'
  | 'SOL-DEVNET'
  | 'AVAX'
  | 'AVAX-FUJI'
  | 'BASE'
  | 'BASE-SEPOLIA'
  | 'OP'
  | 'OP-SEPOLIA';

export type CircleAccountType = 'EOA' | 'SCA';
export type CircleWalletState = 'LIVE' | 'FROZEN';
export type CircleTransactionState =
  | 'INITIATED'
  | 'QUEUED'
  | 'SENT'
  | 'CONFIRMED'
  | 'COMPLETE'
  | 'PENDING'
  | 'FAILED'
  | 'CANCELLED'
  | 'DENIED'
  | 'STUCK'
  | 'CLEARED';
export type CircleTransactionType = 'INBOUND' | 'OUTBOUND';
export type CCTPTransferState =
  | 'INITIATED'
  | 'BURN_PENDING'
  | 'BURN_CONFIRMED'
  | 'ATTESTATION_PENDING'
  | 'ATTESTATION_RECEIVED'
  | 'MINT_PENDING'
  | 'MINT_CONFIRMED'
  | 'COMPLETE'
  | 'FAILED'
  | 'CANCELLED';
export type CircleFeeLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type CCTPTransferType = 'FAST' | 'STANDARD';

export interface ChainMetadata {
  blockchain: CircleBlockchain;
  name: string;
  symbol: string;
  isTestnet: boolean;
  isSupported: boolean;
  isRecommended: boolean;
  feeLabel: string;
  estimatedCost: string;
  description: string;
}

// Circle Wallet
export interface CircleWallet {
  id: string;
  circleWalletId: string;
  walletSetId: string;
  userId: string;
  address: string;
  blockchain: CircleBlockchain;
  accountType: CircleAccountType;
  state: CircleWalletState;
  name?: string;
  custodyType?: 'DEVELOPER' | 'USER'; // DEVELOPER = Easy Wallet, USER = Advanced Wallet
  createdAt: string;
  updatedAt: string;
}

// Circle Balance
export interface CircleBalance {
  token: {
    id: string;
    name: string;
    symbol: string;
    decimals: number;
    isNative: boolean;
    tokenAddress?: string;
    blockchain: CircleBlockchain;
  };
  amount: string;
  updateDate: string;
}

// Circle Transaction
export interface CircleTransaction {
  id: string;
  circleTransactionId: string;
  walletId: string;
  userId: string;
  type: CircleTransactionType;
  state: CircleTransactionState;
  sourceAddress?: string;
  destinationAddress: string;
  amounts: string[];
  tokenSymbol?: string;
  blockchain: CircleBlockchain;
  transactionHash?: string;
  gasUsed?: string;
  networkFee?: string;
  memo?: string;
  refId?: string;
  reference?: string;
  createdAt: string;
  updatedAt: string;
}

// CCTP Transfer
export interface CCTPTransfer {
  transferId: any;
  id: string;
  userId: string;
  sourceWalletId: string;
  destinationAddress: string;
  sourceChain: CircleBlockchain;
  destinationChain: CircleBlockchain;
  amount: string;
  state: CCTPTransferState;
  transferType: CCTPTransferType;
  burnTxHash?: string;
  mintTxHash?: string;
  attestationHash?: string;
  estimatedTime?: number;
  totalFee?: string;
  createdAt: string;
  updatedAt: string;
}

// Circle Config
export interface CircleConfig {
  environment: 'testnet' | 'mainnet';
  supportedBlockchains: CircleBlockchain[];
  defaultBlockchain: CircleBlockchain;
  defaultAccountType: CircleAccountType;
  isConfigured: boolean;
}

// Deposit Info
export interface CircleDepositInfo {
  walletId: string;
  address: string;
  blockchain: CircleBlockchain;
  qrCodeData: string;
  supportedTokens: string[];
  network: string;
  instructions?: string;
}

// Fee Estimate for a single level
export interface FeeEstimateLevel {
  gasLimit: string;
  baseFee: string;
  priorityFee: string;
  maxFee: string;
  networkFee: string;
}

// Fee Estimate (API returns estimates for all levels)
export interface CircleFeeEstimate {
  low: FeeEstimateLevel;
  medium: FeeEstimateLevel;
  high: FeeEstimateLevel;
  // Legacy fields for backward compatibility
  baseFee?: string;
  priorityFee?: string;
  maxFee?: string;
  estimatedGas?: string;
  feeLevel?: CircleFeeLevel;
  blockchain?: CircleBlockchain;
}

// CCTP Fee Estimate
export interface CCTPFeeEstimate {
  burnFee: string;
  mintFee: string;
  totalFee: string;
  estimatedTime: number;
  transferType: CCTPTransferType;
}

// API Request Types
export interface CreateCircleWalletRequest {
  blockchain?: CircleBlockchain;
  accountType?: CircleAccountType;
  name?: string;
}

export interface TransferUsdcRequest {
  walletId: string;
  destinationAddress: string;
  amount: string;
  feeLevel?: CircleFeeLevel;
  memo?: string;
}

export interface CCTPTransferRequest {
  sourceWalletId: string;
  destinationAddress: string;
  destinationChain: CircleBlockchain;
  amount: string;
  transferType?: CCTPTransferType;
  feeLevel?: CircleFeeLevel;
}

export interface EstimateFeeRequest {
  walletId: string;
  destinationAddress: string;
  amount: string;
  blockchain?: CircleBlockchain;
  feeLevel?: CircleFeeLevel;
}

export interface CCTPEstimateRequest {
  sourceChain: CircleBlockchain;
  destinationChain: CircleBlockchain;
  amount: string;
  transferType: CCTPTransferType;
}

// API Response Types
export interface CreateCircleWalletResponse {
  success: boolean;
  data: {
    walletId: string;
    address: string;
    blockchain: CircleBlockchain;
    accountType: CircleAccountType;
    state: CircleWalletState;
  };
}

export interface CircleWalletResponse {
  success: boolean;
  data: CircleWallet;
}

export interface CircleWalletsResponse {
  success: boolean;
  data: CircleWallet[];
}

export interface CircleBalanceResponse {
  success: boolean;
  data: {
    walletId: string;
    address: string;
    blockchain: CircleBlockchain;
    balances: CircleBalance[];
  };
}

export interface CircleUsdcBalanceResponse {
  success: boolean;
  data: {
    walletId: string;
    address: string;
    blockchain: CircleBlockchain;
    usdcBalance: string;
    usdcTokenAddress: string;
  };
}

export interface TransferUsdcResponse {
  success: boolean;
  data: {
    transactionId: string;
    circleTransactionId: string;
    state: CircleTransactionState;
    amount: string;
    destinationAddress: string;
    estimatedGas?: string;
  };
}

export interface CircleTransactionsResponse {
  success: boolean;
  data: CircleTransaction[];
}

export interface CircleTransactionResponse {
  success: boolean;
  data: CircleTransaction;
}

export interface CCTPTransferResponse {
  success: boolean;
  data: CCTPTransfer;
}

export interface CCTPTransfersResponse {
  success: boolean;
  data: CCTPTransfer[];
}

export interface CircleConfigResponse {
  success: boolean;
  data: CircleConfig;
}

export interface CircleDepositInfoResponse {
  success: boolean;
  data: CircleDepositInfo[];
}

export interface CircleFeeEstimateResponse {
  success: boolean;
  data: CircleFeeEstimate;
}

export interface CCTPFeeEstimateResponse {
  success: boolean;
  data: CCTPFeeEstimate;
}

export interface CCTPChainsResponse {
  success: boolean;
  data: {
    chains: CircleBlockchain[];
  };
}

export interface ValidateAddressResponse {
  success: boolean;
  data: {
    isValid: boolean;
  };
}

export interface GetChainsResponse {
  success: boolean;
  data: {
    chains: ChainMetadata[];
  };
}
