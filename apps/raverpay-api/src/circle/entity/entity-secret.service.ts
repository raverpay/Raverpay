import { Injectable, Logger } from '@nestjs/common';
import { CircleConfigService } from '../config/circle.config.service';
import { CircleApiClient } from '../circle-api.client';
import { EntityPublicKey } from '../circle.types';
import * as crypto from 'crypto';
import * as forge from 'node-forge';

/**
 * Entity Secret Service
 * Handles encryption of entity secrets for Circle API requests
 *
 * The entity secret is a 32-byte private key that secures developer-controlled wallets.
 * It must be encrypted with Circle's public key before being sent in API requests.
 */
@Injectable()
export class EntitySecretService {
  private readonly logger = new Logger(EntitySecretService.name);
  private entityPublicKey: string | null = null;
  private publicKeyFetchedAt: Date | null = null;
  private readonly publicKeyTTL = 3600000; // 1 hour in milliseconds

  constructor(
    private readonly config: CircleConfigService,
    private readonly apiClient: CircleApiClient,
  ) {}

  /**
   * Get Circle's entity public key
   * Caches the key for 1 hour to reduce API calls
   */
  async getEntityPublicKey(): Promise<string> {
    // Check if we have a cached key that's still valid
    if (
      this.entityPublicKey &&
      this.publicKeyFetchedAt &&
      Date.now() - this.publicKeyFetchedAt.getTime() < this.publicKeyTTL
    ) {
      return this.entityPublicKey;
    }

    try {
      const response = await this.apiClient.get<EntityPublicKey>(
        '/config/entity/publicKey',
      );
      this.entityPublicKey = response.data.publicKey;
      this.publicKeyFetchedAt = new Date();
      this.logger.log('Successfully fetched Circle entity public key');
      return this.entityPublicKey;
    } catch (error) {
      this.logger.error('Failed to fetch entity public key:', error);
      throw new Error('Failed to fetch Circle entity public key');
    }
  }

  /**
   * Generate a new unique entity secret ciphertext for an API request
   *
   * Uses Circle's official encryption method with node-forge.
   * RSA-OAEP with SHA-256 for both digest and MGF1.
   */
  async generateEntitySecretCiphertext(): Promise<string> {
    const entitySecret = this.config.entitySecret;

    if (!entitySecret) {
      throw new Error('Entity secret is not configured');
    }

    // Validate entity secret is 32 bytes (64 hex characters)
    if (!/^[0-9a-fA-F]{64}$/.test(entitySecret)) {
      throw new Error('Entity secret must be 32 bytes (64 hex characters)');
    }

    // Get the public key
    const publicKeyPem = await this.getEntityPublicKey();

    // Convert hex entity secret to bytes using forge
    const entitySecretBytes = forge.util.hexToBytes(entitySecret);

    if (entitySecretBytes.length !== 32) {
      throw new Error('Invalid entity secret length');
    }

    // Encrypt using RSA-OAEP with SHA-256 (Circle's official method)
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    const encryptedData = publicKey.encrypt(entitySecretBytes, 'RSA-OAEP', {
      md: forge.md.sha256.create(),
      mgf1: {
        md: forge.md.sha256.create(),
      },
    });

    // Return base64-encoded ciphertext
    return forge.util.encode64(encryptedData);
  }

  /**
   * Validate that an entity secret is properly formatted
   */
  validateEntitySecret(secret: string): boolean {
    // Must be 32 bytes (64 hex characters)
    if (/^[0-9a-fA-F]{64}$/.test(secret)) {
      return true;
    }

    // Or a 32-character string
    if (secret.length === 32) {
      return true;
    }

    return false;
  }

  /**
   * Generate a new random entity secret (for initial setup)
   * Returns a 32-byte hex string
   */
  generateNewEntitySecret(): string {
    const secret = crypto.randomBytes(32);
    return secret.toString('hex');
  }

  /**
   * Clear the cached public key (useful for testing or key rotation)
   */
  clearPublicKeyCache(): void {
    this.entityPublicKey = null;
    this.publicKeyFetchedAt = null;
    this.logger.log('Entity public key cache cleared');
  }
}
