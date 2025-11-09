import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Login DTO
 * User can login with either email or phone
 */
export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Email or phone is required' })
  identifier: string; // Can be email or phone

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
