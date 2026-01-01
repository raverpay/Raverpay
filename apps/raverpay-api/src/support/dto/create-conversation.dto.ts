import { IsOptional, IsString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransactionContextDto {
  @ApiProperty({ description: 'Transaction ID' })
  @IsString()
  transactionId: string;

  @ApiProperty({ description: 'Transaction Type (e.g., DEPOSIT, WITHDRAWAL)' })
  @IsString()
  transactionType: string;

  @ApiPropertyOptional({ description: 'Service Provider' })
  @IsOptional()
  @IsString()
  serviceProvider?: string;

  @ApiPropertyOptional({ description: 'Recipient Number' })
  @IsOptional()
  @IsString()
  recipientNumber?: string;

  @ApiPropertyOptional({ description: 'Transaction Amount' })
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ description: 'Transaction Status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Error Code' })
  @IsOptional()
  @IsString()
  errorCode?: string;

  @ApiPropertyOptional({ description: 'Error Message' })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiPropertyOptional({ description: 'Transaction Timestamp' })
  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class CreateConversationDto {
  @ApiPropertyOptional({ description: 'Conversation Category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Initial Message' })
  @IsOptional()
  @IsString()
  initialMessage?: string;

  @ApiPropertyOptional({
    description: 'Transaction Context',
    type: TransactionContextDto,
  })
  @IsOptional()
  @IsObject()
  transactionContext?: TransactionContextDto;
}
