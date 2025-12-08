import { KYCTier } from '@prisma/client';

/**
 * Wallet limit configuration based on KYC tier
 */
export interface WalletLimits {
  dailyLimit: string;
  monthlyLimit: string;
  singleTransactionLimit: string;
  isUnlimited: boolean;
}

/**
 * Wallet balance response
 */
export interface WalletBalanceResponse {
  id: string;
  balance: string;
  ledgerBalance: string;
  currency: string;
  dailySpent: string;
  monthlySpent: string;
  dailyLimit: string;
  monthlyLimit: string;
  dailyRemaining: string;
  monthlyRemaining: string;
  singleTransactionLimit: string;
  isLocked: boolean;
  lockedReason: string | null;
  kycTier: KYCTier;
  lastResetAt: Date;
  dailyDepositLimit: string;
  dailyDepositSpent: string;
  dailyDepositRemaining: string;
}

/**
 * Wallet limits response
 */
export interface WalletLimitsResponse {
  kycTier: KYCTier;
  dailyLimit: string;
  monthlyLimit: string;
  singleTransactionLimit: string;
  dailySpent: string;
  monthlySpent: string;
  dailyRemaining: string;
  monthlyRemaining: string;
  canTransact: boolean;
  limitInfo: {
    isUnlimited: boolean;
    nextTier: KYCTier | null;
    nextTierDailyLimit: string | null;
    nextTierMonthlyLimit: string | null;
  };
}

/**
 * Transaction summary
 */
export interface TransactionSummary {
  totalDebits: string;
  totalCredits: string;
  netAmount: string;
  transactionCount: number;
}

/**
 * Pagination info
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Transaction history response
 */
export interface TransactionHistoryResponse {
  data: TransactionResponse[];
  pagination: PaginationInfo;
  summary: TransactionSummary;
}

/**
 * Single transaction response
 */
export interface TransactionResponse {
  id: string;
  reference: string;
  type: string;
  amount: string;
  currency: string;
  balanceBefore: string;
  balanceAfter: string;
  status: string;
  description: string;
  category: string | null;
  metadata: unknown;
  createdAt: Date;
  completedAt: Date | null;
}

/**
 * KYC Tier limits configuration
 * Amounts in Naira (₦)
 */
export const KYC_TIER_LIMITS: Record<KYCTier, WalletLimits> = {
  TIER_0: {
    dailyLimit: '50000.00',
    monthlyLimit: '200000.00',
    singleTransactionLimit: '10000.00',
    isUnlimited: false,
  },
  TIER_1: {
    dailyLimit: '300000.00',
    monthlyLimit: '1000000.00',
    singleTransactionLimit: '100000.00',
    isUnlimited: false,
  },
  TIER_2: {
    dailyLimit: '5000000.00',
    monthlyLimit: '20000000.00',
    singleTransactionLimit: '1000000.00',
    isUnlimited: false,
  },
  TIER_3: {
    dailyLimit: '999999999.00',
    monthlyLimit: '999999999.00',
    singleTransactionLimit: '999999999.00',
    isUnlimited: true,
  },
};
