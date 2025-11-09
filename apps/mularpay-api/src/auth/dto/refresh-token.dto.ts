import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Refresh Token DTO
 * Used to get new access token using refresh token
 */
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}
