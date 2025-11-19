import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ApproveCryptoDto {
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RejectCryptoDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AdjustCryptoAmountDto {
  @IsNumber()
  @Min(0)
  nairaAmount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
