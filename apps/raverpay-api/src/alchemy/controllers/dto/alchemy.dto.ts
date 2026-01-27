import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Create Wallet DTO
 */
export class CreateWalletDto {
  @ApiProperty({
    description: 'Blockchain to create wallet on',
    example: 'BASE',
    enum: ['POLYGON', 'ARBITRUM', 'BASE'],
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['POLYGON', 'ARBITRUM', 'BASE'])
  blockchain: string;

  @ApiProperty({
    description: 'Network (testnet or mainnet)',
    example: 'sepolia',
    enum: ['mainnet', 'sepolia', 'amoy'],
  })
  @IsString()
  @IsNotEmpty()
  network: string;

  @ApiPropertyOptional({
    description: 'Custom wallet name',
    example: 'My Trading Wallet',
  })
  @IsString()
  @IsOptional()
  name?: string;
}

/**
 * Update Wallet Name DTO
 */
export class UpdateWalletNameDto {
  @ApiProperty({
    description: 'New wallet name',
    example: 'Updated Wallet Name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}

/**
 * Send Token DTO
 */
export class SendTokenDto {
  @ApiProperty({
    description: 'Wallet ID to send from',
    example: 'wallet-abc-123',
  })
  @IsString()
  @IsNotEmpty()
  walletId: string;

  @ApiProperty({
    description: 'Destination Ethereum address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @IsString()
  @IsNotEmpty()
  destinationAddress: string;

  @ApiProperty({
    description: 'Amount to send (in token units)',
    example: '10.50',
  })
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({
    description: 'Token type',
    example: 'USDC',
    enum: ['USDC', 'USDT'],
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['USDC', 'USDT'])
  tokenType: 'USDC' | 'USDT';
}

/**
 * Get Balance DTO
 */
export class GetBalanceDto {
  @ApiProperty({
    description: 'Wallet ID',
    example: 'wallet-abc-123',
  })
  @IsString()
  @IsNotEmpty()
  walletId: string;

  @ApiProperty({
    description: 'Token type',
    example: 'USDC',
    enum: ['USDC', 'USDT'],
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['USDC', 'USDT'])
  tokenType: 'USDC' | 'USDT';
}

/**
 * Export Seed Phrase DTO
 */
export class ExportSeedPhraseDto {
  @ApiProperty({
    description: 'Transaction PIN for verification',
    example: '1234',
  })
  @IsString()
  @IsNotEmpty()
  @Length(4, 6)
  pin: string;
}

/**
 * Import Wallet DTO
 */
export class ImportWalletDto {
  @ApiProperty({
    description: 'Import method',
    enum: ['SEED_PHRASE', 'PRIVATE_KEY'],
  })
  @IsEnum(['SEED_PHRASE', 'PRIVATE_KEY'])
  method: 'SEED_PHRASE' | 'PRIVATE_KEY';

  @ApiProperty({
    description: '12-word seed phrase (space-separated)',
    example: 'word1 word2 ... word12',
    required: false,
  })
  @IsString()
  @IsOptional()
  seedPhrase?: string;

  @ApiProperty({
    description: 'Private key (hex format)',
    example: '0x123abc...',
    required: false,
  })
  @IsString()
  @IsOptional()
  privateKey?: string;

  @ApiProperty({
    description: 'Blockchain',
    enum: ['POLYGON', 'ARBITRUM', 'BASE'],
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['POLYGON', 'ARBITRUM', 'BASE'])
  blockchain: string;

  @ApiProperty({
    description: 'Network',
    enum: ['mainnet', 'sepolia', 'amoy'],
  })
  @IsString()
  @IsNotEmpty()
  network: string;

  @ApiPropertyOptional({
    description: 'Wallet name',
  })
  @IsString()
  @IsOptional()
  name?: string;
}

/**
 * Send Native Token DTO
 */
export class SendNativeTokenDto {
  @ApiProperty({ description: 'Wallet ID' })
  @IsString()
  @IsNotEmpty()
  walletId: string;

  @ApiProperty({ description: 'Destination address' })
  @IsString()
  @IsNotEmpty()
  destinationAddress: string;

  @ApiProperty({ description: 'Amount in native token units' })
  @IsString()
  @IsNotEmpty()
  amount: string;
}
