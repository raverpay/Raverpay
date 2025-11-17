import { IsString, IsOptional } from 'class-validator';

/**
 * DTO for updating OneSignal push notification token
 */
export class UpdateOneSignalDto {
  @IsString()
  oneSignalPlayerId: string; // The subscription/player ID from OneSignal SDK

  @IsOptional()
  @IsString()
  oneSignalExternalId?: string; // External user ID (should match userId)
}
