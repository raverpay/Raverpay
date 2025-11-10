import { IsString, IsEnum } from 'class-validator';

enum MeterType {
  PREPAID = 'prepaid',
  POSTPAID = 'postpaid',
}

export class VerifyMeterDto {
  @IsString()
  disco: string;

  @IsString()
  meterNumber: string;

  @IsEnum(MeterType)
  meterType: MeterType;
}
