import {
  IsString,
  IsNumber,
  IsEnum,
  Min,
  Matches,
  Length,
  IsOptional,
  IsBoolean,
} from 'class-validator';

enum MeterType {
  PREPAID = 'prepaid',
  POSTPAID = 'postpaid',
}

export class PayElectricityDto {
  @IsString()
  disco: string; // e.g., "ikeja-electric", "eko-electric"

  @IsString()
  @Matches(/^\d{10,13}$/, {
    message: 'Meter number must be 10-13 digits',
  })
  meterNumber: string;

  @IsEnum(MeterType)
  meterType: MeterType;

  @IsNumber()
  @Min(1000, { message: 'Minimum electricity payment is ₦1,000' })
  amount: number;

  @IsString()
  @Matches(/^0[7-9][0-1]\d{8}$/, {
    message: 'Invalid Nigerian phone number',
  })
  phone: string;

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
