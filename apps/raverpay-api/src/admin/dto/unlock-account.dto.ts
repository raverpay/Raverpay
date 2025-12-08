import { IsOptional, IsString } from 'class-validator';

export class UnlockAccountDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
