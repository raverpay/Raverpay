import {
  IsString,
  IsEnum,
  Matches,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';

enum CableTVProvider {
  DSTV = 'DSTV',
  GOTV = 'GOTV',
  STARTIMES = 'STARTIMES',
}

enum SubscriptionType {
  CHANGE = 'change', // New subscription or change bouquet
  RENEW = 'renew', // Renew current bouquet
}

export class PayCableTVDto {
  @IsEnum(CableTVProvider)
  provider: CableTVProvider;

  @IsString()
  @Matches(/^\d{10}$/, {
    message: 'Invalid smartcard number (must be 10 digits)',
  })
  smartcardNumber: string;

  @IsOptional()
  @IsString()
  productCode?: string; // Required for 'change', optional for 'renew'

  @IsEnum(SubscriptionType)
  subscriptionType: SubscriptionType; // 'change' or 'renew'

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number; // Number of months (DSTV/GOTV only)

  @IsString()
  @Matches(/^0[7-9][0-1]\d{8}$/, {
    message: 'Invalid Nigerian phone number',
  })
  phone: string;
}
