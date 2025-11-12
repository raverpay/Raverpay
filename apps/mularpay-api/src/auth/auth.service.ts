import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { VirtualAccountsService } from '../virtual-accounts/virtual-accounts.service';
import { RegisterDto, LoginDto } from './dto';
import * as argon2 from 'argon2';
import { User, UserStatus } from '@prisma/client';
import { UsersService } from '../users/users.service';

/**
 * Authentication Service
 *
 * Handles user registration, login, and token management
 * Uses Argon2 for password hashing (more secure than bcrypt)
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly virtualAccountsService: VirtualAccountsService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Register a new user
   *
   * @param dto - Registration data (email, phone, password, name)
   * @returns User object and auth tokens
   */
  async register(dto: RegisterDto) {
    // Check if email already exists
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Check if phone already exists
    const existingPhone = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existingPhone) {
      throw new ConflictException('Phone number already registered');
    }

    // Hash password with Argon2
    const hashedPassword = await this.hashPassword(dto.password);

    try {
      // Create user and wallet in a transaction (atomic operation)
      const user = await this.prisma.$transaction(async (tx) => {
        // Create user
        const newUser = await tx.user.create({
          data: {
            email: dto.email,
            phone: dto.phone,
            password: hashedPassword,
            firstName: dto.firstName,
            lastName: dto.lastName,
            status: UserStatus.PENDING_VERIFICATION,
          },
        });

        // Create wallet for the user
        await tx.wallet.create({
          data: {
            userId: newUser.id,
            balance: 0,
            ledgerBalance: 0,
          },
        });

        return newUser;
      });

      this.logger.log(`New user registered: ${user.email}`);

      // Send email verification code (async, don't wait)
      this.logger.log(
        `Triggering email verification for userId=${user.id}, email=${user.email}`,
      );
      this.usersService.sendEmailVerification(user.id).catch((error) => {
        this.logger.warn(
          `Failed to send email verification for ${user.email}`,
          error,
        );
      });

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        ...tokens,
      };
    } catch (error) {
      this.logger.error('Registration failed:', error);
      throw new BadRequestException('Registration failed. Please try again.');
    }
  }

  /**
   * Login user
   *
   * @param dto - Login credentials (email/phone and password)
   * @returns User object and auth tokens
   */
  async login(dto: LoginDto) {
    // Find user by email or phone
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.identifier }, { phone: dto.identifier }],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is banned or suspended
    if (user.status === UserStatus.BANNED) {
      throw new UnauthorizedException(
        'Your account has been banned. Contact support.',
      );
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException(
        'Your account is suspended. Contact support.',
      );
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(
      user.password,
      dto.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    this.logger.log(`User logged in: ${user.email}`);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      ...tokens,
    };
  }

  /**
   * Refresh access token using refresh token
   *
   * @param refreshToken - Valid refresh token
   * @returns New access token and refresh token
   */
  async refreshTokens(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify<{ sub: string }>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      // Check if token exists and is not revoked
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (!storedToken || storedToken.isRevoked) {
        throw new UnauthorizedException('Refresh token revoked');
      }

      // Check if token is expired
      if (storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token expired');
      }

      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Revoke old refresh token
      await this.prisma.refreshToken.update({
        where: { token: refreshToken },
        data: { isRevoked: true },
      });

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Validate user by ID (used by JWT strategy)
   *
   * @param userId - User ID from JWT payload
   * @returns User object without password
   */
  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check account status
    if (
      user.status === UserStatus.BANNED ||
      user.status === UserStatus.SUSPENDED
    ) {
      throw new UnauthorizedException('Account is not active');
    }

    // Remove password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Generate JWT access and refresh tokens
   *
   * @param user - User object
   * @returns Access token and refresh token
   */
  private async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      // Access token (15 minutes)
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: '15m',
      }),
      // Refresh token (7 days)
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
      }),
    ]);

    // Store refresh token in database
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  /**
   * Hash password using Argon2
   *
   * @param password - Plain text password
   * @returns Hashed password
   */
  private async hashPassword(password: string): Promise<string> {
    return argon2.hash(password);
  }

  /**
   * Verify password against hash
   *
   * @param hash - Hashed password from database
   * @param password - Plain text password to verify
   * @returns True if password matches
   */
  private async verifyPassword(
    hash: string,
    password: string,
  ): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /**
   * Initiate password reset process
   *
   * @param email - User's email address
   * @returns Success message
   */
  async forgotPassword(email: string) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Don't reveal if user exists (security best practice)
    if (!user) {
      return {
        success: true,
        message:
          'If an account exists with this email, a reset code has been sent',
      };
    }

    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in SystemConfig (same pattern as email verification)
    await this.prisma.systemConfig.upsert({
      where: { key: `password_reset_${user.id}` },
      create: {
        key: `password_reset_${user.id}`,
        value: {
          code: resetCode,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          attempts: 0,
        },
      },
      update: {
        value: {
          code: resetCode,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          attempts: 0,
        },
      },
    });

    // Send email via users service
    this.usersService
      .sendPasswordResetEmail(user.id, resetCode)
      .catch((error) => {
        this.logger.error(
          `Failed to send password reset email for ${user.email}`,
          error,
        );
      });

    this.logger.log(`Password reset requested for: ${user.email}`);

    return {
      success: true,
      message:
        'If an account exists with this email, a reset code has been sent',
    };
  }

  /**
   * Verify password reset code
   *
   * @param email - User's email address
   * @param code - 6-digit verification code
   * @returns Reset token (JWT valid for 15 minutes)
   */
  async verifyResetCode(email: string, code: string) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    // Get stored code
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: `password_reset_${user.id}` },
    });

    if (!config) {
      throw new BadRequestException('No reset request found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const storedData = config.value as any;

    // Check expiry
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    if (new Date(storedData.expiresAt) < new Date()) {
      await this.prisma.systemConfig.delete({
        where: { key: `password_reset_${user.id}` },
      });
      throw new BadRequestException('Reset code expired');
    }

    // Check attempts
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (storedData.attempts >= 5) {
      throw new BadRequestException('Too many failed attempts');
    }

    // Verify code
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (storedData.code !== code) {
      // Increment attempts
      await this.prisma.systemConfig.update({
        where: { key: `password_reset_${user.id}` },
        data: {
          value: {
            ...storedData, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            attempts: storedData.attempts + 1,
          },
        },
      });
      throw new BadRequestException('Invalid reset code');
    }

    // Generate reset token (short-lived JWT)
    const resetToken = await this.jwtService.signAsync(
      { sub: user.id, type: 'password_reset' },
      { secret: process.env.JWT_SECRET, expiresIn: '15m' },
    );

    // Delete code (single use)
    await this.prisma.systemConfig.delete({
      where: { key: `password_reset_${user.id}` },
    });

    this.logger.log(`Password reset code verified for: ${user.email}`);

    return { success: true, resetToken };
  }

  /**
   * Reset password using reset token
   *
   * @param resetToken - JWT token from verifyResetCode
   * @param newPassword - New password
   * @returns Success message
   */
  async resetPassword(resetToken: string, newPassword: string) {
    // Verify reset token
    let payload: any; // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    try {
      payload = this.jwtService.verify(resetToken, {
        secret: process.env.JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Check token type
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (payload.type !== 'password_reset') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Validate new password (same rules as registration)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      throw new BadRequestException(
        'Password must be at least 8 characters with uppercase, lowercase, and number/special character',
      );
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update password

    await this.prisma.user.update({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      where: { id: payload.sub },
      data: { password: hashedPassword },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    this.logger.log(`Password reset completed for user: ${payload.sub}`);

    return { success: true, message: 'Password reset successfully' };
  }

  /**
   * Logout user by revoking their refresh token
   *
   * @param userId - User ID from JWT
   * @param refreshToken - Refresh token to revoke (optional - revokes all if not provided)
   * @returns Success message
   */
  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      // Revoke specific refresh token
      const token = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (token && token.userId === userId) {
        await this.prisma.refreshToken.update({
          where: { token: refreshToken },
          data: { isRevoked: true },
        });
        this.logger.log(`User logged out: ${userId} (single session)`);
      }
    } else {
      // Revoke all active refresh tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          isRevoked: false,
        },
        data: { isRevoked: true },
      });
      this.logger.log(`User logged out: ${userId} (all sessions)`);
    }

    return { success: true, message: 'Logged out successfully' };
  }
}
