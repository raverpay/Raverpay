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
import { DeviceService } from './device.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  /**
   * Get all devices for current user
   * GET /api/devices
   */
  @Get()
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
