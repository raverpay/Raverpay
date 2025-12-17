import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Circle DTOs
 * Request validation for Circle API endpoints
 */

// ============================================
// WALLET DTOs
// ============================================

export class CreateCircleWalletDto {
  @IsOptional()
  @IsString()
  blockchain?: string;

  @IsOptional()
  @IsEnum(['SCA', 'EOA'])
  accountType?: 'SCA' | 'EOA';

  @IsOptional()
  @IsString()
  name?: string;
}

export class GetWalletBalanceDto {
  @IsOptional()
  @IsString()
  blockchain?: string;
}

export class UpdateWalletDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  refId?: string;
}

// ============================================
// TRANSACTION DTOs
// ============================================

export class TransferUsdcDto {
  @IsUUID()
  walletId: string;

  @IsString()
  destinationAddress: string;

  @IsString()
  @Transform(({ value }) => String(value))
  amount: string;

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  feeLevel?: 'LOW' | 'MEDIUM' | 'HIGH';

  @IsOptional()
  @IsString()
  memo?: string;
}

export class EstimateFeeDto {
  @IsUUID()
  walletId: string;

  @IsString()
  destinationAddress: string;

  @IsString()
  @Transform(({ value }) => String(value))
  amount: string;

  @IsOptional()
  @IsString()
  blockchain?: string;
}

export class CancelTransactionDto {
  @IsUUID()
  transactionId: string;
}

export class AccelerateTransactionDto {
  @IsUUID()
  transactionId: string;
}

// ============================================
// CCTP DTOs
// ============================================

export class CCTPTransferDto {
  @IsUUID()
  sourceWalletId: string;

  @IsString()
  destinationAddress: string;

  @IsString()
  destinationChain: string;

  @IsString()
  @Transform(({ value }) => String(value))
  amount: string;

  @IsOptional()
  @IsEnum(['STANDARD', 'FAST'])
  transferType?: 'STANDARD' | 'FAST';

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  feeLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class CCTPEstimateDto {
  @IsString()
  sourceChain: string;

  @IsString()
  destinationChain: string;

  @IsString()
  @Transform(({ value }) => String(value))
  amount: string;

  @IsOptional()
  @IsEnum(['STANDARD', 'FAST'])
  transferType?: 'STANDARD' | 'FAST';
}

// ============================================
// PAGINATION DTOs
// ============================================

export class PaginationDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  offset?: number;
}

export class TransactionQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  state?: string;
}

export class CCTPQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  state?: string;
}

// ============================================
// VALIDATION DTOs
// ============================================

export class ValidateAddressDto {
  @IsString()
  address: string;

  @IsString()
  blockchain: string;
}

// ============================================
// WEBHOOK DTOs
// ============================================

export class CreateWebhookSubscriptionDto {
  @IsString()
  endpoint: string;
}
