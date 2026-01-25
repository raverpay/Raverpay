import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
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
