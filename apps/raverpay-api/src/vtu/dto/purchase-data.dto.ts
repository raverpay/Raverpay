import {
  IsString,
  Matches,
  IsOptional,
  IsBoolean,
  Length,
  IsNumber,
  Min,
} from 'class-validator';

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
  productCode: string; // e.g., "mtn-1gb-1000" or "glo-dg-50"

  @IsOptional()
  @IsBoolean()
  isSME?: boolean; // Optional flag to use SME data (only for GLO currently)

  @IsString()
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'PIN must contain only digits' })
  pin: string;

  // Cashback fields
  @IsOptional()
  @IsBoolean()
  useCashback?: boolean; // Whether user wants to apply cashback

  @IsOptional()
  @IsNumber()
  @Min(0)
  cashbackAmount?: number; // Amount of cashback to redeem
}
