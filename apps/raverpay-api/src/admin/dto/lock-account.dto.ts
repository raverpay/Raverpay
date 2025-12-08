import { IsOptional, IsString, IsInt, Min } from 'class-validator';

export class LockAccountDto {
  @IsString()
  @IsOptional()
  reason?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  lockDurationMinutes?: number; // Optional: lock duration in minutes (default: 30)
}
