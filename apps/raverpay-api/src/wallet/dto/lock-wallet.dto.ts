import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

/**
 * DTO for locking a wallet
 */
export class LockWalletDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'Reason must be at least 5 characters' })
  @MaxLength(500, { message: 'Reason must not exceed 500 characters' })
  reason: string;
}
