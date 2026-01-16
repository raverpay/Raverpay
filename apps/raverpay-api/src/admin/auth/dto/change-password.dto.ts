import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches, IsOptional } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'CurrentPassword123!',
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description:
      'New password (min 8 characters, must contain uppercase, lowercase, number, and special character)',
    example: 'NewPassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword: string;

  @ApiProperty({
    description: 'Confirm new password',
    example: 'NewPassword123!',
  })
  @IsString()
  confirmPassword: string;

  @ApiProperty({
    description:
      'MFA code (TOTP) or backup code. Required if MFA secret exists.',
    example: '123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  mfaCode?: string;

  @ApiProperty({
    description: 'Password change token from login response',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  passwordChangeToken: string;
}
