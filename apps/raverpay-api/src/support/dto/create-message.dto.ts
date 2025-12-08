import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  IsEnum,
} from 'class-validator';
import { SenderType } from '@prisma/client';

export class CreateMessageDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(SenderType)
  senderType?: SenderType;

  @IsOptional()
  @IsArray()
  attachments?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
