import { IsString, Length, Matches } from 'class-validator';

export class ChangePinDto {
  @IsString()
  @Length(4, 4, { message: 'Current PIN must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'Current PIN must contain only digits' })
  currentPin: string;

  @IsString()
  @Length(4, 4, { message: 'New PIN must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'New PIN must contain only digits' })
  newPin: string;

  @IsString()
  @Length(4, 4, { message: 'Confirm new PIN must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'Confirm new PIN must contain only digits' })
  confirmNewPin: string;
}
