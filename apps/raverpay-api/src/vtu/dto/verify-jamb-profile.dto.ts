import { IsString, Matches, Length } from 'class-validator';

export class VerifyJAMBProfileDto {
  @IsString()
  @Matches(/^\d{10}$/, {
    message: 'Invalid JAMB Profile ID (must be 10 digits)',
  })
  profileId: string;

  @IsString()
  @Matches(/^(utme-mock|utme-no-mock)$/, {
    message: 'Variation code must be utme-mock or utme-no-mock',
  })
  variationCode: string;
}
