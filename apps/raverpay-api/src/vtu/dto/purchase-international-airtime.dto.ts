import { IsString, IsEmail, Length, Matches } from 'class-validator';

export class PurchaseInternationalAirtimeDto {
  @IsString()
  billersCode: string; // Recipient phone number with country code

  @IsString()
  variationCode: string; // Product variation code

  @IsString()
  operatorId: string; // Operator ID from VTPass

  @IsString()
  countryCode: string; // Country code (e.g., 'GH', 'CM')

  @IsString()
  productTypeId: string; // Product type ID (1=Mobile Top Up, 4=Mobile Data)

  @IsEmail()
  email: string; // Customer email

  @IsString()
  phone: string; // Nigerian customer phone number

  @IsString()
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'PIN must contain only digits' })
  pin: string;
}
