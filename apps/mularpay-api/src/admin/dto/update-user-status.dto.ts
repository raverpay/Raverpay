import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserStatus } from '@prisma/client';

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  @IsNotEmpty()
  status: UserStatus;

  @IsString()
  @IsOptional()
  reason?: string;
}
