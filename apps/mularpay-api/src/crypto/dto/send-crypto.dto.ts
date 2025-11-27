import { IsString, IsIn, IsOptional, Matches, Length } from 'class-validator';

export class SendCryptoDto {
  @IsString()
  @IsIn(['MATIC', 'USDT', 'USDC'])
  tokenSymbol: string;

  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid wallet address' })
  toAddress: string;

  @IsString()
  @Matches(/^\d+(\.\d+)?$/, { message: 'Invalid amount' })
  amount: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'PIN must be 6 digits' })
  pin: string;

  @IsOptional()
  @IsString()
  memo?: string;
}
