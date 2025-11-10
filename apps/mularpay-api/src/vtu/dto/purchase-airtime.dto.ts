import { IsString, IsNumber, Min, Max, Matches } from 'class-validator';

export class PurchaseAirtimeDto {
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

  @IsNumber()
  @Min(50, { message: 'Minimum airtime is ₦50' })
  @Max(50000, { message: 'Maximum airtime is ₦50,000' })
  amount: number;
}
