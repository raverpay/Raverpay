import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  IsUUID,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsInt,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Circle DTOs
 * Request validation for Circle API endpoints
 */

// ============================================
// WALLET DTOs
// ============================================

export class CreateCircleWalletDto {
  @ApiPropertyOptional({
    description: 'Blockchain network for the wallet',
    example: 'ETH-SEPOLIA',
    enum: ['ETH-SEPOLIA', 'MATIC-AMOY', 'AVAX-FUJI', 'SOL-DEVNET'],
  })
  @IsOptional()
  @IsString()
  blockchain?: string;

  @ApiPropertyOptional({
    description:
      'Account type (Smart Contract Account or Externally Owned Account)',
    example: 'SCA',
    enum: ['SCA', 'EOA'],
  })
  @IsOptional()
  @IsEnum(['SCA', 'EOA'])
  accountType?: 'SCA' | 'EOA';

  @ApiPropertyOptional({
    description: 'Wallet name for identification',
    example: 'My USDC Wallet',
  })
  @IsOptional()
  @IsString()
  name?: string;
}

export class GetWalletBalanceDto {
  @ApiPropertyOptional({
    description: 'Blockchain to get balance for',
    example: 'ETH-SEPOLIA',
  })
  @IsOptional()
  @IsString()
  blockchain?: string;
}

export class UpdateWalletDto {
  @ApiPropertyOptional({
    description: 'New wallet name',
    example: 'Updated Wallet Name',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Reference ID for the wallet',
    example: 'ref_123456',
  })
  @IsOptional()
  @IsString()
  refId?: string;
}

// ============================================
// TRANSACTION DTOs
// ============================================

