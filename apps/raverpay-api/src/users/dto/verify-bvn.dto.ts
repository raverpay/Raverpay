import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';

/**
 * Verify BVN DTO
 * BVN (Bank Verification Number) is required for KYC Tier 2
 */
export class VerifyBvnDto {
  @IsString()
  @IsNotEmpty({ message: 'BVN is required' })
  @Length(11, 11, { message: 'BVN must be exactly 11 digits' })
  @Matches(/^[0-9]{11}$/, { message: 'BVN must contain only digits' })
  bvn: string;

  @IsString()
  @IsNotEmpty({ message: 'Date of birth is required for BVN verification' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date of birth must be in YYYY-MM-DD format',
  })
  dateOfBirth: string;
}
