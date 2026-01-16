/**
 * Audit Log Types and Enums
 * Centralized type definitions for audit logging system
 */

export enum AuditAction {
  // ============================================
  // AUTHENTICATION & AUTHORIZATION
  // ============================================
  USER_REGISTERED = 'USER_REGISTERED',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_CHANGE_REQUIRED = 'PASSWORD_CHANGE_REQUIRED',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  PHONE_VERIFIED = 'PHONE_VERIFIED',
  TWO_FA_ENABLED = 'TWO_FA_ENABLED',
  TWO_FA_DISABLED = 'TWO_FA_DISABLED',
  TWO_FA_VERIFIED = 'TWO_FA_VERIFIED',
  MFA_REQUIRED = 'MFA_REQUIRED',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',
  MFA_VERIFICATION_SUCCESS = 'MFA_VERIFICATION_SUCCESS',
  MFA_VERIFICATION_FAILED = 'MFA_VERIFICATION_FAILED',
  MFA_BACKUP_CODE_USED = 'MFA_BACKUP_CODE_USED',
  MFA_BACKUP_CODES_REGENERATED = 'MFA_BACKUP_CODES_REGENERATED',
  MFA_IP_MISMATCH = 'MFA_IP_MISMATCH',
  IP_BLOCKED = 'IP_BLOCKED',
  IP_WHITELIST_ADDED = 'IP_WHITELIST_ADDED',
  IP_WHITELIST_REMOVED = 'IP_WHITELIST_REMOVED',
  DEVICE_VERIFIED = 'DEVICE_VERIFIED',
  TOKEN_REFRESHED = 'TOKEN_REFRESHED',

  // ============================================
  // USER PROFILE & KYC
  // ============================================
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  PHONE_UPDATED = 'PHONE_UPDATED',
  EMAIL_UPDATED = 'EMAIL_UPDATED',
  PIN_CREATED = 'PIN_CREATED',
  PIN_CHANGED = 'PIN_CHANGED',
  PIN_RESET = 'PIN_RESET',
  BVN_SUBMITTED = 'BVN_SUBMITTED',
  BVN_VERIFIED = 'BVN_VERIFIED',
  BVN_VERIFICATION_FAILED = 'BVN_VERIFICATION_FAILED',
  NIN_SUBMITTED = 'NIN_SUBMITTED',
  NIN_VERIFIED = 'NIN_VERIFIED',
  NIN_VERIFICATION_FAILED = 'NIN_VERIFICATION_FAILED',
  KYC_TIER_UPGRADED = 'KYC_TIER_UPGRADED',
  IDENTITY_MISMATCH = 'IDENTITY_MISMATCH',

  // ============================================
  // WALLET OPERATIONS
  // ============================================
  WALLET_CREATED = 'WALLET_CREATED',
  WALLET_LOCKED = 'WALLET_LOCKED',
  WALLET_UNLOCKED = 'WALLET_UNLOCKED',
  WALLET_BALANCE_ADJUSTED = 'WALLET_BALANCE_ADJUSTED',
  DAILY_LIMIT_EXCEEDED = 'DAILY_LIMIT_EXCEEDED',
  MONTHLY_LIMIT_EXCEEDED = 'MONTHLY_LIMIT_EXCEEDED',

  // ============================================
  // P2P TRANSFERS
  // ============================================
  P2P_TRANSFER_INITIATED = 'P2P_TRANSFER_INITIATED',
  P2P_TRANSFER_COMPLETED = 'P2P_TRANSFER_COMPLETED',
  P2P_TRANSFER_FAILED = 'P2P_TRANSFER_FAILED',
  RAVERTAG_CREATED = 'RAVERTAG_CREATED',
  RAVERTAG_UPDATED = 'RAVERTAG_UPDATED',
  RAVERTAG_DELETED = 'RAVERTAG_DELETED',

