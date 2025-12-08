import { IsNotEmpty, IsString } from 'class-validator';

export class RejectBVNDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
