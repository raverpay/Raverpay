import { IsString, IsEnum, Matches } from 'class-validator';

enum MeterType {
  PREPAID = 'prepaid',
  POSTPAID = 'postpaid',
}

export class VerifyMeterDto {
  @IsString()
  disco: string;

  @IsString()
  @Matches(/^\d{10,13}$/, {
    message: 'Meter number must be 10-13 digits',
  })
  meterNumber: string;

  @IsEnum(MeterType)
  meterType: MeterType;
}
