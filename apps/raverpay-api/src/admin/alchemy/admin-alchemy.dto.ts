import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  AlchemyAccountType,
  AlchemyTransactionState,
  AlchemyTransactionType,
  AlchemyWalletState,
} from '@prisma/client';

/**
 * DTO for querying Alchemy wallets with pagination and filters
 */
export class QueryAlchemyWalletsDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Search by address, user email, or wallet ID',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by blockchain (e.g., BASE, POLYGON, ARBITRUM)',
  })
  @IsOptional()
  @IsString()
  blockchain?: string;

  @ApiPropertyOptional({
    description: 'Filter by network (e.g., mainnet, sepolia, amoy)',
  })
  @IsOptional()
  @IsString()
  network?: string;

  @ApiPropertyOptional({
    description: 'Filter by account type',
    enum: AlchemyAccountType,
  })
  @IsOptional()
  @IsEnum(AlchemyAccountType)
  accountType?: AlchemyAccountType;

  @ApiPropertyOptional({
    description: 'Filter by wallet state',
    enum: AlchemyWalletState,
  })
  @IsOptional()
  @IsEnum(AlchemyWalletState)
  state?: AlchemyWalletState;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  userId?: string;
}

/**
 * DTO for querying Alchemy transactions with pagination and filters
 */
export class QueryAlchemyTransactionsDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Search by transaction hash, reference, or user email',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by transaction state',
    enum: AlchemyTransactionState,
  })
  @IsOptional()
  @IsEnum(AlchemyTransactionState)
  state?: AlchemyTransactionState;

  @ApiPropertyOptional({
    description: 'Filter by transaction type',
    enum: AlchemyTransactionType,
  })
  @IsOptional()
  @IsEnum(AlchemyTransactionType)
  type?: AlchemyTransactionType;

  @ApiPropertyOptional({ description: 'Filter by blockchain' })
  @IsOptional()
  @IsString()
  blockchain?: string;

  @ApiPropertyOptional({ description: 'Filter by network' })
  @IsOptional()
  @IsString()
  network?: string;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by wallet ID' })
  @IsOptional()
  @IsString()
  walletId?: string;
}

/**
 * DTO for querying gas spending analytics with date range
 */
export class QueryGasSpendingDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by blockchain' })
  @IsOptional()
  @IsString()
  blockchain?: string;

  @ApiPropertyOptional({ description: 'Filter by network' })
  @IsOptional()
  @IsString()
  network?: string;
}
