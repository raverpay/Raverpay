import { IsString, IsNumber, IsEnum, Min, Matches } from 'class-validator';

enum MeterType {
  PREPAID = 'prepaid',
  POSTPAID = 'postpaid',
}

export class PayElectricityDto {
  @IsString()
  disco: string; // e.g., "ikeja-electric", "eko-electric"

  @IsString()
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
}
