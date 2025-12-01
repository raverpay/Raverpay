import { IsString, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class SetTagDto {
  @IsString()
  @Matches(/^[a-z0-9_]{3,20}$/, {
    message:
      'Tag must be 3-20 characters long and contain only lowercase letters, numbers, and underscores',
  })
  @Transform(({ value }) => value?.toLowerCase().trim())
  tag: string;
}
