import {
  IsString,
  IsNumber,
  Min,
  Matches,
  Length,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class PurchaseJAMBPinDto {
  @IsString()
  @Matches(/^\d{10}$/, {
    message: 'Invalid JAMB Profile ID (must be 10 digits)',
  })
  profileId: string;

  @IsString()
  @Matches(/^(utme-mock|utme-no-mock)$/, {
    message: 'Variation code must be utme-mock or utme-no-mock',
  })
  variationCode: string;

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
