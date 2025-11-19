import { IsOptional, IsString } from 'class-validator';

export class ApproveBVNDto {
  @IsString()
  @IsOptional()
  notes?: string;
}
