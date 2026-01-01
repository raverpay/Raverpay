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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
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
@ApiTags('Authentication')
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
  @ApiOperation({
    summary: 'Register new user',
    description:
      'Create a new user account with email, phone, password, and name. Returns JWT tokens and user profile. Rate limited to 3 registrations per hour per IP.',
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    schema: {
      example: {
        user: {
          id: 'user_123',
          email: 'john.doe@example.com',
          phone: '08012345678',
          firstName: 'John',
          lastName: 'Doe',
          isEmailVerified: false,
          isPhoneVerified: false,
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or email/phone already exists',
  })
  @ApiResponse({ status: 429, description: 'Too many registration attempts' })
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
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticate user with email/phone and password. Includes device fingerprinting for security. May require device verification if logging in from a new device. Rate limited to 5 attempts per 15 minutes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        user: {
          id: 'user_123',
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: 202,
    description: 'Device verification required',
    schema: {
      example: {
        requiresDeviceVerification: true,
        userId: 'user_123',
        deviceId: 'device_456',
        message: 'Verification code sent to your email',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({
    status: 403,
    description: 'Account locked due to too many failed attempts',
  })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
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
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Get a new access token using a valid refresh token. Both tokens are rotated for security.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Retrieve the authenticated user profile. Requires valid JWT token.',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved',
    schema: {
      example: {
        user: {
          id: 'user_123',
          email: 'john.doe@example.com',
          phone: '08012345678',
          firstName: 'John',
          lastName: 'Doe',
          isEmailVerified: true,
          isPhoneVerified: true,
          kycTier: 'TIER_1',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
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
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Send a 6-digit verification code to the user email for password reset. Rate limited to 3 requests per hour.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reset code sent to email',
    schema: {
      example: {
        message: 'Password reset code sent to your email',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Email not found' })
  @ApiResponse({ status: 429, description: 'Too many reset requests' })
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
  @ApiOperation({
    summary: 'Verify password reset code',
    description:
      'Verify the 6-digit code sent to email. Returns a reset token to be used for password reset.',
  })
  @ApiResponse({
    status: 200,
    description: 'Code verified successfully',
    schema: {
      example: {
        resetToken: 'reset_token_abc123xyz789',
        message: 'Code verified. Use the reset token to set new password.',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  @ApiResponse({ status: 404, description: 'Email not found' })
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
  @ApiOperation({
    summary: 'Reset password',
    description:
      'Set a new password using the reset token obtained from verify-reset-code endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      example: {
        message:
          'Password reset successfully. You can now login with your new password.',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset token' })
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
  @ApiOperation({
    summary: 'Verify new device',
    description:
      'Verify a new device using the OTP code sent to email when logging in from an unrecognized device.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: 'user_123' },
        deviceId: { type: 'string', example: 'device_456' },
        code: { type: 'string', example: '123456' },
      },
      required: ['userId', 'deviceId', 'code'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Device verified successfully',
    schema: {
      example: {
        user: { id: 'user_123', email: 'john.doe@example.com' },
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout user',
    description:
      'Revoke refresh token to logout. If no refresh token provided, revokes all tokens for the user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      example: {
        message: 'Logged out successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@GetUser('id') userId: string, @Body() dto?: RefreshTokenDto) {
    return this.authService.logout(userId, dto?.refreshToken);
  }
}
