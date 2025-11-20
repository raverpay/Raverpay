import { JSX } from 'react/jsx-runtime';

// User Types
export type UserRole = 'USER' | 'SUPPORT' | 'ADMIN' | 'SUPER_ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'PENDING_VERIFICATION' | 'DEACTIVATED';
export type KYCTier = 'TIER_0' | 'TIER_1' | 'TIER_2' | 'TIER_3';

export interface User {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  kycTier: KYCTier;
  bvn?: string | null;
  bvnVerified: boolean;
  nin?: string | null;
  ninVerified: boolean;
  profilePicture?: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  deletionRequested: boolean;
  deletionRequestedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Wallet Types
export interface Wallet {
  wallet: unknown;
  id: string;
  userId: string;
  balance: string;
  ledgerBalance: string;
  currency: string;
  isLocked: boolean;
  lockReason?: string | null;
  dailyLimit: string;
  monthlyLimit: string;
  dailySpent: string;
  monthlySpent: string;
  lastResetAt: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

// Transaction Types
export type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'TRANSFER'
  | 'VTU_AIRTIME'
  | 'VTU_DATA'
  | 'VTU_CABLE'
  | 'VTU_ELECTRICITY'
  | 'GIFTCARD_BUY'
  | 'GIFTCARD_SELL'
  | 'CRYPTO_BUY'
  | 'CRYPTO_SELL'
  | 'REFUND'
  | 'REVERSAL'
  | 'ADJUSTMENT';

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';

export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  reference: string;
  type: TransactionType;
  amount: string;
  fee: string;
  totalAmount: string;
  balanceBefore: string;
  balanceAfter: string;
  status: TransactionStatus;
  description: string;
  provider?: string | null;
  providerReference?: string | null;
  channel?: string | null;
  metadata?: Record<string, any> | null;
  reversedAt?: string | null;
  reversedBy?: string | null;
  reverseReason?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

// VTU Types
export type VTUServiceType = 'AIRTIME' | 'DATA' | 'CABLE_TV' | 'ELECTRICITY';

export interface VTUOrder {
  id: string;
  userId: string;
  serviceType: VTUServiceType;
  provider: string;
  productCode: string;
  amount: string;
  recipient: string;
  reference: string;
  status: TransactionStatus;
  providerReference?: string | null;
  providerResponse?: Record<string, any> | null;
  transactionId?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
  transaction?: Transaction;
}

// Gift Card Types
export type GiftCardType = 'BUY' | 'SELL';

export interface GiftCardOrder {
  id: string;
  userId: string;
  type: GiftCardType;
  brand: string;
  country: string;
  faceValue: string;
  rate: string;
  amount: string;
  cardNumber?: string | null;
  cardPin?: string | null;
  cardImages?: string[] | null;
  reference: string;
  status: TransactionStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  transactionId?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
  transaction?: Transaction;
}

// Crypto Types
export type CryptoType = 'BUY' | 'SELL';

export interface CryptoOrder {
  id: string;
  userId: string;
  type: CryptoType;
  asset: string;
  network: string;
  cryptoAmount: string;
  nairaAmount: string;
  rate: string;
  walletAddress?: string | null;
  txHash?: string | null;
  reference: string;
  status: TransactionStatus;
  provider?: string | null;
  providerReference?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  transactionId?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
  transaction?: Transaction;
}

// Virtual Account Types
export interface VirtualAccount {
  [x: string]: any;
  bankCode: string;
  frozenAt: string | null;
  freezeReason: string | null;
  closedAt: string | null;
  closeReason: string | null;
  status: TransactionStatus;
  id: string;
  userId: string;
  provider: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  isActive: boolean;
  providerReference?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

// Account Deletion Types
export type DeletionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

export interface AccountDeletionRequest {
  id: string;
  userId: string;
  reason: string;
  customReason?: string | null;
  status: DeletionStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  scheduledFor?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

// Notification Types
export type NotificationType =
  | 'SYSTEM'
  | 'TRANSACTION'
  | 'KYC'
  | 'SECURITY'
  | 'PROMOTION'
  | 'VTU'
  | 'GIFTCARD'
  | 'CRYPTO';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

// Audit Log Types
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: User;
}

// Analytics Types
export interface DashboardAnalytics {
  users: {
    total: number;
    active: number;
  };
  wallets: {
    totalBalance: string;
  };
  transactions: {
    today: number;
  };
  revenue: {
    today: string;
  };
  pending: {
    kyc: number;
    failedTransactions: number;
    deletionRequests: number;
  };
}

export interface RevenueAnalytics {
  totalRevenue: string;
  totalTransactions: number;
  byType: Array<{
    type: TransactionType;
    revenue: string;
    count: number;
  }>;
}

export interface UserGrowthAnalytics {
  newUsers: number;
  byKYCTier: Array<{
    tier: KYCTier;
    count: number;
  }>;
  byStatus: Array<{
    status: UserStatus;
    count: number;
  }>;
}

export interface TransactionTrendsAnalytics {
  totalVolume: string;
  totalCount: number;
  successRate: string;
  byStatus: Array<{
    status: TransactionStatus;
    count: number;
  }>;
}

// Pagination Types
export interface PaginationMeta {
  currentPage: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// API Response Types
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

// Statistics Types
export interface UserStatistics {
  totalUsers: number;
  byRole: Record<UserRole, number>;
  byStatus: Record<UserStatus, number>;
  byKYCTier: Record<KYCTier, number>;
  newUsers: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

export interface TransactionStatistics {
  totalCount: number;
  totalVolume: string;
  totalFees: string;
  averageAmount: string;
  successRate: string;
  byType: Array<{
    type: TransactionType;
    count: number;
    volume: string;
  }>;
  byStatus: Array<{
    status: TransactionStatus;
    count: number;
  }>;
}

export interface WalletStatistics {
  totalWallets: number;
  totalBalance: string;
  averageBalance: string;
  maxBalance: string;
  lockedWallets: number;
  topWallets: Array<{
    userId: string;
    balance: string;
    user?: User;
  }>;
}

export interface KYCStatistics {
  total: number;
  byTier: Record<KYCTier, number>;
  pendingBVN: number;
  pendingNIN: number;
  approvalRate: string;
}

export interface VTUStatistics {
  totalOrders: number;
  totalVolume: string;
  averageAmount: string;
  successRate: string;
  byServiceType: Array<{
    serviceType: VTUServiceType;
    count: number;
    volume: string;
  }>;
  byProvider: Array<{
    provider: string;
    count: number;
    volume: string;
  }>;
}
