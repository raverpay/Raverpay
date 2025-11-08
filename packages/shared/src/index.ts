// Shared types and utilities across all MularPay apps

// ============================================
// USER & AUTH TYPES
// ============================================

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPPORT = 'SUPPORT',
}

export enum KYCTier {
  TIER_0 = 'TIER_0', // Not verified - ₦50k limit
  TIER_1 = 'TIER_1', // Email + Phone - ₦300k limit
  TIER_2 = 'TIER_2', // BVN verified - ₦5M limit
  TIER_3 = 'TIER_3', // Full KYC (ID, selfie) - Unlimited
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

// ============================================
// TRANSACTION TYPES
// ============================================

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  TRANSFER = 'TRANSFER',
  VTU_AIRTIME = 'VTU_AIRTIME',
  VTU_DATA = 'VTU_DATA',
  VTU_CABLE = 'VTU_CABLE',
  VTU_ELECTRICITY = 'VTU_ELECTRICITY',
  GIFTCARD_BUY = 'GIFTCARD_BUY',
  GIFTCARD_SELL = 'GIFTCARD_SELL',
  CRYPTO_BUY = 'CRYPTO_BUY',
  CRYPTO_SELL = 'CRYPTO_SELL',
  REFUND = 'REFUND',
  FEE = 'FEE',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REVERSED = 'REVERSED',
}

export enum PaymentMethod {
  WALLET = 'WALLET',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  USSD = 'USSD',
}

// ============================================
// VTU TYPES
// ============================================

export enum VTUProvider {
  MTN = 'MTN',
  GLO = 'GLO',
  AIRTEL = 'AIRTEL',
  NINE_MOBILE = '9MOBILE',
}

export enum CableProvider {
  DSTV = 'DSTV',
  GOTV = 'GOTV',
  STARTIMES = 'STARTIMES',
}

export enum ElectricityProvider {
  EKEDC = 'EKEDC',
  IKEDC = 'IKEDC',
  AEDC = 'AEDC',
  PHED = 'PHED',
  JED = 'JED',
  KAEDC = 'KAEDC',
}

// ============================================
// CRYPTO TYPES
// ============================================

export enum CryptoAsset {
  BTC = 'BTC',
  ETH = 'ETH',
  USDT = 'USDT',
}

export enum CryptoNetwork {
  BTC = 'BTC',
  ETH = 'ETH',
  TRC20 = 'TRC20',
  BEP20 = 'BEP20',
}

// ============================================
// GIFT CARD TYPES
// ============================================

export enum GiftCardBrand {
  AMAZON = 'AMAZON',
  APPLE = 'APPLE',
  GOOGLE_PLAY = 'GOOGLE_PLAY',
  STEAM = 'STEAM',
  XBOX = 'XBOX',
  PLAYSTATION = 'PLAYSTATION',
  EBAY = 'EBAY',
  WALMART = 'WALMART',
  SEPHORA = 'SEPHORA',
  NIKE = 'NIKE',
}

export enum GiftCardCountry {
  US = 'US',
  UK = 'UK',
  CA = 'CA',
  AU = 'AU',
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format Nigerian Naira amount
 */
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amount);
}

/**
 * Format crypto amount
 */
export function formatCrypto(amount: number, asset: CryptoAsset): string {
  const decimals = asset === CryptoAsset.BTC ? 8 : asset === CryptoAsset.ETH ? 6 : 2;
  return amount.toFixed(decimals);
}

/**
 * Generate reference ID
 */
export function generateReference(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${randomStr}`.toUpperCase();
}

/**
 * Validate Nigerian phone number
 */
export function validateNigerianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  const patterns = [
    /^0[789][01]\d{8}$/, // 080, 081, 070, 090, 091
    /^234[789][01]\d{8}$/, // +234 format
  ];
  return patterns.some((pattern) => pattern.test(cleaned));
}

/**
 * Format Nigerian phone to international
 */
export function formatPhoneToInternational(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    return `234${cleaned.substring(1)}`;
  }
  if (cleaned.startsWith('234')) {
    return cleaned;
  }
  return `234${cleaned}`;
}

/**
 * Mask sensitive data
 */
export function maskEmail(email: string): string {
  const [username, domain] = email.split('@');
  if (username.length <= 2) return email;
  return `${username.substring(0, 2)}${'*'.repeat(username.length - 2)}@${domain}`;
}

export function maskPhone(phone: string): string {
  if (phone.length < 4) return phone;
  return `${phone.substring(0, 4)}${'*'.repeat(phone.length - 8)}${phone.substring(phone.length - 4)}`;
}

export function maskAccountNumber(account: string): string {
  if (account.length < 4) return account;
  return `${'*'.repeat(account.length - 4)}${account.substring(account.length - 4)}`;
}

/**
 * Get KYC transaction limits in Naira
 */
export function getKYCLimits(tier: KYCTier): {
  dailyLimit: number;
  transactionLimit: number;
  monthlyLimit: number;
} {
  switch (tier) {
    case KYCTier.TIER_0:
      return { dailyLimit: 50_000, transactionLimit: 10_000, monthlyLimit: 200_000 };
    case KYCTier.TIER_1:
      return { dailyLimit: 300_000, transactionLimit: 100_000, monthlyLimit: 1_000_000 };
    case KYCTier.TIER_2:
      return { dailyLimit: 5_000_000, transactionLimit: 1_000_000, monthlyLimit: 20_000_000 };
    case KYCTier.TIER_3:
      return { dailyLimit: Infinity, transactionLimit: Infinity, monthlyLimit: Infinity };
    default:
      return { dailyLimit: 0, transactionLimit: 0, monthlyLimit: 0 };
  }
}

/**
 * Calculate transaction fee (percentage-based)
 */
export function calculateFee(amount: number, feePercentage: number, cap?: number): number {
  const fee = (amount * feePercentage) / 100;
  return cap ? Math.min(fee, cap) : fee;
}

/**
 * Sleep utility for retries
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry async function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  statusCode?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ============================================
// VALIDATION CONSTANTS
// ============================================

export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  PIN_LENGTH: 4,
  BVN_LENGTH: 11,
  ACCOUNT_NUMBER_LENGTH: 10,
  MIN_WITHDRAWAL: 100,
  MIN_TRANSFER: 50,
} as const;

// ============================================
// ERROR CODES
// ============================================

export enum ErrorCode {
  // Auth errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // User errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_BANNED = 'USER_BANNED',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  PHONE_ALREADY_EXISTS = 'PHONE_ALREADY_EXISTS',

  // Wallet errors
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  DAILY_LIMIT_EXCEEDED = 'DAILY_LIMIT_EXCEEDED',
  TRANSACTION_LIMIT_EXCEEDED = 'TRANSACTION_LIMIT_EXCEEDED',

  // Transaction errors
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  DUPLICATE_TRANSACTION = 'DUPLICATE_TRANSACTION',
  INVALID_AMOUNT = 'INVALID_AMOUNT',

  // KYC errors
  KYC_REQUIRED = 'KYC_REQUIRED',
  KYC_PENDING = 'KYC_PENDING',
  BVN_VERIFICATION_FAILED = 'BVN_VERIFICATION_FAILED',

  // General errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}
