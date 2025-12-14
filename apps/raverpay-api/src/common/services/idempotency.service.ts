import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';

export interface IdempotencyKeyData {
  key: string;
  userId?: string;
  endpoint: string;
  method: string;
  requestHash: string;
  expiresAt: Date;
}

export interface IdempotencyResult {
  isDuplicate: boolean;
  cachedResponse?: any;
  idempotencyKeyId?: string;
}

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly DEFAULT_TTL_HOURS = 24; // Idempotency keys expire after 24 hours

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate hash of request body for duplicate detection
   */
  generateRequestHash(body: any): string {
    const bodyString = JSON.stringify(body || {});
    return crypto.createHash('sha256').update(bodyString).digest('hex');
  }

  /**
   * Check if idempotency key exists and return cached response if available
   */
  async checkIdempotencyKey(
    key: string,
    endpoint: string,
    method: string,
    requestHash: string,
    userId?: string,
  ): Promise<IdempotencyResult> {
    try {
      // Clean up expired keys first (optional, can be done via cron)
      await this.cleanupExpiredKeys();

      // Find existing key
      const existing = await this.prisma.idempotencyKey.findUnique({
        where: { key },
      });

      if (!existing) {
        return { isDuplicate: false };
      }

      // Check if expired
      if (new Date(existing.expiresAt) < new Date()) {
        // Delete expired key
        await this.prisma.idempotencyKey.delete({
          where: { id: existing.id },
        });
        return { isDuplicate: false };
      }

      // Verify it's for the same endpoint and method
      if (existing.endpoint !== endpoint || existing.method !== method) {
        throw new ConflictException(
          `Idempotency key already used for a different endpoint`,
        );
      }

      // Verify request hash matches (same request body)
      if (existing.requestHash !== requestHash) {
        throw new ConflictException(
          `Idempotency key already used with different request body`,
        );
      }

      // If status is COMPLETED, return cached response
      if (existing.status === 'COMPLETED' && existing.response) {
        this.logger.log(
          `Returning cached response for idempotency key: ${key}`,
        );
        return {
          isDuplicate: true,
          cachedResponse: existing.response,
          idempotencyKeyId: existing.id,
        };
      }

      // If status is PENDING, another request is processing
      if (existing.status === 'PENDING') {
        throw new ConflictException(
          `Request with this idempotency key is already being processed`,
        );
      }

      // If status is FAILED, allow retry
      return { isDuplicate: false, idempotencyKeyId: existing.id };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error('Error checking idempotency key', error);
      // On error, allow request to proceed (fail open)
      return { isDuplicate: false };
    }
  }

  /**
   * Create or update idempotency key
   */
  async createIdempotencyKey(
    data: IdempotencyKeyData,
  ): Promise<{ id: string }> {
    try {
      const idempotencyKey = await this.prisma.idempotencyKey.upsert({
        where: { key: data.key },
        create: {
          key: data.key,
          userId: data.userId,
          endpoint: data.endpoint,
          method: data.method,
          requestHash: data.requestHash,
          status: 'PENDING',
          expiresAt: data.expiresAt,
        },
        update: {
          status: 'PENDING',
          requestHash: data.requestHash,
          expiresAt: data.expiresAt,
        },
      });

      return { id: idempotencyKey.id };
    } catch (error) {
      this.logger.error('Error creating idempotency key', error);
      throw error;
    }
  }

  /**
   * Mark idempotency key as completed and store response
   */
  async markCompleted(idempotencyKeyId: string, response: any): Promise<void> {
    try {
      await this.prisma.idempotencyKey.update({
        where: { id: idempotencyKeyId },
        data: {
          status: 'COMPLETED',
          response: response as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.error('Error marking idempotency key as completed', error);
      // Don't throw - response already sent to client
    }
  }

  /**
   * Mark idempotency key as failed
   */
  async markFailed(idempotencyKeyId: string, error?: any): Promise<void> {
    try {
      await this.prisma.idempotencyKey.update({
        where: { id: idempotencyKeyId },
        data: {
          status: 'FAILED',
          response: error
            ? ({
                error: error.message || 'Request failed',
              } as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        },
      });
    } catch (err) {
      this.logger.error('Error marking idempotency key as failed', err);
      // Don't throw
    }
  }

  /**
   * Calculate expiration date (default 24 hours)
   */
  calculateExpirationDate(ttlHours: number = this.DEFAULT_TTL_HOURS): Date {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);
    return expiresAt;
  }

  /**
   * Clean up expired idempotency keys
   */
  async cleanupExpiredKeys(): Promise<number> {
    try {
      const result = await this.prisma.idempotencyKey.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} expired idempotency keys`);
      }

      return result.count;
    } catch (error) {
      this.logger.error('Error cleaning up expired idempotency keys', error);
      return 0;
    }
  }
}
