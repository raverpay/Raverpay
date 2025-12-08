import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class UpdateRatingConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  promptFrequencyDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minTransactionsRequired?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minUsageDaysRequired?: number;

  @IsOptional()
  @IsString()
  promptTitle?: string;

  @IsOptional()
  @IsString()
  promptMessage?: string;

  @IsOptional()
  @IsUrl()
  iosAppStoreUrl?: string;

  @IsOptional()
  @IsUrl()
  androidPlayStoreUrl?: string;
}
