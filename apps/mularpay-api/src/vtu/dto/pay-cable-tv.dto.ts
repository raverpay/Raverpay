import { IsString, IsEnum, Matches } from 'class-validator';

enum CableTVProvider {
  DSTV = 'DSTV',
  GOTV = 'GOTV',
  STARTIMES = 'STARTIMES',
}

export class PayCableTVDto {
  @IsEnum(CableTVProvider)
  provider: CableTVProvider;

  @IsString()
  @Matches(/^\d{10}$/, {
    message: 'Invalid smartcard number (must be 10 digits)',
  })
  smartcardNumber: string;

  @IsString()
  productCode: string; // e.g., "dstv-compact"

  @IsString()
  @Matches(/^0[7-9][0-1]\d{8}$/, {
    message: 'Invalid Nigerian phone number',
  })
  phone: string;
}
