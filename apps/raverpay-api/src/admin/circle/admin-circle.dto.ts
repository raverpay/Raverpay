import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CircleWalletState,
  CircleTransactionState,
  CCTPTransferState,
} from '@prisma/client';

/**
 * Query DTOs for Circle admin endpoints
 */

export class QueryCircleWalletsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  blockchain?: string;

  @IsOptional()
  @IsEnum(CircleWalletState)
  state?: CircleWalletState;
}

export class QueryCircleTransactionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(CircleTransactionState)
  state?: CircleTransactionState;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  blockchain?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class QueryCCTPTransfersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(CCTPTransferState)
  state?: CCTPTransferState;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  sourceChain?: string;

  @IsOptional()
  @IsString()
  destinationChain?: string;
}

export class QueryWebhookLogsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Boolean)
  processed?: boolean;

  @IsOptional()
  @IsString()
  eventType?: string;
}

export class CircleAnalyticsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  blockchain?: string;
}

export class UpdateBlockchainConfigDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @Type(() => Boolean)
  isEnabled?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  isTestnet?: boolean;

  @IsOptional()
  @IsString()
  feeLabel?: string;

  @IsOptional()
  @IsString()
  estimatedCost?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Boolean)
  isRecommended?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @Type(() => Boolean)
  isCCTPSupported?: boolean;
}
