import { IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class AdjustWalletDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(['credit', 'debit'])
  @IsNotEmpty()
  type: 'credit' | 'debit';

  @IsString()
  @IsNotEmpty()
  reason: string;
}
