import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { VTUServiceType } from '@prisma/client';

export class CalculateCashbackDto {
  @IsEnum(VTUServiceType)
  serviceType: VTUServiceType;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsNumber()
  @Min(0)
  amount: number;
}
