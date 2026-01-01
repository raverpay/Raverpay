import {
  IsBoolean,
  IsOptional,
  IsString,
  IsIn,
  IsArray,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating user notification preferences
 */
export class UpdateNotificationPreferencesDto {
  // Channel preferences
  @ApiPropertyOptional({ description: 'Enable Email Notifications' })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable SMS Notifications' })
  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable Push Notifications' })
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable In-App Notifications' })
  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  // Transaction notifications
  @ApiPropertyOptional({ description: 'Enable Transaction Emails' })
  @IsOptional()
  @IsBoolean()
  transactionEmails?: boolean;

  @ApiPropertyOptional({ description: 'Enable Transaction SMS' })
  @IsOptional()
  @IsBoolean()
  transactionSms?: boolean;

  @ApiPropertyOptional({ description: 'Enable Transaction Push' })
  @IsOptional()
  @IsBoolean()
  transactionPush?: boolean;

  // Security notifications
  @ApiPropertyOptional({ description: 'Enable Security Emails' })
  @IsOptional()
  @IsBoolean()
  securityEmails?: boolean;

  @ApiPropertyOptional({ description: 'Enable Security SMS' })
  @IsOptional()
  @IsBoolean()
  securitySms?: boolean;

  @ApiPropertyOptional({ description: 'Enable Security Push' })
  @IsOptional()
  @IsBoolean()
  securityPush?: boolean;

  // KYC notifications
  @ApiPropertyOptional({ description: 'Enable KYC Emails' })
  @IsOptional()
  @IsBoolean()
  kycEmails?: boolean;

  @ApiPropertyOptional({ description: 'Enable KYC SMS' })
  @IsOptional()
  @IsBoolean()
  kycSms?: boolean;

  @ApiPropertyOptional({ description: 'Enable KYC Push' })
  @IsOptional()
  @IsBoolean()
  kycPush?: boolean;

  // Promotional notifications
  @ApiPropertyOptional({ description: 'Enable Promotional Emails' })
  @IsOptional()
  @IsBoolean()
  promotionalEmails?: boolean;

  @ApiPropertyOptional({ description: 'Enable Promotional SMS' })
  @IsOptional()
  @IsBoolean()
  promotionalSms?: boolean;

  @ApiPropertyOptional({ description: 'Enable Promotional Push' })
  @IsOptional()
  @IsBoolean()
  promotionalPush?: boolean;

  // Frequency controls
  @ApiPropertyOptional({
    description: 'Email Frequency',
    enum: ['IMMEDIATE', 'DAILY', 'WEEKLY', 'NEVER'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['IMMEDIATE', 'DAILY', 'WEEKLY', 'NEVER'])
  emailFrequency?: string;

  @ApiPropertyOptional({
    description: 'SMS Frequency',
    enum: ['IMMEDIATE', 'DAILY', 'WEEKLY', 'NEVER'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['IMMEDIATE', 'DAILY', 'WEEKLY', 'NEVER'])
  smsFrequency?: string;

  @ApiPropertyOptional({
    description: 'Push Frequency',
    enum: ['IMMEDIATE', 'DAILY', 'WEEKLY', 'NEVER'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['IMMEDIATE', 'DAILY', 'WEEKLY', 'NEVER'])
  pushFrequency?: string;

  // Quiet hours
  @ApiPropertyOptional({ description: 'Enable Quiet Hours' })
  @IsOptional()
  @IsBoolean()
  quietHoursEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Quiet Hours Start (HH:mm)',
    example: '22:00',
  })
  @IsOptional()
  @IsString()
  quietHoursStart?: string; // "22:00"

  @ApiPropertyOptional({
    description: 'Quiet Hours End (HH:mm)',
    example: '06:00',
  })
  @IsOptional()
  @IsString()
  quietHoursEnd?: string; // "06:00"

  @ApiPropertyOptional({ description: 'Time Zone', example: 'Africa/Lagos' })
  @IsOptional()
  @IsString()
  timeZone?: string; // "Africa/Lagos"

  // Opt-outs
  @ApiPropertyOptional({ description: 'Opt-out Categories', type: [String] })
  @IsOptional()
  @IsArray()
  optOutCategories?: string[];
}
