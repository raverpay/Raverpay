import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';

/**
 * Verify NIN DTO
 * NIN (National Identification Number) for enhanced KYC verification
 */
export class VerifyNinDto {
  @IsString()
  @IsNotEmpty({ message: 'NIN is required' })
  @Length(11, 11, { message: 'NIN must be exactly 11 digits' })
  @Matches(/^[0-9]{11}$/, { message: 'NIN must contain only digits' })
  nin: string;

  @IsString()
  @IsNotEmpty({ message: 'Date of birth is required for NIN verification' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date of birth must be in YYYY-MM-DD format',
  })
  dateOfBirth: string;
}
