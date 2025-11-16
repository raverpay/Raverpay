import { IsBoolean, IsOptional, IsString, IsIn, IsArray } from 'class-validator';

/**
 * DTO for updating user notification preferences
 */
export class UpdateNotificationPreferencesDto {
  // Channel preferences
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  // Transaction notifications
  @IsOptional()
  @IsBoolean()
  transactionEmails?: boolean;

  @IsOptional()
  @IsBoolean()
  transactionSms?: boolean;

  @IsOptional()
  @IsBoolean()
  transactionPush?: boolean;

  // Security notifications
  @IsOptional()
  @IsBoolean()
  securityEmails?: boolean;

  @IsOptional()
  @IsBoolean()
  securitySms?: boolean;

  @IsOptional()
  @IsBoolean()
  securityPush?: boolean;

  // KYC notifications
  @IsOptional()
  @IsBoolean()
  kycEmails?: boolean;

  @IsOptional()
  @IsBoolean()
  kycSms?: boolean;

  @IsOptional()
  @IsBoolean()
  kycPush?: boolean;

  // Promotional notifications
  @IsOptional()
  @IsBoolean()
  promotionalEmails?: boolean;

  @IsOptional()
  @IsBoolean()
  promotionalSms?: boolean;

  @IsOptional()
  @IsBoolean()
  promotionalPush?: boolean;

  // Frequency controls
  @IsOptional()
  @IsString()
  @IsIn(['IMMEDIATE', 'DAILY', 'WEEKLY', 'NEVER'])
  emailFrequency?: string;

  @IsOptional()
  @IsString()
  @IsIn(['IMMEDIATE', 'DAILY', 'WEEKLY', 'NEVER'])
  smsFrequency?: string;

  @IsOptional()
  @IsString()
  @IsIn(['IMMEDIATE', 'DAILY', 'WEEKLY', 'NEVER'])
  pushFrequency?: string;

  // Quiet hours
  @IsOptional()
  @IsBoolean()
  quietHoursEnabled?: boolean;

  @IsOptional()
  @IsString()
  quietHoursStart?: string; // "22:00"

  @IsOptional()
  @IsString()
  quietHoursEnd?: string; // "06:00"

  @IsOptional()
  @IsString()
  timeZone?: string; // "Africa/Lagos"

  // Opt-outs
  @IsOptional()
  @IsArray()
  optOutCategories?: string[];
}
