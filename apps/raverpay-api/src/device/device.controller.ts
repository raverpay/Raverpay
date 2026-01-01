import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { DeviceService } from './device.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Devices')
@ApiBearerAuth()
@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  /**
   * Get all devices for current user
   * GET /api/devices
   */
  @Get()
  @ApiOperation({
    summary: 'Get User Devices',
    description: 'List all devices logged into the account',
  })
  @ApiResponse({ status: 200, description: 'Devices retrieved' })
  async getUserDevices(@GetUser('id') userId: string) {
    const devices = await this.deviceService.getUserDevices(userId);
    return {
      success: true,
      devices,
    };
  }

  /**
   * Get active device for current user
   * GET /api/devices/active
   */
  @Get('active')
  @ApiOperation({
    summary: 'Get Active Device',
    description: 'Get details of the currently used device',
  })
  @ApiResponse({ status: 200, description: 'Active device retrieved' })
  async getActiveDevice(@GetUser('id') userId: string) {
    const device = await this.deviceService.getActiveDevice(userId);
    return {
      success: true,
      device,
    };
  }

  /**
   * Logout a specific device
   * POST /api/devices/:deviceId/logout
   */
  @Post(':deviceId/logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout Device',
    description: 'Logout user from a specific device',
  })
  @ApiParam({ name: 'deviceId', description: 'Device ID to logout' })
  @ApiResponse({ status: 200, description: 'Device logged out' })
  async logoutDevice(
    @GetUser('id') userId: string,
    @Param('deviceId') deviceId: string,
  ) {
    await this.deviceService.logoutDevice(userId, deviceId);
    return {
      success: true,
      message: 'Device logged out successfully',
    };
  }

  /**
   * Trust a device (skip OTP on future logins)
   * POST /api/devices/:deviceId/trust
   */
  @Post(':deviceId/trust')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trust Device',
    description: 'Mark device as trusted to skip OTP',
  })
  @ApiParam({ name: 'deviceId', description: 'Device ID to trust' })
  @ApiResponse({ status: 200, description: 'Device trusted' })
  async trustDevice(
    @GetUser('id') userId: string,
    @Param('deviceId') deviceId: string,
  ) {
    const device = await this.deviceService.trustDevice(userId, deviceId);
    return {
      success: true,
      message: 'Device trusted successfully',
      device,
    };
  }
}
