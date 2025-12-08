import { IsString, IsOptional, IsEnum } from 'class-validator';
import { TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @IsString()
  conversationId: string;

  @IsString()
  category: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