  // ============================================
  // TRANSACTIONS
  // ============================================
  DEPOSIT_INITIATED = 'DEPOSIT_INITIATED',
  DEPOSIT_COMPLETED = 'DEPOSIT_COMPLETED',
  DEPOSIT_FAILED = 'DEPOSIT_FAILED',
  WITHDRAWAL_INITIATED = 'WITHDRAWAL_INITIATED',
  WITHDRAWAL_COMPLETED = 'WITHDRAWAL_COMPLETED',
  WITHDRAWAL_FAILED = 'WITHDRAWAL_FAILED',
  TRANSACTION_REFUNDED = 'TRANSACTION_REFUNDED',
  TRANSACTION_REVERSED = 'TRANSACTION_REVERSED',
  TRANSACTION_CANCELLED = 'TRANSACTION_CANCELLED',

  // ============================================
  // VTU OPERATIONS
  // ============================================
  AIRTIME_PURCHASE_INITIATED = 'AIRTIME_PURCHASE_INITIATED',
  AIRTIME_PURCHASE_COMPLETED = 'AIRTIME_PURCHASE_COMPLETED',
  AIRTIME_PURCHASE_FAILED = 'AIRTIME_PURCHASE_FAILED',
  DATA_PURCHASE_INITIATED = 'DATA_PURCHASE_INITIATED',
  DATA_PURCHASE_COMPLETED = 'DATA_PURCHASE_COMPLETED',
  DATA_PURCHASE_FAILED = 'DATA_PURCHASE_FAILED',
  CABLE_TV_PAYMENT = 'CABLE_TV_PAYMENT',
  ELECTRICITY_PAYMENT = 'ELECTRICITY_PAYMENT',
  EDUCATION_PAYMENT = 'EDUCATION_PAYMENT',
  INTERNATIONAL_AIRTIME_PURCHASE = 'INTERNATIONAL_AIRTIME_PURCHASE',

  // ============================================
  // CRYPTO OPERATIONS
  // ============================================
  CRYPTO_WALLET_CREATED = 'CRYPTO_WALLET_CREATED',
  CRYPTO_SEND_INITIATED = 'CRYPTO_SEND_INITIATED',
  CRYPTO_SEND_COMPLETED = 'CRYPTO_SEND_COMPLETED',
  CRYPTO_SEND_FAILED = 'CRYPTO_SEND_FAILED',
  CRYPTO_RECEIVE_DETECTED = 'CRYPTO_RECEIVE_DETECTED',
  CRYPTO_RECEIVE_CONFIRMED = 'CRYPTO_RECEIVE_CONFIRMED',
  CRYPTO_CONVERSION_INITIATED = 'CRYPTO_CONVERSION_INITIATED',
  CRYPTO_CONVERSION_COMPLETED = 'CRYPTO_CONVERSION_COMPLETED',
  CRYPTO_CONVERSION_FAILED = 'CRYPTO_CONVERSION_FAILED',
  CRYPTO_ORDER_PLACED = 'CRYPTO_ORDER_PLACED',
  CRYPTO_ORDER_COMPLETED = 'CRYPTO_ORDER_COMPLETED',
  CRYPTO_ORDER_FAILED = 'CRYPTO_ORDER_FAILED',

  // ============================================
  // CIRCLE/USDC OPERATIONS
  // ============================================
  CIRCLE_USER_CREATED = 'CIRCLE_USER_CREATED',
  CIRCLE_WALLET_CREATED = 'CIRCLE_WALLET_CREATED',
  CIRCLE_WALLET_FROZEN = 'CIRCLE_WALLET_FROZEN',
  CIRCLE_WALLET_UNFROZEN = 'CIRCLE_WALLET_UNFROZEN',
  USDC_TRANSFER_INITIATED = 'USDC_TRANSFER_INITIATED',
  USDC_TRANSFER_COMPLETED = 'USDC_TRANSFER_COMPLETED',
  USDC_TRANSFER_FAILED = 'USDC_TRANSFER_FAILED',
  CCTP_TRANSFER_INITIATED = 'CCTP_TRANSFER_INITIATED',
  CCTP_TRANSFER_COMPLETED = 'CCTP_TRANSFER_COMPLETED',
  CCTP_TRANSFER_FAILED = 'CCTP_TRANSFER_FAILED',
  PAYMASTER_OPERATION = 'PAYMASTER_OPERATION',
  MODULAR_WALLET_CREATED = 'MODULAR_WALLET_CREATED',
  PASSKEY_CREATED = 'PASSKEY_CREATED',

