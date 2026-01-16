import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';

export class CreateIpWhitelistDto {
  @ApiProperty({
    description:
      'IP address or CIDR range (e.g., "203.0.113.45" or "203.0.113.0/24")',
    example: '203.0.113.45',
  })
  @IsString()
  @IsNotEmpty()
  ipAddress: string;

  @ApiPropertyOptional({
    description: 'Description of the IP (e.g., "Office WiFi", "VPN Server")',
    example: 'Office WiFi',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'User ID for user-specific whitelist (null for global)',
    example: 'user_123',
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Whether the whitelist entry is active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateIpWhitelistDto {
  @ApiPropertyOptional({
    description:
      'IP address or CIDR range (e.g., "203.0.113.45" or "203.0.113.0/24")',
    example: '203.0.113.0/24',
  })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'Description of the IP',
    example: 'Office WiFi - Updated',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the whitelist entry is active',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
