// Notification Types

export type NotificationType = 'TRANSACTION' | 'KYC' | 'SECURITY' | 'PROMOTIONAL' | 'SYSTEM';

export type NotificationCategory =
  | 'TRANSACTION'
  | 'SECURITY'
  | 'KYC'
  | 'PROMOTIONAL'
  | 'SYSTEM'
  | 'ACCOUNT';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';

export type NotificationFrequency = 'IMMEDIATE' | 'DAILY' | 'WEEKLY' | 'NEVER';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  eventType?: string;
  category: NotificationCategory;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
  deliveryStatus?: Record<string, string>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationPreferences {
  id: string;
  userId: string;

  // Channel preferences
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;

  // Event type preferences
  transactionEmails: boolean;
  transactionSms: boolean;
  transactionPush: boolean;

  securityEmails: boolean;
  securitySms: boolean;
  securityPush: boolean;

  kycEmails: boolean;
  kycSms: boolean;
  kycPush: boolean;

  promotionalEmails: boolean;
  promotionalSms: boolean;
  promotionalPush: boolean;

  // Frequency controls
  emailFrequency: NotificationFrequency;
  smsFrequency: NotificationFrequency;

  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timeZone: string;

  // Opt-outs
  optOutCategories: string[];

  createdAt: string;
  updatedAt: string;
}

export interface UpdateNotificationPreferencesDto {
  // Channel preferences
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;

  // Event type preferences
  transactionEmails?: boolean;
  transactionSms?: boolean;
  transactionPush?: boolean;

  securityEmails?: boolean;
  securitySms?: boolean;
  securityPush?: boolean;

  kycEmails?: boolean;
  kycSms?: boolean;
  kycPush?: boolean;

  promotionalEmails?: boolean;
  promotionalSms?: boolean;
  promotionalPush?: boolean;

  // Frequency controls
  emailFrequency?: NotificationFrequency;
  smsFrequency?: NotificationFrequency;

  // Quiet hours
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timeZone?: string;

  // Opt-outs
  optOutCategories?: string[];
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  unreadCount: number;
}
