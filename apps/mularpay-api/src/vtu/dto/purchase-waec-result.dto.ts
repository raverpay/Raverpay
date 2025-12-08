import {
  IsString,
  IsNumber,
  Min,
  Length,
  Matches,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class PurchaseWAECResultDto {
  @IsString()
  @Matches(/^0[7-9][0-1]\d{8}$/, {
    message: 'Invalid Nigerian phone number',
  })
  phone: string;

  @IsString()
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
