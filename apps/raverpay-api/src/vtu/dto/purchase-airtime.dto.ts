import {
  IsString,
  IsNumber,
  Min,
  Max,
  Matches,
  Length,
  IsOptional,
  IsBoolean,
} from 'class-validator';

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

  @IsString()
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'PIN must contain only digits' })
  pin: string;

  // Cashback fields
  @IsOptional()
  @IsBoolean()
  useCashback?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cashbackAmount?: number;
}
