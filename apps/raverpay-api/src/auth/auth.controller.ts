import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  VerifyResetCodeDto,
  ResetPasswordDto,
} from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser, Public } from './decorators';

/**
 * Authentication Controller
 *
 * Endpoints:
 * - POST /auth/register - Register new user
 * - POST /auth/login - Login user
 * - POST /auth/refresh - Refresh access token
 * - GET /auth/me - Get current user profile
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user
   *
   * @param dto - Registration data
   * @returns User object and auth tokens
   */
  @Public()
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 registrations per hour per IP
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * Login user with device fingerprinting and account locking
   *
   * @param dto - Login credentials
   * @param req - Express request object for IP and device info
   * @returns User object and auth tokens, or device verification required
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 login attempts per 15 minutes per IP
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    // Extract IP address
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown';

    // Map deviceInfo from DTO to DeviceInfo interface (add IP address)
    const deviceInfo = dto.deviceInfo
      ? {
          ...dto.deviceInfo,
          ipAddress,
          userAgent: req.headers['user-agent'] || undefined,
        }
      : undefined;

    return this.authService.login(dto, deviceInfo, ipAddress);
  }

  /**
   * Refresh access token
   *
   * @param dto - Refresh token
   * @returns New access token and refresh token
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  /**
   * Get current authenticated user
   *
   * @param user - Authenticated user from JWT
   * @returns User profile
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@GetUser() user: unknown) {
    return {
      user,
    };
  }

  /**
   * Request password reset
   *
   * @param dto - Email address
   * @returns Success message
   */
  @Public()
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 password reset requests per hour per IP
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  /**
   * Verify password reset code
   *
   * @param dto - Email and verification code
   * @returns Reset token
   */
  @Public()
  @Post('verify-reset-code')
  @HttpCode(HttpStatus.OK)
  async verifyResetCode(@Body() dto: VerifyResetCodeDto) {
    return this.authService.verifyResetCode(dto.email, dto.code);
  }

  /**
   * Reset password
   *
   * @param dto - Reset token and new password
   * @returns Success message
   */
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.resetToken, dto.newPassword);
  }

  /**
   * Verify device with OTP after new device detected
   *
   * @param dto - Contains deviceId and OTP code
   * @returns Auth tokens after device verification
   */
  @Public()
  @Post('verify-device')
  @HttpCode(HttpStatus.OK)
  async verifyDevice(
    @Body() dto: { deviceId: string; code: string; userId: string },
  ) {
    return this.authService.verifyDeviceLogin(
      dto.userId,
      dto.deviceId,
      dto.code,
    );
  }

  /**
   * Logout user by revoking refresh token
   *
   * @param user - Authenticated user from JWT
   * @param dto - Optional refresh token to revoke (revokes all if not provided)
   * @returns Success message
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@GetUser('id') userId: string, @Body() dto?: RefreshTokenDto) {
    return this.authService.logout(userId, dto?.refreshToken);
  }
}
