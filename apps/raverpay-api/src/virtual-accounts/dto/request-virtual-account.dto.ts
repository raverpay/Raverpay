import { IsString, IsOptional, IsDateString, Length } from 'class-validator';

/**
 * DTO for requesting a dedicated virtual account
 * Requires BVN or NIN for customer validation (Nigerian Financial Services requirement)
 */
export class RequestVirtualAccountDto {
  @IsOptional()
  @IsString()
  preferred_bank?: string;

  // BVN or NIN is required for customer validation
  @IsOptional()
  @IsString()
  @Length(11, 11, { message: 'BVN must be exactly 11 digits' })
  bvn?: string;

  @IsOptional()
  @IsString()
  @Length(11, 11, { message: 'NIN must be exactly 11 digits' })
  nin?: string;

  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  // For BVN validation - user's bank account details
  @IsOptional()
  @IsString()
  @Length(10, 10, { message: 'Account number must be exactly 10 digits' })
  account_number?: string;

  @IsOptional()
  @IsString()
  bank_code?: string;
}
