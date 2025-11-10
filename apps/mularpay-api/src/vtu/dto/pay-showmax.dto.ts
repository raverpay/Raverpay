import { IsString, Matches } from 'class-validator';

export class PayShowmaxDto {
  @IsString()
  @Matches(/^0[7-9][0-1]\d{8}$/, {
    message: 'Invalid Nigerian phone number',
  })
  phoneNumber: string; // Showmax uses phone number as billersCode

  @IsString()
  productCode: string; // e.g., "full_3"
}