  // ============================================
  // GIFT CARDS
  // ============================================
  GIFTCARD_ORDER_CREATED = 'GIFTCARD_ORDER_CREATED',
  GIFTCARD_ORDER_APPROVED = 'GIFTCARD_ORDER_APPROVED',
  GIFTCARD_ORDER_REJECTED = 'GIFTCARD_ORDER_REJECTED',
  GIFTCARD_ORDER_COMPLETED = 'GIFTCARD_ORDER_COMPLETED',
  GIFTCARD_REDEEMED = 'GIFTCARD_REDEEMED',
  GIFTCARD_REFUNDED = 'GIFTCARD_REFUNDED',

  // ============================================
  // CASHBACK
  // ============================================
  CASHBACK_EARNED = 'CASHBACK_EARNED',
  CASHBACK_REDEEMED = 'CASHBACK_REDEEMED',
  CASHBACK_EXPIRED = 'CASHBACK_EXPIRED',
  CASHBACK_REVERSED = 'CASHBACK_REVERSED',

  // ============================================
  // VIRTUAL ACCOUNTS
  // ============================================
  VIRTUAL_ACCOUNT_CREATED = 'VIRTUAL_ACCOUNT_CREATED',
  VIRTUAL_ACCOUNT_ACTIVATED = 'VIRTUAL_ACCOUNT_ACTIVATED',
  VIRTUAL_ACCOUNT_DEACTIVATED = 'VIRTUAL_ACCOUNT_DEACTIVATED',

  // ============================================
  // BANK ACCOUNTS
  // ============================================
  BANK_ACCOUNT_ADDED = 'BANK_ACCOUNT_ADDED',
  BANK_ACCOUNT_VERIFIED = 'BANK_ACCOUNT_VERIFIED',
  BANK_ACCOUNT_REMOVED = 'BANK_ACCOUNT_REMOVED',
  BANK_ACCOUNT_SET_PRIMARY = 'BANK_ACCOUNT_SET_PRIMARY',

  // ============================================
  // SUPPORT & TICKETS
  // ============================================
  TICKET_CREATED = 'TICKET_CREATED',
  TICKET_ASSIGNED = 'TICKET_ASSIGNED',
  TICKET_UPDATED = 'TICKET_UPDATED',
  TICKET_RESOLVED = 'TICKET_RESOLVED',
  TICKET_CLOSED = 'TICKET_CLOSED',
  TICKET_REOPENED = 'TICKET_REOPENED',
  MESSAGE_SENT = 'MESSAGE_SENT',

  // ============================================
  // NOTIFICATIONS
  // ============================================
  NOTIFICATION_SENT = 'NOTIFICATION_SENT',
  NOTIFICATION_READ = 'NOTIFICATION_READ',
  NOTIFICATION_PREFERENCES_UPDATED = 'NOTIFICATION_PREFERENCES_UPDATED',
  BROADCAST_SENT = 'BROADCAST_SENT',
  EMAIL_SENT = 'EMAIL_SENT',
  EMAIL_NOTIFICATION_SENT = 'EMAIL_NOTIFICATION_SENT',
  SMS_SENT = 'SMS_SENT',
  SMS_NOTIFICATION_SENT = 'SMS_NOTIFICATION_SENT',
  PUSH_NOTIFICATION_SENT = 'PUSH_NOTIFICATION_SENT',

