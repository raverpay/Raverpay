import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Device Info DTO (sent from frontend)
 */
export class DeviceInfoDto {
  @ApiProperty({
    description: 'Unique device identifier',
    example: 'abc123-device-id-xyz789',
  })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({
    description: 'Human-readable device name',
    example: "John's iPhone 14 Pro",
  })
  @IsString()
  @IsNotEmpty()
  deviceName: string;

  @ApiProperty({
    description: 'Device platform type',
    enum: ['ios', 'android', 'web'],
    example: 'ios',
  })
  @IsString()
  @IsIn(['ios', 'android', 'web'])
  deviceType: 'ios' | 'android' | 'web';

  @ApiPropertyOptional({
    description: 'Device model',
    example: 'iPhone 14 Pro',
  })
  @IsString()
  @IsOptional()
  deviceModel?: string;

  @ApiPropertyOptional({
    description: 'Operating system version',
    example: 'iOS 17.2',
  })
  @IsString()
  @IsOptional()
  osVersion?: string;

  @ApiPropertyOptional({
    description: 'Application version',
    example: '1.2.3',
  })
  @IsString()
  @IsOptional()
  appVersion?: string;
}

/**
 * Login DTO
 * User can login with either email or phone
 */
export class LoginDto {
  @ApiProperty({
    description: 'User email or phone number',
    example: 'john.doe@example.com',
  })
  @IsString()
  @IsNotEmpty({ message: 'Email or phone is required' })
  identifier: string; // Can be email or phone

  @ApiProperty({
    description: 'User password',
    example: 'SecurePass123!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @ApiPropertyOptional({
    description:
      'Device information for device fingerprinting and security tracking',
    type: DeviceInfoDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  deviceInfo?: DeviceInfoDto;
}
