import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendToUserDto {
  @ApiProperty({
    description:
      'Recipient user tag (3-20 characters, lowercase, alphanumeric and underscores)',
    example: 'john_doe',
    minLength: 3,
    maxLength: 20,
    pattern: '^[a-z0-9_]{3,20}$',
  })
  @IsString()
  @Matches(/^[a-z0-9_]{3,20}$/, {
    message:
      'Tag must be 3-20 characters long and contain only lowercase letters, numbers, and underscores',
  })
  @Transform(({ value }) => value?.toLowerCase().trim())
  recipientTag: string;

  @ApiProperty({
    description: 'Amount to send in Naira',
    example: 1000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1, { message: 'Amount must be at least ₦1' })
  amount: number;

  @ApiPropertyOptional({
    description: 'Optional message to recipient',
    example: 'Thanks for lunch!',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Message cannot exceed 200 characters' })
  message?: string;

  @ApiProperty({
    description: '4-digit transaction PIN',
    example: '1234',
    pattern: '^\\d{4}$',
  })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin: string;
}