  // ============================================
  // ADMIN OPERATIONS
  // ============================================
  CREATE_ADMIN = 'CREATE_ADMIN',
  UPDATE_ADMIN = 'UPDATE_ADMIN',
  DELETE_ADMIN = 'DELETE_ADMIN',
  RESET_ADMIN_PASSWORD = 'RESET_ADMIN_PASSWORD',
  USER_STATUS_CHANGED = 'USER_STATUS_CHANGED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_BANNED = 'USER_BANNED',
  USER_UNBANNED = 'USER_UNBANNED',
  DELETION_REQUEST_APPROVED = 'DELETION_REQUEST_APPROVED',
  DELETION_REQUEST_REJECTED = 'DELETION_REQUEST_REJECTED',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',
  SYSTEM_CONFIG_UPDATED = 'SYSTEM_CONFIG_UPDATED',

  // ============================================
  // SECURITY EVENTS
  // ============================================
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY_DETECTED = 'SUSPICIOUS_ACTIVITY_DETECTED',
  MULTIPLE_FAILED_LOGINS = 'MULTIPLE_FAILED_LOGINS',
  UNUSUAL_DEVICE_DETECTED = 'UNUSUAL_DEVICE_DETECTED',
  LOCATION_CHANGE_DETECTED = 'LOCATION_CHANGE_DETECTED',
  LARGE_TRANSACTION_ALERT = 'LARGE_TRANSACTION_ALERT',

  // ============================================
  // WEBHOOKS
  // ============================================
  WEBHOOK_RECEIVED = 'WEBHOOK_RECEIVED',
  WEBHOOK_PROCESSED = 'WEBHOOK_PROCESSED',
  WEBHOOK_FAILED = 'WEBHOOK_FAILED',

  // ============================================
  // SCHEDULED JOBS
  // ============================================
  JOB_STARTED = 'JOB_STARTED',
  JOB_COMPLETED = 'JOB_COMPLETED',
  JOB_FAILED = 'JOB_FAILED',

  // Generic CRUD operations
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  READ = 'READ',
}

export enum AuditResource {
  AUTH = 'AUTH',
  USER = 'USER',
  WALLET = 'WALLET',
  TRANSACTION = 'TRANSACTION',
  P2P_TRANSFER = 'P2P_TRANSFER',
  VTU = 'VTU',
  VTU_ORDER = 'VTU_ORDER',
  CRYPTO = 'CRYPTO',
  CRYPTO_WALLET = 'CRYPTO_WALLET',
  CRYPTO_TRANSACTION = 'CRYPTO_TRANSACTION',
  CRYPTO_CONVERSION = 'CRYPTO_CONVERSION',
  CRYPTO_ORDER = 'CRYPTO_ORDER',
  CIRCLE = 'CIRCLE',
  CIRCLE_USER = 'CIRCLE_USER',
  CIRCLE_WALLET = 'CIRCLE_WALLET',
  CIRCLE_TRANSACTION = 'CIRCLE_TRANSACTION',
  CCTP_TRANSFER = 'CCTP_TRANSFER',
  MODULAR_WALLET = 'MODULAR_WALLET',
  PAYMASTER = 'PAYMASTER',
  GIFT_CARD = 'GIFT_CARD',
  GIFTCARD_ORDER = 'GIFTCARD_ORDER',
  CASHBACK = 'CASHBACK',
  CASHBACK_WALLET = 'CASHBACK_WALLET',
  VIRTUAL_ACCOUNT = 'VIRTUAL_ACCOUNT',
  BANK_ACCOUNT = 'BANK_ACCOUNT',
  KYC = 'KYC',
  DEVICE = 'DEVICE',
  NOTIFICATION = 'NOTIFICATION',
  SUPPORT_TICKET = 'SUPPORT_TICKET',
  TICKET = 'TICKET',
  CONVERSATION = 'CONVERSATION',
  MESSAGE = 'MESSAGE',
  DELETION_REQUEST = 'DELETION_REQUEST',
  SYSTEM = 'SYSTEM',
  WEBHOOK = 'WEBHOOK',
  SECURITY = 'SECURITY',
}

