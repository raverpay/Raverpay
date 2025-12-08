import { IsNotEmpty, IsString } from 'class-validator';

export class ReverseTransactionDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
