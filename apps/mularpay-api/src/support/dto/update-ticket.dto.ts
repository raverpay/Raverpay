import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { TicketStatus, TicketPriority } from '@prisma/client';

export class UpdateTicketDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsString()
  assignedAgentId?: string;
}

export class AssignTicketDto {
  @IsString()
  agentId: string;
}

export class ResolveTicketDto {
  @IsOptional()
  @IsString()
  resolutionNote?: string;
}

export class RateConversationDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