export enum AuditSeverity {
  LOW = 'LOW', // Normal operations
  MEDIUM = 'MEDIUM', // Important changes
  HIGH = 'HIGH', // Security-sensitive operations
  CRITICAL = 'CRITICAL', // Requires immediate attention
}

export enum ActorType {
  USER = 'USER', // Regular user action
  ADMIN = 'ADMIN', // Admin/support action
  SYSTEM = 'SYSTEM', // Automated system action
  WEBHOOK = 'WEBHOOK', // External webhook trigger
  API = 'API', // API/integration action
}

export enum AuditStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PENDING = 'PENDING',
}

export interface AuditLogMetadata {
  [key: string]: any;
  // Common fields
  amount?: string | number;
  currency?: string;
  reference?: string;
  provider?: string;
  reason?: string;
  // Transaction specific
  balanceBefore?: string | number;
  balanceAfter?: string | number;
  fee?: string | number;
  // Security specific
  attemptCount?: number;
  blockDuration?: number;
  // Device specific
  deviceId?: string;
  deviceType?: string;
  deviceName?: string;
  // Location specific
  ipAddress?: string;
  country?: string;
  city?: string;
}

export interface CreateAuditLogDto {
  userId?: string | null;
  action: AuditAction | string;
  resource: AuditResource | string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: AuditLogMetadata;
  actorType?: ActorType;
  severity?: AuditSeverity;
  status?: AuditStatus;
  errorMessage?: string;
  executionTime?: number;
  deviceId?: string;
  location?: string;
  oldValue?: any;
  newValue?: any;
}

export interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  location?: string;
  requestId?: string;
  timestamp?: Date;
}

// Severity mapping helper
export const getSeverityForAction = (action: AuditAction): AuditSeverity => {
  const criticalActions = [
    AuditAction.ACCOUNT_LOCKED,
    AuditAction.USER_BANNED,
    AuditAction.SUSPICIOUS_ACTIVITY_DETECTED,
    AuditAction.MULTIPLE_FAILED_LOGINS,
    AuditAction.LARGE_TRANSACTION_ALERT,
    AuditAction.ACCOUNT_DELETED,
    AuditAction.WALLET_BALANCE_ADJUSTED,
  ];

  const highActions = [
    AuditAction.PASSWORD_RESET_COMPLETED,
    AuditAction.PASSWORD_CHANGED,
    AuditAction.TWO_FA_DISABLED,
    AuditAction.PIN_CHANGED,
    AuditAction.WITHDRAWAL_COMPLETED,
    AuditAction.BANK_ACCOUNT_ADDED,
    AuditAction.USER_STATUS_CHANGED,
    AuditAction.USER_ROLE_CHANGED,
    AuditAction.BVN_VERIFIED,
    AuditAction.NIN_VERIFIED,
    AuditAction.KYC_TIER_UPGRADED,
  ];

  const mediumActions = [
    AuditAction.USER_LOGIN,
    AuditAction.PROFILE_UPDATED,
    AuditAction.P2P_TRANSFER_COMPLETED,
    AuditAction.DEPOSIT_COMPLETED,
    AuditAction.VIRTUAL_ACCOUNT_CREATED,
    AuditAction.CRYPTO_SEND_COMPLETED,
    AuditAction.USDC_TRANSFER_COMPLETED,
  ];

  if (criticalActions.includes(action)) return AuditSeverity.CRITICAL;
  if (highActions.includes(action)) return AuditSeverity.HIGH;
  if (mediumActions.includes(action)) return AuditSeverity.MEDIUM;
  return AuditSeverity.LOW;
};

// Actor type mapping helper
export const getActorTypeFromContext = (
  isAdmin: boolean,
  isSystem: boolean,
  isWebhook: boolean,
): ActorType => {
  if (isWebhook) return ActorType.WEBHOOK;
  if (isSystem) return ActorType.SYSTEM;
  if (isAdmin) return ActorType.ADMIN;
  return ActorType.USER;
};
