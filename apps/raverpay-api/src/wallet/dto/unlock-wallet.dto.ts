import {
  IsString,
  IsNotEmpty,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * DTO for unlocking a wallet (Admin only)
 */
export class UnlockWalletDto {
  @IsUUID()
  @IsNotEmpty()
  walletId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'Reason must be at least 5 characters' })
  @MaxLength(500, { message: 'Reason must not exceed 500 characters' })
  reason: string;
}
