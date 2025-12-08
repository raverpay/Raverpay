import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export enum DeletionReason {
  PRIVACY_CONCERNS = 'privacy_concerns',
  NOT_USEFUL = 'not_useful',
  SWITCHING_SERVICE = 'switching_service',
  TOO_EXPENSIVE = 'too_expensive',
  TECHNICAL_ISSUES = 'technical_issues',
  OTHER = 'other',
}

/**
 * Request Account Deletion DTO
 * Used when a user requests to delete their account
 */
export class RequestAccountDeletionDto {
  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEnum(DeletionReason)
  @IsNotEmpty()
  reason: DeletionReason;

  @IsString()
  @IsOptional()
  customReason?: string; // Required if reason === 'other'
}
