import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsObject } from 'class-validator';

export class PaystackCustomerDto {
  @ApiProperty({ description: 'Customer email' })
  @IsString()
  email: string;

  @ApiProperty({ description: 'Customer code' })
  @IsString()
  customer_code: string;
}

export class PaystackAuthorizationDto {
  @ApiPropertyOptional({ description: 'Authorization channel' })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional({ description: 'Receiver bank account number' })
  @IsOptional()
  @IsString()
  receiver_bank_account_number?: string;

  @ApiPropertyOptional({ description: 'Sender bank' })
  @IsOptional()
  @IsString()
  sender_bank?: string;

  @ApiPropertyOptional({ description: 'Sender name' })
  @IsOptional()
  @IsString()
  sender_name?: string;
}

export class PaystackDedicatedAccountDto {
  @ApiProperty({ description: 'Account number' })
  @IsString()
  account_number: string;

  @ApiProperty({ description: 'Account name' })
  @IsString()
  account_name: string;

  @ApiProperty({ description: 'Bank details' })
  @IsObject()
  bank: {
    name: string;
    slug: string;
  };
}

export class PaystackDataDto {
  @ApiProperty({ description: 'Transaction reference' })
  @IsString()
  reference: string;

  @ApiProperty({ description: 'Transaction amount in kobo' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Transaction status' })
  @IsString()
  status: string;

  @ApiPropertyOptional({ description: 'Payment channel' })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional({ description: 'Payment date' })
  @IsOptional()
  @IsString()
  paid_at?: string;

  @ApiPropertyOptional({ description: 'Transaction fees in kobo' })
  @IsOptional()
  @IsNumber()
  fees?: number;

  @ApiPropertyOptional({
    description: 'Customer details',
    type: PaystackCustomerDto,
  })
  @IsOptional()
  @IsObject()
  customer?: PaystackCustomerDto;

  @ApiPropertyOptional({
    description: 'Authorization details',
    type: PaystackAuthorizationDto,
  })
  @IsOptional()
  @IsObject()
  authorization?: PaystackAuthorizationDto;

  @ApiPropertyOptional({ description: 'Transaction metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Dedicated account details',
    type: PaystackDedicatedAccountDto,
  })
  @IsOptional()
  @IsObject()
  dedicated_account?: PaystackDedicatedAccountDto;
}

export class PaystackWebhookDto {
  @ApiProperty({ description: 'Webhook event type (e.g., charge.success)' })
  @IsString()
  event: string;

  @ApiProperty({ description: 'Event data', type: PaystackDataDto })
  @IsObject()
  data: PaystackDataDto;
}
