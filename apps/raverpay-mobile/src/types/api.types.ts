// types/api.types.ts

// User Types
export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  PENDING_DELETION = 'PENDING_DELETION',
  BANNED = 'BANNED',
}

export enum KYCTier {
  TIER_0 = 'TIER_0',
  TIER_1 = 'TIER_1',
  TIER_2 = 'TIER_2',
  TIER_3 = 'TIER_3',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export interface User {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: Gender;
  address?: string;
  city?: string;
  state?: string;
  avatar?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  bvnVerified: boolean;
  ninVerified: boolean;
  status: UserStatus;
  kycTier: KYCTier;
  pinSetAt?: string;
  profileEditedOnce?: boolean;
  profileEditedAt?: string;
  createdAt: string;
  updatedAt: string;
  biometricEnabled?: boolean;
  lastPasswordChange?: string;
  passwordResetAt?: string;

  // P2P Transfer fields
  tag?: string;
  tagSetAt?: string;
  tagChangedCount?: number;
}

// Auth Types
export interface LoginRequest {
  identifier: string; // email or phone
  password: string;
}

export interface RegisterRequest {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  user: User;
  // Device verification fields (when new device detected)
  requiresDeviceVerification?: boolean;
  deviceId?: string;
  message?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface VerifyDeviceRequest {
  userId: string;
  deviceId: string;
  code: string;
}

export interface VerifyDeviceResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  deviceId: string;
}

// Wallet Types
export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  ledgerBalance: number;
  currency: string;
  isLocked: boolean;
  dailySpent: number;
  monthlySpent: number;
  lastTransactionAt?: string;
}

export interface WalletLimits {
  tier: KYCTier;
  dailyLimit: number;
  monthlyLimit: number;
  singleTransactionLimit: number;
  dailySpent: number;
  monthlySpent: number;
  dailyRemaining: number;
  monthlyRemaining: number;
}

// Transaction Types
export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

export interface Transaction {
  id: string;
  reference: string;
  type: TransactionType;
  amount: number;
  fee: number;
  status: TransactionStatus;
  description: string;
  balanceBefore: number;
  balanceAfter: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  pagination: PaginationMeta;
}

// VTU Types
export enum VTUServiceType {
  AIRTIME = 'AIRTIME',
  DATA = 'DATA',
  CABLE_TV = 'CABLE_TV',
  ELECTRICITY = 'ELECTRICITY',
  SHOWMAX = 'SHOWMAX',
  INTERNATIONAL_AIRTIME = 'INTERNATIONAL_AIRTIME',
}

export interface VTUOrder {
  id: string;
  reference: string;
  serviceType: VTUServiceType;
  provider: string;
  amount: number;
  phone?: string;
  status: TransactionStatus;
  productCode?: string;
  smartcardNumber?: string;
  meterNumber?: string;
  token?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface DataPlan {
  code: string;
  name: string;
  amount: number;
  validity: string;
  description: string;
}

export interface CableTVPlan {
  code: string;
  name: string;
  amount: number;
  validity: string;
  description: string;
}

// Notification Types
export enum NotificationType {
  TRANSACTION = 'TRANSACTION',
  KYC = 'KYC',
  SECURITY = 'SECURITY',
  PROMOTIONAL = 'PROMOTIONAL',
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: PaginationMeta & {
    unreadCount: number;
  };
}

// API Error Types
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  errors?: Record<string, string[]>;
}

// P2P Transfer Types
export interface SetTagRequest {
  tag: string;
}

export interface SetTagResponse {
  tag: string;
  message: string;
}

export interface LookupUserResponse {
  tag: string;
  name: string;
  avatar?: string;
}

export interface SendP2PRequest {
  recipientTag: string;
  amount: number;
  message?: string;
  pin: string;
}

export interface SendP2PResponse {
  reference: string;
  amount: string;
  fee: string;
  recipient: {
    tag: string;
    name: string;
  };
  status: string;
  message?: string;
  createdAt: string;
}

export enum P2PTransferType {
  SENT = 'SENT',
  RECEIVED = 'RECEIVED',
}

export interface P2PTransfer {
  id: string;
  type: P2PTransferType;
  amount: string;
  counterparty: {
    tag: string;
    name: string;
    avatar?: string;
  };
  message?: string;
  status: TransactionStatus;
  createdAt: string;
}

export interface P2PHistoryResponse {
  transfers: P2PTransfer[];
  pagination: PaginationMeta;
}
