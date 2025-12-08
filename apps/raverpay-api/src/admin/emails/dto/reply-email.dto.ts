import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ReplyEmailDto {
  @IsString()
  @IsNotEmpty({ message: 'Reply content is required' })
  content: string;

  @IsString()
  @IsOptional()
  subject?: string; // Optional, defaults to "Re: {originalSubject}"
}
