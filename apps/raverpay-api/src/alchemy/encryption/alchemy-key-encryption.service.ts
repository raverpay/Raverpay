import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Alchemy Private Key Encryption Service
 *
 * Encrypts and decrypts Alchemy wallet private keys using AES-256-GCM (Galois/Counter Mode)
 * GCM provides both confidentiality and authenticity
 *
 * Security Features:
 * - AES-256-GCM encryption (authenticated encryption)
 * - PBKDF2 key derivation (100k iterations)
 * - User-specific salt (userId) for key derivation
 * - Random IV for each encryption
 * - Authentication tag to prevent tampering
 *
 * Pattern based on MfaEncryptionUtil
 */
@Injectable()
export class AlchemyKeyEncryptionService {
  private readonly logger = new Logger(AlchemyKeyEncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly iterations = 100000; // PBKDF2 iterations (100k for security)

  constructor(private readonly configService: ConfigService) {
    this.logger.log('Alchemy key encryption service initialized');
  }

  /**
   * Encrypt a private key using user-specific encryption
   * @param privateKey - Hex-encoded private key (e.g., 0x123abc...)
   * @param userId - User ID (used as part of key derivation for additional security)
   * @returns Encrypted private key string (format: iv:tag:encrypted)
   */
  encryptPrivateKey(privateKey: string, userId: string): string {
    if (!privateKey || privateKey.trim().length === 0) {
      throw new Error('Private key cannot be empty');
    }

    if (!userId || userId.trim().length === 0) {
      throw new Error('User ID cannot be empty');
    }

    // Get and validate master encryption key BEFORE try-catch
    // This ensures validation errors are thrown directly, not wrapped
    const masterKey = this.getMasterKey();

    try {
      // Derive user-specific encryption key
      // This ensures each user's keys are encrypted with a unique key
      const encryptionKey = this.deriveEncryptionKey(masterKey, userId);

      // Generate random IV for this encryption
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, encryptionKey, iv);

      // Encrypt private key
      let encrypted = cipher.update(privateKey, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Combine IV, tag, and encrypted data
      // Format: iv:tag:encrypted (all base64 encoded)
      const result = `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted}`;

      this.logger.debug(`Encrypted private key for user ${userId}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to encrypt private key for user ${userId}`,
        error.stack,
      );
      throw new Error('Failed to encrypt private key');
    }
  }

  /**
   * Decrypt a private key
   * @param encryptedPrivateKey - Encrypted private key string (format: iv:tag:encrypted)
   * @param userId - User ID (must match the one used during encryption)
   * @returns Decrypted private key (hex-encoded)
   */
  decryptPrivateKey(encryptedPrivateKey: string, userId: string): string {
    if (!encryptedPrivateKey || encryptedPrivateKey.trim().length === 0) {
      throw new Error('Encrypted private key cannot be empty');
    }

    if (!userId || userId.trim().length === 0) {
      throw new Error('User ID cannot be empty');
    }

    // Validate format BEFORE try-catch
    const parts = encryptedPrivateKey.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted private key format');
    }

    try {
      const [ivBase64, tagBase64, encrypted] = parts;

      // Decode IV and tag
      const iv = Buffer.from(ivBase64, 'base64');
      const tag = Buffer.from(tagBase64, 'base64');

      // Get master encryption key from environment
      const masterKey = this.getMasterKey();

      // Derive same user-specific encryption key
      const encryptionKey = this.deriveEncryptionKey(masterKey, userId);

      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        encryptionKey,
        iv,
      );

      // Set authentication tag
      decipher.setAuthTag(tag);

      // Decrypt private key
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      this.logger.debug(`Decrypted private key for user ${userId}`);
      return decrypted;
    } catch (error) {
      this.logger.error(
        `Failed to decrypt private key for user ${userId}`,
        error.stack,
      );
      throw new Error('Failed to decrypt private key');
    }
  }

  /**
   * Rotate encryption for a private key (use when rotating master key)
   * @param oldEncryptedKey - Private key encrypted with old master key
   * @param userId - User ID
   * @param newMasterKey - New master encryption key
   * @returns Private key re-encrypted with new master key
   */
  rotateEncryption(
    oldEncryptedKey: string,
    userId: string,
    newMasterKey: string,
  ): string {
    // Decrypt with current master key
    const privateKey = this.decryptPrivateKey(oldEncryptedKey, userId);

    // Re-encrypt with new master key
    const oldMasterKey = this.getMasterKey();

    try {
      // Temporarily use new master key
      const newEncryptionKey = this.deriveEncryptionKeyFromMaster(
        newMasterKey,
        userId,
      );

      // Generate new IV
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher with new key
      const cipher = crypto.createCipheriv(
        this.algorithm,
        newEncryptionKey,
        iv,
      );

      // Encrypt
      let encrypted = cipher.update(privateKey, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Return new encrypted value
      const result = `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted}`;

      this.logger.log(
        `Rotated encryption for user ${userId} private key`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to rotate encryption for user ${userId}`,
        error.stack,
      );
      throw new Error('Failed to rotate encryption');
    }
  }

  /**
   * Check if a string is encrypted (has the expected format)
   * @param value - String to check
   * @returns True if encrypted, false otherwise
   */
  isEncrypted(value: string): boolean {
    if (!value || value.trim().length === 0) {
      return false;
    }

    // Check if it has the encrypted format: iv:tag:encrypted
    const parts = value.split(':');
    return parts.length === 3;
  }

  /**
   * Get master encryption key from environment
   * @private
   */
  private getMasterKey(): string {
    const masterKey = this.configService.get<string>(
      'ALCHEMY_ENCRYPTION_MASTER_KEY',
    );

    if (!masterKey) {
      this.logger.error('ALCHEMY_ENCRYPTION_MASTER_KEY not configured');
      throw new Error(
        'ALCHEMY_ENCRYPTION_MASTER_KEY environment variable is required',
      );
    }

    // Validate key length (should be 64 hex characters = 32 bytes)
    if (masterKey.length < 32) {
      this.logger.error(
        'ALCHEMY_ENCRYPTION_MASTER_KEY is too short (minimum 32 characters)',
      );
      throw new Error('ALCHEMY_ENCRYPTION_MASTER_KEY is too weak');
    }

    return masterKey;
  }

  /**
   * Derive encryption key from master key and user ID
   * Uses PBKDF2 with 100k iterations for security
   * @private
   */
  private deriveEncryptionKey(masterKey: string, userId: string): Buffer {
    return this.deriveEncryptionKeyFromMaster(masterKey, userId);
  }

  /**
   * Derive encryption key from a specific master key and user ID
   * @private
   */
  private deriveEncryptionKeyFromMaster(
    masterKey: string,
    userId: string,
  ): Buffer {
    // Use userId as salt for user-specific key derivation
    // This ensures each user's keys are encrypted with a unique derived key
    const salt = `alchemy:${userId}`;

    return crypto.pbkdf2Sync(
      masterKey,
      salt,
      this.iterations,
      this.keyLength,
      'sha512',
    );
  }
}
