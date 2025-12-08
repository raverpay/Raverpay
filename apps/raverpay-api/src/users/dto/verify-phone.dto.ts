import { IsString, IsNotEmpty, Length } from 'class-validator';

/**
 * Verify Phone DTO
 * Contains the verification code sent to user's phone via SMS
 */
export class VerifyPhoneDto {
  @IsString()
  @IsNotEmpty({ message: 'Verification code is required' })
  @Length(6, 6, { message: 'Verification code must be 6 digits' })
  code: string;
}
