import { IsNumber, IsOptional, IsUrl, Min } from 'class-validator';

export class FundWalletDto {
  @IsNumber()
  @Min(100, { message: 'Minimum funding amount is ₦100' })
  amount: number;

  @IsOptional()
  @IsUrl()
  callbackUrl?: string;
}
