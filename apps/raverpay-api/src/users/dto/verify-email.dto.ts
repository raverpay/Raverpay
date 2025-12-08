import { IsString, IsNotEmpty, Length } from 'class-validator';

/**
 * Verify Email DTO
 * Contains the verification code sent to user's email
 */
export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty({ message: 'Verification code is required' })
  @Length(6, 6, { message: 'Verification code must be 6 digits' })
  code: string;
}
