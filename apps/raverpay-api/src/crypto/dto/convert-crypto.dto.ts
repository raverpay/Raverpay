import { IsString, IsIn, Matches, Length } from 'class-validator';

export class ConvertCryptoDto {
  @IsString()
  @IsIn(['USDT', 'USDC'])
  tokenSymbol: string;

  @IsString()
  @Matches(/^\d+(\.\d+)?$/, { message: 'Invalid amount' })
  amount: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'PIN must be 6 digits' })
  pin: string;
}

export class GetConversionQuoteDto {
  @IsString()
  @IsIn(['USDT', 'USDC'])
  tokenSymbol: string;

  @IsString()
  @Matches(/^\d+(\.\d+)?$/, { message: 'Invalid amount' })
  amount: string;
}
