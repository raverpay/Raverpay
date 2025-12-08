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

export class CreateCashbackConfigDto {
  @IsEnum(VTUServiceType)
  serviceType: VTUServiceType;

  @IsNumber()
  @Min(0.01)
  @Max(100)
  percentage: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minAmount?: number = 0;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxCashback?: number;

  @IsString()
  @IsOptional()
  description?: string;
}
