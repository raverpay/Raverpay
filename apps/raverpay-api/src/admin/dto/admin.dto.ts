import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  MinLength,
} from 'class-validator';
import { UserStatus } from '@prisma/client';

export class CreateAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(['ADMIN', 'SUPPORT', 'SUPER_ADMIN'])
  role: 'ADMIN' | 'SUPPORT' | 'SUPER_ADMIN';
}

export class UpdateAdminDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(['ADMIN', 'SUPPORT', 'SUPER_ADMIN'])
  role?: 'ADMIN' | 'SUPPORT' | 'SUPER_ADMIN';

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(8)
  password: string;
}
