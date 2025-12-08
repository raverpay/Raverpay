import { IsString, IsOptional, IsEnum } from 'class-validator';
import { VTUServiceType } from '@prisma/client';

export class CreateSavedRecipientDto {
  @IsEnum(VTUServiceType)
  serviceType: VTUServiceType;

  @IsString()
  provider: string;

  @IsString()
  recipient: string;

  @IsString()
  @IsOptional()
  recipientName?: string;
}

export class UpdateSavedRecipientDto {
  @IsString()
  @IsOptional()
  recipientName?: string;
}

export class GetSavedRecipientsDto {
  @IsEnum(VTUServiceType)
  @IsOptional()
  serviceType?: VTUServiceType;
}
