import { IsString, Length, Matches } from 'class-validator';

export class ResolveAccountDto {
  @IsString()
  @Length(10, 10, { message: 'Account number must be exactly 10 digits' })
  @Matches(/^\d+$/, { message: 'Account number must contain only digits' })
  accountNumber: string;

  @IsString()
  bankCode: string;
}
