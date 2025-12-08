import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateCannedResponseDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  shortcut?: string;
}

export class UpdateCannedResponseDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  shortcut?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
