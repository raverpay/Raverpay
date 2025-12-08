import { IsString, Length, Matches } from 'class-validator';

export class SetPinDto {
  @IsString()
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'PIN must contain only digits' })
  pin: string;

  @IsString()
  @Length(4, 4, { message: 'Confirm PIN must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'Confirm PIN must contain only digits' })
  confirmPin: string;
}
