import {
  IsNumber,
  IsString,
  IsOptional,
  Min,
  Length,
  Matches,
} from 'class-validator';

export class WithdrawFundsDto {
  @IsNumber()
  @Min(100, { message: 'Minimum withdrawal amount is ₦100' })
  amount: number;

  @IsString()
  @Length(10, 10, { message: 'Account number must be exactly 10 digits' })
  @Matches(/^\d+$/, { message: 'Account number must contain only digits' })
  accountNumber: string;

  @IsString()
  accountName: string;

  @IsString()
  @Length(3, 10, { message: 'Bank code must be between 3 and 10 characters' })
  bankCode: string;

  @IsOptional()
  @IsString()
  narration?: string;

  @IsString()
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'PIN must contain only digits' })
  pin: string;
}