export class TransferUsdcDto {
  @ApiProperty({
    description: 'Source wallet ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID()
  walletId: string;

  @ApiProperty({
    description: 'Destination blockchain address',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsString()
  destinationAddress: string;

  @ApiProperty({
    description: 'Amount in USDC (6 decimals)',
    example: '100.500000',
    pattern: '^\\d+\\.\\d{6}$',
  })
  @IsString()
  @Transform(({ value }) => String(value))
  amount: string;

  @ApiPropertyOptional({
    description: 'Transaction fee level',
    example: 'MEDIUM',
    enum: ['LOW', 'MEDIUM', 'HIGH'],
  })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  feeLevel?: 'LOW' | 'MEDIUM' | 'HIGH';

  @ApiPropertyOptional({
    description: 'Optional transaction memo',
    example: 'Payment for services',
  })
  @IsOptional()
  @IsString()
  memo?: string;
}

export class EstimateFeeDto {
  @ApiProperty({
    description: 'Wallet ID to estimate fee for',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID()
  walletId: string;

  @ApiProperty({
    description: 'Destination address',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsString()
  destinationAddress: string;

  @ApiProperty({
    description: 'Transfer amount in USDC',
    example: '100.500000',
  })
  @IsString()
  @Transform(({ value }) => String(value))
  amount: string;

  @ApiPropertyOptional({
    description: 'Blockchain network',
    example: 'ETH-SEPOLIA',
  })
  @IsOptional()
  @IsString()
  blockchain?: string;
}

export class CancelTransactionDto {
  @ApiProperty({
    description: 'Transaction ID to cancel',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID()
  transactionId: string;
}

export class AccelerateTransactionDto {
  @ApiProperty({
    description: 'Transaction ID to accelerate',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID()
  transactionId: string;
}

// ============================================
// CCTP DTOs
// ============================================

export class CCTPTransferDto {
  @ApiProperty({
    description: 'Source wallet ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID()
  sourceWalletId: string;

  @ApiProperty({
    description: 'Destination address on target chain',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsString()
  destinationAddress: string;

  @ApiProperty({
    description: 'Destination blockchain',
    example: 'MATIC-AMOY',
    enum: ['ETH-SEPOLIA', 'MATIC-AMOY', 'AVAX-FUJI'],
  })
  @IsString()
  destinationChain: string;

  @ApiProperty({
    description: 'Amount to transfer in USDC',
    example: '100.500000',
  })
  @IsString()
  @Transform(({ value }) => String(value))
  amount: string;

  @ApiPropertyOptional({
    description:
      'Transfer type (STANDARD uses native CCTP, FAST uses liquidity pools)',
    example: 'STANDARD',
    enum: ['STANDARD', 'FAST'],
  })
  @IsOptional()
  @IsEnum(['STANDARD', 'FAST'])
  transferType?: 'STANDARD' | 'FAST';

  @ApiPropertyOptional({
    description: 'Transaction fee level',
    example: 'MEDIUM',
    enum: ['LOW', 'MEDIUM', 'HIGH'],
  })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  feeLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class CCTPEstimateDto {
  @ApiProperty({
    description: 'Source blockchain',
    example: 'ETH-SEPOLIA',
  })
  @IsString()
  sourceChain: string;

  @ApiProperty({
    description: 'Destination blockchain',
    example: 'MATIC-AMOY',
  })
  @IsString()
  destinationChain: string;

  @ApiProperty({
    description: 'Transfer amount',
    example: '100.500000',
  })
  @IsString()
  @Transform(({ value }) => String(value))
  amount: string;

  @ApiPropertyOptional({
    description: 'Transfer type',
    example: 'STANDARD',
    enum: ['STANDARD', 'FAST'],
  })
  @IsOptional()
  @IsEnum(['STANDARD', 'FAST'])
  transferType?: 'STANDARD' | 'FAST';
}

// ============================================
// PAGINATION DTOs
// ============================================

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Number of items to return',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of items to skip',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  offset?: number;
}

export class TransactionQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by transaction type',
    example: 'OUTBOUND',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Filter by transaction state',
    example: 'COMPLETE',
  })
  @IsOptional()
  @IsString()
  state?: string;
}

export class CCTPQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by CCTP transfer state',
    example: 'COMPLETE',
  })
  @IsOptional()
  @IsString()
  state?: string;
}

// ============================================
// VALIDATION DTOs
// ============================================

export class ValidateAddressDto {
  @ApiProperty({
    description: 'Blockchain address to validate',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsString()
  address: string;

  @ApiProperty({
    description: 'Blockchain network',
    example: 'ETH-SEPOLIA',
  })
  @IsString()
  blockchain: string;
}

// ============================================
// WEBHOOK DTOs
// ============================================

export class CreateWebhookSubscriptionDto {
  @ApiProperty({
    description: 'Webhook endpoint URL',
    example: 'https://api.raverpay.com/api/circle/webhooks',
  })
  @IsString()
  endpoint: string;
}

// ============================================
// USER-CONTROLLED WALLET DTOs
// ============================================

export class CreateCircleUserDto {
  @ApiPropertyOptional({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'Authentication method',
    example: 'EMAIL',
    enum: ['EMAIL', 'PIN', 'SOCIAL'],
  })
  @IsOptional()
  @IsEnum(['EMAIL', 'PIN', 'SOCIAL'])
  authMethod?: 'EMAIL' | 'PIN' | 'SOCIAL';
}

export class GetCircleUserTokenDto {
  @ApiProperty({
    description: 'Circle user ID',
    example: 'circle_user_123456',
  })
  @IsString()
  @IsNotEmpty()
  circleUserId: string;
}

export class InitializeUserWalletDto {
  @ApiProperty({
    description: 'Circle user ID',
    example: 'circle_user_123456',
  })
  @IsString()
  @IsNotEmpty()
  circleUserId: string;

  @ApiProperty({
    description: 'Blockchain(s) to create wallet on',
    example: 'ETH-SEPOLIA',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  @IsNotEmpty()
  blockchain: string | string[];

  @ApiPropertyOptional({
    description: 'Account type',
    example: 'SCA',
    enum: ['SCA', 'EOA'],
    default: 'SCA',
  })
  @IsOptional()
  @IsEnum(['SCA', 'EOA'])
  accountType?: 'SCA' | 'EOA' = 'SCA';

  @ApiProperty({
    description: 'User token from Circle SDK',
    example: 'user_token_abc123xyz789',
  })
  @IsString()
  @IsNotEmpty()
  userToken: string;

  @ApiPropertyOptional({
    description:
      'Whether this is an existing user (uses createWallet instead of createUserPinWithWallets)',
    example: false,
  })
  @IsOptional()
  isExistingUser?: boolean;
}

export class ListUserWalletsDto {
  @ApiProperty({
    description: 'User token from Circle SDK',
    example: 'user_token_abc123xyz789',
  })
  @IsString()
  @IsNotEmpty()
  userToken: string;
}

export class GetEmailDeviceTokenDto {
  @ApiPropertyOptional({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: 'Device ID',
    example: 'device_123456',
  })
  @IsString()
  @IsNotEmpty()
  deviceId: string;
}

export class SecurityQuestionItemDto {
  @ApiProperty({
    description: 'Security question ID',
    example: 'q1',
  })
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @ApiProperty({
    description: 'Security question text',
    example: "What is your mother's maiden name?",
  })
  @IsString()
  @IsNotEmpty()
  questionText: string;

  @ApiProperty({
    description: 'Question index (0-based)',
    example: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  questionIndex: number;
}

export class SaveSecurityQuestionsDto {
  @ApiProperty({
    description: 'Circle user ID',
    example: 'circle_user_123456',
  })
  @IsString()
  @IsNotEmpty()
  circleUserId: string;

  @ApiProperty({
    description: 'Array of 2 security questions',
    type: [SecurityQuestionItemDto],
    minItems: 2,
    maxItems: 2,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @Type(() => SecurityQuestionItemDto)
  questions: SecurityQuestionItemDto[];
}
