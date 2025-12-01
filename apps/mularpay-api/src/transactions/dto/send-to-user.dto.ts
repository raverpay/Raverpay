import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class SendToUserDto {
  @IsString()
  @Matches(/^[a-z0-9_]{3,20}$/, {
    message:
      'Tag must be 3-20 characters long and contain only lowercase letters, numbers, and underscores',
  })
  @Transform(({ value }) => value?.toLowerCase().trim())
  recipientTag: string;

  @IsNumber()
  @Min(1, { message: 'Amount must be at least ₦1' })
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Message cannot exceed 200 characters' })
  message?: string;

  @IsString()
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin: string;
}
