import { IsString, Matches, Length } from 'class-validator';

export class CreateCryptoWalletDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'PIN must be 6 digits' })
  pin: string;
}
