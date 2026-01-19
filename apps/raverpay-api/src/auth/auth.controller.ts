import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Req,
  Param,
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
  SetupMfaResponseDto,
  VerifyMfaSetupDto,
  VerifyMfaDto,
  VerifyBackupCodeDto,
  DisableMfaDto,
  MfaStatusDto,
  RegenerateBackupCodesDto,
  SetupMfaUnauthenticatedDto,
} from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser, Public } from './decorators';
import { SkipPasswordChangeCheck } from '../common/decorators/skip-password-change-check.decorator';
import { DeviceInfo } from '../device/device.service';

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
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    // Extract IP address and user agent for session tracking
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.ip ||
      req.socket?.remoteAddress ||
      'unknown';
    const userAgent = req.headers['user-agent'] || undefined;

    return this.authService.refreshTokens(
      dto.refreshToken,
      ipAddress,
      userAgent,
    );
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
  @SkipPasswordChangeCheck() // Allow logout even if password change required
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

  /**
   * Setup MFA for admin user
   * Generates secret, QR code, and backup codes
   */
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 attempts per hour per user
  @Post('mfa/setup')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Setup MFA',
    description:
      'Generate MFA secret, QR code, and backup codes for admin users. Requires authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'MFA setup initiated',
    type: SetupMfaResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'MFA already enabled' })
  @ApiResponse({
    status: 403,
    description: 'MFA only available for admin users',
  })
  async setupMfa(@GetUser('id') userId: string) {
    return this.authService.setupMfa(userId);
  }

  /**
   * Setup MFA for admin user without authentication
   * Requires temporary setup token OR account created < 24 hours ago + email verified
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 attempts per hour per IP
  @Post('mfa/setup-unauthenticated')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Setup MFA (Unauthenticated)',
    description:
      'Generate MFA secret, QR code, and backup codes for admin users without authentication. Requires temporary setup token (sent via email) OR account created < 24 hours ago + email verified.',
  })
  @ApiResponse({
    status: 200,
    description: 'MFA setup initiated',
    type: SetupMfaResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or MFA already enabled',
  })
  @ApiResponse({
    status: 403,
    description: 'Not eligible for unauthenticated MFA setup',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async setupMfaUnauthenticated(@Body() dto: SetupMfaUnauthenticatedDto) {
    return this.authService.setupMfaUnauthenticated(dto.email, dto.setupToken);
  }

  /**
   * Verify MFA setup and enable MFA
   */
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 attempts per hour per user
  @Post('mfa/verify-setup')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Verify MFA setup',
    description:
      'Verify the 6-digit code from authenticator app to complete MFA setup.',
  })
  @ApiResponse({
    status: 200,
    description: 'MFA enabled successfully',
    schema: {
      example: {
        success: true,
        message: 'MFA has been enabled successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid verification code' })
  @ApiResponse({ status: 400, description: 'MFA setup not initiated' })
  async verifyMfaSetup(
    @GetUser('id') userId: string,
    @Body() dto: VerifyMfaSetupDto,
  ) {
    return this.authService.verifyMfaSetup(userId, dto.code);
  }

  /**
   * Verify MFA code during login
   */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 900000 } }) // 10 attempts per 15 minutes per IP
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify MFA code',
    description:
      'Verify 6-digit TOTP code during login. Requires temporary token from login response.',
  })
  @ApiResponse({
    status: 200,
    description: 'MFA verified, login successful',
    schema: {
      example: {
        user: {
          id: 'user_123',
          email: 'admin@example.com',
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid MFA code or expired token',
  })
  @ApiResponse({ status: 429, description: 'Too many MFA attempts' })
  async verifyMfa(@Body() dto: VerifyMfaDto, @Req() req: Request) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown';

    // Extract device info from headers if available
    const deviceInfo: DeviceInfo | undefined = req.headers['x-device-id']
      ? {
          deviceId: req.headers['x-device-id'] as string,
          deviceName: (req.headers['x-device-name'] as string) || 'Unknown',
          deviceType: ((req.headers['x-device-type'] as string) || 'web') as
            | 'ios'
            | 'android'
            | 'web',
          deviceModel: req.headers['x-device-model'] as string | undefined,
          osVersion: req.headers['x-os-version'] as string | undefined,
          appVersion: req.headers['x-app-version'] as string | undefined,
          ipAddress: ipAddress,
          userAgent: req.headers['user-agent'] || undefined,
        }
      : undefined;

    return this.authService.verifyMfaCode(
      dto.tempToken,
      dto.code,
      deviceInfo,
      ipAddress,
    );
  }

  /**
   * Verify backup code during login
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 attempts per 15 minutes per IP
  @Post('mfa/verify-backup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify backup code',
    description:
      'Verify backup code during login. Requires temporary token from login response.',
  })
  @ApiResponse({
    status: 200,
    description: 'Backup code verified, login successful',
    schema: {
      example: {
        user: {
          id: 'user_123',
          email: 'admin@example.com',
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid backup code or expired token',
  })
  @ApiResponse({ status: 429, description: 'Too many attempts' })
  async verifyBackupCode(
    @Body() dto: VerifyBackupCodeDto,
    @Req() req: Request,
  ) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown';

    // Extract device info from headers if available
    const deviceInfo: DeviceInfo | undefined = req.headers['x-device-id']
      ? {
          deviceId: req.headers['x-device-id'] as string,
          deviceName: (req.headers['x-device-name'] as string) || 'Unknown',
          deviceType: ((req.headers['x-device-type'] as string) || 'web') as
            | 'ios'
            | 'android'
            | 'web',
          deviceModel: req.headers['x-device-model'] as string | undefined,
          osVersion: req.headers['x-os-version'] as string | undefined,
          appVersion: req.headers['x-app-version'] as string | undefined,
          ipAddress: ipAddress,
          userAgent: req.headers['user-agent'] || undefined,
        }
      : undefined;

    return this.authService.verifyBackupCode(
      dto.tempToken,
      dto.backupCode,
      deviceInfo,
      ipAddress,
    );
  }

  /**
   * Disable MFA (requires password verification)
   */
  @UseGuards(JwtAuthGuard)
  @Post('mfa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Disable MFA',
    description:
      'Disable MFA for admin user. Requires password verification for security.',
  })
  @ApiResponse({
    status: 200,
    description: 'MFA disabled successfully',
    schema: {
      example: {
        success: true,
        message: 'MFA has been disabled successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid password or unauthorized' })
  @ApiResponse({ status: 400, description: 'MFA is not enabled' })
  async disableMfa(@GetUser('id') userId: string, @Body() dto: DisableMfaDto) {
    return this.authService.disableMfa(userId, dto.password);
  }

  /**
   * Regenerate backup codes
   */
  @UseGuards(JwtAuthGuard)
  @Post('mfa/regenerate-backup-codes')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Regenerate backup codes',
    description:
      'Generate new backup codes. Old codes will be invalidated. Requires MFA to be enabled.',
  })
  @ApiResponse({
    status: 200,
    description: 'Backup codes regenerated',
    schema: {
      example: {
        backupCodes: ['12345678', '87654321', '11223344'],
        message: 'Backup codes regenerated successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'MFA is not enabled' })
  async regenerateBackupCodes(
    @GetUser('id') userId: string,
    @Body() dto: RegenerateBackupCodesDto,
  ) {
    return this.authService.regenerateBackupCodes(userId, dto.code);
  }

  /**
   * Get MFA status
   */
  @UseGuards(JwtAuthGuard)
  @Get('mfa/status')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get MFA status',
    description:
      'Get current MFA status and statistics for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'MFA status retrieved',
    type: MfaStatusDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMfaStatus(@GetUser('id') userId: string) {
    return this.authService.getMfaStatus(userId);
  }

  /**
   * Get all active sessions
   */
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get active sessions',
    description:
      'Get all active sessions (refresh tokens) for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Active sessions retrieved',
    schema: {
      example: [
        {
          id: 'session_123',
          deviceId: 'device_456',
          ipAddress: '192.168.1.1',
          location: 'Lagos, Nigeria',
          lastUsedAt: '2025-01-13T10:30:00Z',
          createdAt: '2025-01-10T12:00:00Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSessions(@GetUser('id') userId: string) {
    return this.authService.getSessions(userId);
  }

  /**
   * Revoke a specific session
   */
  @UseGuards(JwtAuthGuard)
  @Post('sessions/:id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Revoke session',
    description: 'Revoke a specific active session by session ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Session revoked successfully',
    schema: {
      example: {
        success: true,
        message: 'Session revoked successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Session not found' })
  async revokeSession(
    @GetUser('id') userId: string,
    @Param('id') sessionId: string,
  ) {
    return this.authService.revokeSession(userId, sessionId);
  }

  /**
   * Revoke all sessions except current one
   */
  @UseGuards(JwtAuthGuard)
  @Post('sessions/revoke-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Revoke all sessions',
    description:
      'Revoke all active sessions except the current one. Useful for security when device is lost.',
  })
  @ApiResponse({
    status: 200,
    description: 'All sessions revoked successfully',
    schema: {
      example: {
        success: true,
        message: 'All sessions revoked successfully',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async revokeAllSessions(
    @GetUser('id') userId: string,
    @Body() dto?: RefreshTokenDto,
  ) {
    return this.authService.revokeAllSessions(userId, dto?.refreshToken);
  }

  /**
   * Verify password for re-authentication
   * Returns a short-lived token (15 minutes) for sensitive operations
   */
  @UseGuards(JwtAuthGuard)
  @Post('verify-password-reauth')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Verify password for re-authentication',
    description:
      'Verify user password and return a short-lived re-authentication token (15 minutes) for sensitive operations.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password verified, re-auth token generated',
    schema: {
      example: {
        reAuthToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresIn: 900, // 15 minutes in seconds
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid password' })
  async verifyPasswordReauth(
    @GetUser('id') userId: string,
    @Body() dto: { password: string },
  ) {
    return this.authService.verifyPasswordReauth(userId, dto.password);
  }

  /**
   * Verify MFA code for re-authentication
   * Returns a short-lived token (15 minutes) for sensitive operations
   */
  @UseGuards(JwtAuthGuard)
  @Post('verify-mfa-reauth')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Verify MFA code for re-authentication',
    description:
      'Verify MFA code (TOTP or backup code) and return a short-lived re-authentication token (15 minutes) for sensitive operations.',
  })
  @ApiResponse({
    status: 200,
    description: 'MFA verified, re-auth token generated',
    schema: {
      example: {
        reAuthToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresIn: 900, // 15 minutes in seconds
      },
    },
  })
  @ApiResponse({ status: 400, description: 'MFA not enabled' })
  @ApiResponse({ status: 401, description: 'Invalid MFA code' })
  async verifyMfaReauth(
    @GetUser('id') userId: string,
    @Body() dto: { mfaCode: string },
  ) {
    return this.authService.verifyMfaReauth(userId, dto.mfaCode);
  }
}
