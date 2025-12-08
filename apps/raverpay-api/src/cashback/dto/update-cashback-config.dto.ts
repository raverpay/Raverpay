import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { VTUServiceType } from '@prisma/client';

export class UpdateCashbackConfigDto {
  @IsEnum(VTUServiceType)
  @IsOptional()
  serviceType?: VTUServiceType;

  @IsNumber()
  @Min(0.01)
  @Max(100)
  @IsOptional()
  percentage?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxCashback?: number;

  @IsString()
  @IsOptional()
  description?: string;
}
