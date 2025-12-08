import { IsNotEmpty, IsString } from 'class-validator';

export class RefundVTUDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
