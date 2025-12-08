import { IsString, Matches } from 'class-validator';

export class VerifySmartcardDto {
  @IsString()
  provider: string; // DSTV, GOTV, STARTIMES

  @IsString()
  @Matches(/^\d{10}$/, {
    message: 'Invalid smartcard number (must be 10 digits)',
  })
  smartcardNumber: string;
}
