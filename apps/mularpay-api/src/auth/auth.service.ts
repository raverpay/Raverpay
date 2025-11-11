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

      // Create virtual account for the user (async, don't wait)
      this.virtualAccountsService
        .createVirtualAccount(user.id)
        .catch((error) => {
          this.logger.error(
            `Failed to create virtual account for ${user.id}`,
            error,
          );
        });

      // Send email verification code (async, don't wait)
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

      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

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
}
