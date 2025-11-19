import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ApproveGiftCardDto {
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RejectGiftCardDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AdjustGiftCardAmountDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
