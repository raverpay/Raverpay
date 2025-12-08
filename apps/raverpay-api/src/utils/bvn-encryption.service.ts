import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * BVN Encryption Service
 *
 * Encrypts and decrypts BVN values using AES-256-GCM (Galois/Counter Mode)
 * GCM provides both confidentiality and authenticity
 *
 * Similar to transaction PIN encryption but using reversible encryption
 * since BVN needs to be retrieved and sent to Paystack
 */
@Injectable()
export class BVNEncryptionService {
  private readonly logger = new Logger(BVNEncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits
  private readonly saltLength = 64; // 512 bits
  private readonly encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    // Get encryption key from environment variable
    const key = this.configService.get<string>('BVN_ENCRYPTION_KEY');

    if (!key) {
      throw new Error(
        'BVN_ENCRYPTION_KEY environment variable is required for BVN encryption',
      );
    }

    // Derive encryption key from environment variable using PBKDF2
    // This ensures the key is the correct length and adds an extra layer of security
    const salt = this.configService.get<string>('BVN_ENCRYPTION_SALT') || key;
    this.encryptionKey = crypto.pbkdf2Sync(
      key,
      salt,
      100000, // 100k iterations
      this.keyLength,
      'sha512',
    );

    this.logger.log('BVN encryption service initialized');
  }

  /**
   * Encrypt BVN value
   * @param bvn - Plain text BVN (11 digits)
   * @returns Encrypted BVN string (base64 encoded)
   */
  encrypt(bvn: string): string {
    if (!bvn || bvn.trim().length === 0) {
      throw new Error('BVN cannot be empty');
    }

    try {
      // Generate random IV for each encryption
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(
        this.algorithm,
        this.encryptionKey,
        iv,
      );

      // Encrypt BVN
      let encrypted = cipher.update(bvn, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Combine IV, tag, and encrypted data
      // Format: iv:tag:encrypted (all base64 encoded)
      const result = `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted}`;

      return result;
    } catch (error) {
      this.logger.error('Failed to encrypt BVN', error);
      throw new Error('Failed to encrypt BVN');
    }
  }

  /**
   * Decrypt BVN value
   * @param encryptedBvn - Encrypted BVN string (base64 encoded)
   * @returns Plain text BVN (11 digits)
   */
  decrypt(encryptedBvn: string): string {
    if (!encryptedBvn || encryptedBvn.trim().length === 0) {
      throw new Error('Encrypted BVN cannot be empty');
    }

    try {
      // Split encrypted string into parts
      const parts = encryptedBvn.split(':');

      if (parts.length !== 3) {
        throw new Error('Invalid encrypted BVN format');
      }

      const [ivBase64, tagBase64, encrypted] = parts;

      // Decode IV and tag
      const iv = Buffer.from(ivBase64, 'base64');
      const tag = Buffer.from(tagBase64, 'base64');

      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        iv,
      );

      // Set authentication tag
      decipher.setAuthTag(tag);

      // Decrypt BVN
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Failed to decrypt BVN', error);
      throw new Error('Failed to decrypt BVN');
    }
  }

  /**
   * Mask BVN for logging (shows only last 4 digits)
   * @param bvn - Plain text or encrypted BVN
   * @returns Masked BVN string (e.g., *******1234)
   */
  maskForLogging(bvn: string | null | undefined): string {
    if (!bvn) {
      return '*******';
    }

    try {
      // Check if it's encrypted format first
      if (this.isEncrypted(bvn)) {
        const decrypted = this.decrypt(bvn);
        const last4 = decrypted.slice(-4);
        return `*******${last4}`;
      } else {
        // Assume it's plain text
        if (bvn.length >= 4) {
          const last4 = bvn.slice(-4);
          return `*******${last4}`;
        }
        return '*******';
      }
    } catch (error) {
      // If decryption fails, log error but don't throw
      this.logger.warn(
        'Failed to decrypt BVN for logging, using fallback',
        error,
      );
      // Try to extract last 4 digits from encrypted format or plain text
      if (bvn.length >= 4) {
        // If it looks like encrypted format (has colons), try to get last part
        if (bvn.includes(':')) {
          const parts = bvn.split(':');
          if (parts.length === 3 && parts[2].length >= 4) {
            // Try to get last 4 from encrypted part (though this won't be accurate)
            return '*******';
          }
        }
        // Fallback: just mask it
        return '*******';
      }
      return '*******';
    }
  }

  /**
   * Check if a string is encrypted BVN format
   * @param value - String to check
   * @returns Boolean indicating if value appears to be encrypted
   */
  isEncrypted(value: string): boolean {
    if (!value || value.trim().length === 0) {
      return false;
    }

    // Encrypted format is: iv:tag:encrypted (all base64)
    const parts = value.split(':');
    return parts.length === 3;
  }
}
