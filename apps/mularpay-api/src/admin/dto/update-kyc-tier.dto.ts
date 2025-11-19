import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { KYCTier } from '@prisma/client';

export class UpdateKYCTierDto {
  @IsEnum(KYCTier)
  @IsNotEmpty()
  tier: KYCTier;

  @IsString()
  @IsOptional()
  notes?: string;
}
