import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsString,
  Min,
} from 'class-validator';
import { WithdrawalFeeType, KYCTier } from '@prisma/client';

export class CreateWithdrawalConfigDto {
  @IsEnum(WithdrawalFeeType)
  feeType: WithdrawalFeeType;

  @IsNumber()
  @Min(0)
  feeValue: number;

  @IsNumber()
  @Min(0)
  minFee: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxFee?: number;

  @IsOptional()
  @IsEnum(KYCTier)
  tierLevel?: KYCTier;

  @IsNumber()
  @Min(100)
  minWithdrawal: number;

  @IsNumber()
  @Min(100)
  maxWithdrawal: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}
