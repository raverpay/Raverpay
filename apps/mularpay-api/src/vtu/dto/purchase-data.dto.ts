import { IsString, Matches } from 'class-validator';

export class PurchaseDataDto {
  @IsString()
  @Matches(/^(MTN|GLO|AIRTEL|9MOBILE)$/i, {
    message: 'Network must be MTN, GLO, AIRTEL, or 9MOBILE',
  })
  network: string;

  @IsString()
  @Matches(/^0[7-9][0-1]\d{8}$/, {
    message: 'Invalid Nigerian phone number',
  })
  phone: string;

  @IsString()
  productCode: string; // e.g., "mtn-1gb-1000"
}
