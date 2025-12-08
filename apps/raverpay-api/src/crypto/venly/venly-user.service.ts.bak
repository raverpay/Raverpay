import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VenlyService } from './venly.service';
import * as crypto from 'crypto';

/**
 * Venly User Management Service
 * Handles user creation and PIN management
 * Based on official Venly API Reference
 */
@Injectable()
export class VenlyUserService {
  private readonly logger = new Logger(VenlyUserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly venly: VenlyService,
  ) {}

  /**
   * Create Venly user + wallet for app user
   * Uses efficient one-call API (creates user + PIN in single request)
   */
  async createVenlyUser(params: { userId: string; pin: string }) {
    const { userId, pin } = params;

    // Check if already exists
    const existing = await this.prisma.venlyUser.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new Error('Venly user already exists');
    }

    // Validate PIN (6 digits)
    if (!/^\d{6}$/.test(pin)) {
      throw new Error('PIN must be 6 digits');
    }

    try {
      // Create Venly user with signing method (ONE API CALL - efficient!)
      const venlyUserResponse = await this.venly.createUser({
        reference: `MULAR_${userId}`,
        pin,
      });

      // Fetch full user details to get signing method ID
      const venlyUserDetails = await this.venly.getUser(venlyUserResponse.id);

      if (!venlyUserDetails.signingMethods || venlyUserDetails.signingMethods.length === 0) {
        throw new Error('No signing method returned from Venly');
      }

      const signingMethod = venlyUserDetails.signingMethods[0]; // First PIN

      // Encrypt PIN (for future use)
      const encryptedPin = this.encryptPin(pin);

      // Save to database
      const savedUser = await this.prisma.venlyUser.create({
        data: {
          userId,
          venlyUserId: venlyUserResponse.id,
          venlySigningMethodId: signingMethod.id,
          venlyReference: venlyUserResponse.reference,
          encryptedPin,
          pinSetAt: new Date(),
        },
      });

      this.logger.log(`Created Venly user for userId: ${userId}`);
      this.logger.log(`Venly user ID: ${venlyUserResponse.id}`);
      this.logger.log(`Signing method ID: ${signingMethod.id}`);

      return savedUser;
    } catch (error) {
      this.logger.error(`Failed to create Venly user for userId: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Get Venly user by app user ID
   */
  async getVenlyUser(userId: string) {
    return this.prisma.venlyUser.findUnique({
      where: { userId },
    });
  }

  /**
   * Get signing method header for Venly API calls
   * Format: {signingMethodId}:{pin}
   */
  async getSigningMethodHeader(userId: string, pin: string): Promise<string> {
    const venlyUser = await this.getVenlyUser(userId);

    if (!venlyUser) {
      throw new Error('Venly user not found');
    }

    // Verify PIN
    const isValid = this.verifyPin(pin, venlyUser.encryptedPin);
    if (!isValid) {
      throw new Error('Invalid PIN');
    }

    // Format: {signingMethodId}:{pin}
    return `${venlyUser.venlySigningMethodId}:${pin}`;
  }

  /**
   * Verify PIN
   */
  async verifyUserPin(userId: string, pin: string): Promise<boolean> {
    const venlyUser = await this.getVenlyUser(userId);

    if (!venlyUser) {
      return false;
    }

    return this.verifyPin(pin, venlyUser.encryptedPin);
  }

  /**
   * Encrypt PIN (AES-256-CBC)
   * Used to store PIN securely for verification
   */
  private encryptPin(pin: string): string {
    const key = process.env.CRYPTO_ENCRYPTION_KEY;

    if (!key || key.length !== 64) {
      // 64 hex chars = 32 bytes
      throw new Error('CRYPTO_ENCRYPTION_KEY must be 64 character hex string (32 bytes)');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);

    let encrypted = cipher.update(pin, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return as: {iv}:{encrypted}
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Verify PIN against encrypted version
   */
  private verifyPin(pin: string, encryptedPin: string): boolean {
    try {
      const key = process.env.CRYPTO_ENCRYPTION_KEY;

      if (!key || key.length !== 64) {
        throw new Error('CRYPTO_ENCRYPTION_KEY not configured');
      }

      const [ivHex, encrypted] = encryptedPin.split(':');

      if (!ivHex || !encrypted) {
        return false;
      }

      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted === pin;
    } catch (error) {
      this.logger.error('Failed to verify PIN', error);
      return false;
    }
  }
}
