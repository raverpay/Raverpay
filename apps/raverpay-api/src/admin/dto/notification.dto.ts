import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
  ArrayMinSize,
  IsIn,
} from 'class-validator';
import { NotificationType } from '@prisma/client';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';

export class CreateBroadcastDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one channel must be selected' })
  @IsIn(['EMAIL', 'SMS', 'PUSH', 'IN_APP'], { each: true })
  channels: NotificationChannel[];

  @IsOptional()
  @IsString()
  eventType?: string;
}

export class UpdateNotificationDto {
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  message?: string;
}
