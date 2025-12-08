// User Types
export type UserRole = 'USER' | 'SUPPORT' | 'ADMIN' | 'SUPER_ADMIN';
export type UserStatus =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'BANNED'
  | 'LOCKED'
  | 'PENDING_VERIFICATION'
  | 'PENDING_DELETION'
  | 'DELETED'
  | 'DEACTIVATED';
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
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  createdAt: string;
  updatedAt: string;
  // Account lock fields
  lockedUntil?: string | null;
  failedLoginAttempts?: number;
  lastFailedLoginAt?: string | null;
}

// Wallet Types
export interface Wallet {
  wallet: {
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
  };
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

export type TransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REVERSED';

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
  metadata?: Record<string, unknown> | null;
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
  type?: VTUServiceType;
  provider: string;
  productCode: string;
  amount: string;
  recipient: string;
  phoneNumber?: string | null;
  reference: string;
  status: TransactionStatus;
  network?: string | null;
  dataBundle?: string | null;
  providerReference?: string | null;
  providerResponse?: Record<string, unknown> | null;
  transactionId?: string | null;
  completedAt?: string | null;
  refundedAt?: string | null;
  refundReason?: string | null;
  failureReason?: string | null;
  metadata?: Record<string, unknown> | null;
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
  cardCategory?: string | null;
  cardName?: string | null;
  cardValue?: string | null;
  cardNumber?: string | null;
  cardPin?: string | null;
  cardImages?: string[] | null;
  cardCode?: string | null;
  reference: string;
  status: TransactionStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  rejectReason?: string | null;
  transactionId?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
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
  completedAt?: string | null;
  user?: User;
  transaction?: Transaction;
  // Additional fields that may be returned by the API
  proofImages?: string[] | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

// Virtual Account Types
export type VirtualAccountStatus = 'ACTIVE' | 'FROZEN' | 'CLOSED' | 'INACTIVE';

export interface VirtualAccount {
  bankCode: string;
  frozenAt: string | null;
  freezeReason: string | null;
  closedAt: string | null;
  closeReason: string | null;
  status: VirtualAccountStatus;
  id: string;
  userId: string;
  provider: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  isActive: boolean;
  providerReference?: string | null;
  metadata?: Record<string, unknown> | null;
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
  | 'PROMOTIONAL'
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
  metadata?: Record<string, unknown> | null;
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
  changes?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
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
  total: number | undefined;
  limit: number | undefined;
  currentPage: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  length: number;
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
  pendingCount?: number;
  approvedCount?: number;
  rejectedCount?: number;
  byTier: Record<KYCTier, number>;
  pendingBVN: number;
  pendingNIN: number;
  approvalRate: string;
}

export interface VTUStatistics {
  totalOrders: number;
  totalCount: number;
  totalVolume: string;
  averageAmount: string;
  successRate: string;
  failedOrders?: number;
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

export interface GiftCardStatistics {
  totalCount: number;
  totalOrders?: number;
  totalVolume: number | string;
  averageAmount: number | string;
  averageRate: number | string;
  approvalRate: string;
  successRate?: string;
  pendingOrders?: number;
  byType: Array<{
    type: GiftCardType;
    count: number;
    volume: number | string;
  }>;
  byBrand: Array<{
    brand: string;
    count: number;
    volume: number | string;
  }>;
  byStatus: Array<{
    status: TransactionStatus;
    count: number;
  }>;
}

export interface CryptoStatistics {
  totalCount: number;
  totalVolumeNGN: number | string;
  totalVolumeCrypto: number | string;
  averageAmountNGN: number | string;
  averageRate: number | string;
  approvalRate: string;
  successRate?: string;
  byType: Array<{
    type: CryptoType;
    count: number;
    volumeNGN: number | string;
  }>;
  byAsset: Array<{
    asset: string;
    count: number;
    volumeCrypto: number | string;
    volumeNGN: number | string;
  }>;
  byStatus: Array<{
    status: TransactionStatus;
    count: number;
  }>;
}

export interface VirtualAccountStatistics {
  total: number;
  active: number;
  inactive: number;
  frozen?: number;
  byProvider: Record<string, number>;
}

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_SUBMITTED';

export interface KycQueueEntry {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  kycTier?: KYCTier | number | null;
  bvn?: string | null;
  nin?: string | null;
  daysPending?: number;
  user?: Pick<User, 'id' | 'email' | 'firstName' | 'lastName'>;
}

export type KycPendingResponse = Record<'pendingBVN' | 'pendingNIN', KycQueueEntry[]>;

export type KycRejectedResponse = Record<'rejectedBVN' | 'rejectedNIN', KycQueueEntry[]>;

export interface KYC {
  userId?: string;
  user?: User;
  kycTier?: KYCTier;
  bvn?: string | null;
  nin?: string | null;
  bvnData?: Record<string, unknown> | null;
  ninData?: Record<string, unknown> | null;
  bvnVerificationStatus?: VerificationStatus;
  ninVerificationStatus?: VerificationStatus;
  bvnVerifiedAt?: string | null;
  ninVerifiedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  auditLogs: AuditLog[];
}

export interface KycVerificationResult {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  kycTier: KYCTier;
  bvnVerified?: boolean;
  ninVerified?: boolean;
}

export interface GiftCardReviewResult {
  order: GiftCardOrder;
  transaction: Transaction;
}

export interface CryptoReviewResult {
  order: CryptoOrder;
  transaction: Transaction;
}

export interface WalletAdjustmentResult {
  wallet: Wallet;
  transaction: Transaction;
}

export interface TransactionReversalResult {
  originalTransaction: Transaction;
  reversalTransaction: Transaction;
}

export interface VTURefundResult {
  order: VTUOrder;
  refundTransaction: Transaction;
}

export interface VTPassBalance {
  balance: number;
}
