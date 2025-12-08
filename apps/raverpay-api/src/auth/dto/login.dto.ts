import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Device Info DTO (sent from frontend)
 */
export class DeviceInfoDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsString()
  @IsNotEmpty()
  deviceName: string;

  @IsString()
  @IsIn(['ios', 'android', 'web'])
  deviceType: 'ios' | 'android' | 'web';

  @IsString()
  @IsOptional()
  deviceModel?: string;

  @IsString()
  @IsOptional()
  osVersion?: string;

  @IsString()
  @IsOptional()
  appVersion?: string;
}

/**
 * Login DTO
 * User can login with either email or phone
 */
export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Email or phone is required' })
  identifier: string; // Can be email or phone

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  deviceInfo?: DeviceInfoDto;
}
