import { IsString, IsNotEmpty, IsObject, IsArray } from 'class-validator';

/**
 * Alchemy Webhook Event DTO
 * Based on Alchemy's webhook payload structure
 */
export class AlchemyWebhookEventDto {
  @IsString()
  @IsNotEmpty()
  webhookId: string;

  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  createdAt: string;

  @IsString()
  @IsNotEmpty()
  type: string; // e.g., "ADDRESS_ACTIVITY"

  @IsObject()
  event: {
    network: string;
    activity: Array<{
      fromAddress: string;
      toAddress: string;
      blockNum: string;
      hash: string;
      value?: number;
      asset?: string;
      category?: string;
      rawContract?: {
        address: string;
        value: string;
        decimal?: string;
      };
    }>;
  };
}

/**
 * Webhook signature verification headers
 */
export class AlchemyWebhookHeadersDto {
  @IsString()
  @IsNotEmpty()
  'x-alchemy-signature': string;
}
