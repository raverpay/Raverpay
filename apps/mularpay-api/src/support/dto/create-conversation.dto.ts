import { IsOptional, IsString, IsObject } from 'class-validator';

export class TransactionContextDto {
  @IsString()
  transactionId: string;

  @IsString()
  transactionType: string;

  @IsOptional()
  @IsString()
  serviceProvider?: string;

  @IsOptional()
  @IsString()
  recipientNumber?: string;

  @IsOptional()
  amount?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  errorCode?: string;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class CreateConversationDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  initialMessage?: string;

  @IsOptional()
  @IsObject()
  transactionContext?: TransactionContextDto;
}
