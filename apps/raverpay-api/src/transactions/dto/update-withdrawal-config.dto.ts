import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsString,
  Min,
} from 'class-validator';
import { WithdrawalFeeType, KYCTier } from '@prisma/client';

export class UpdateWithdrawalConfigDto {
  @IsOptional()
  @IsEnum(WithdrawalFeeType)
  feeType?: WithdrawalFeeType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  feeValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxFee?: number;

  @IsOptional()
  @IsEnum(KYCTier)
  tierLevel?: KYCTier;

  @IsOptional()
  @IsNumber()
  @Min(100)
  minWithdrawal?: number;

  @IsOptional()
  @IsNumber()
  @Min(100)
  maxWithdrawal?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}
