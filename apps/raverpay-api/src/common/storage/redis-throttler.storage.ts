import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

/**
 * Redis-based storage for rate limiting
 * Provides persistent, distributed rate limit tracking across multiple servers
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private redis: Redis;
  private isConnected = false;
  private connectionAttempted = false;
  private hasLoggedError = false;

  constructor(private configService: ConfigService) {
    const redisUrl =
      this.configService.get<string>('UPSTASH_REDIS_URL') ||
      this.configService.get<string>('REDIS_URL');

    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: null, // BullMQ requirement
          enableReadyCheck: true,
          enableOfflineQueue: false,
          lazyConnect: true, // Don't connect immediately
          retryStrategy: (times: number) => {
            // Stop retrying after 3 attempts
            if (times > 3) {
              return null;
            }
            return Math.min(times * 100, 1000);
          },
          connectTimeout: 10000,
          showFriendlyErrorStack: false,
        });

        // Suppress all error events to avoid log spam
        this.redis.on('error', (err) => {
          this.isConnected = false;
          // Completely suppress DNS lookup errors - they're expected when Redis is unavailable
          if (
            err.message.includes('ENOTFOUND') ||
            err.message.includes('getaddrinfo')
          ) {
            // Silently ignore - fallback to in-memory storage
            return;
          }
          // Only log other errors once
          if (!this.hasLoggedError) {
            const isDevelopment =
              this.configService.get<string>('NODE_ENV') !== 'production';
            if (isDevelopment) {
              this.logger.warn(
                `Redis connection failed: ${err.message}. Using in-memory fallback for rate limiting`,
              );
            } else {
              this.logger.error(
                `Redis connection failed: ${err.message}. Using in-memory fallback for rate limiting`,
              );
            }
            this.hasLoggedError = true;
          }
        });

        this.redis.on('connect', () => {
          this.isConnected = true;
          this.hasLoggedError = false;
          this.logger.log('✅ Redis throttler storage connected');
        });

        // Try to connect silently
        this.redis.connect().catch(() => {
          // Connection failed, will use in-memory fallback
          // Error already logged via 'error' event handler
        });
      } catch (error) {
        const isDevelopment =
          this.configService.get<string>('NODE_ENV') !== 'production';
        if (isDevelopment) {
          this.logger.warn(
            '⚠️  Failed to initialize Redis throttler storage. Using in-memory fallback.',
          );
        } else {
          this.logger.error(
            '❌ Failed to initialize Redis throttler storage:',
            error,
          );
        }
      }
    } else {
      const isDevelopment =
        this.configService.get<string>('NODE_ENV') !== 'production';
      if (isDevelopment) {
        this.logger.debug(
          'Redis URL not configured for throttler. Using in-memory storage.',
        );
      } else {
        this.logger.warn(
          '⚠️  Redis URL not configured for throttler. Using in-memory storage.',
        );
      }
    }
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<{
    totalHits: number;
    timeToExpire: number;
    isBlocked: boolean;
    timeToBlockExpire: number;
  }> {
    // Fallback to in-memory if Redis not connected
    if (!this.isConnected || !this.redis) {
      return this.inMemoryIncrement(key, ttl, limit, blockDuration);
    }

    try {
      const multi = this.redis.multi();
      multi.incr(key);
      multi.pttl(key);

      const results = await multi.exec();
      if (!results) {
        return this.inMemoryIncrement(key, ttl, limit, blockDuration);
      }

      const totalHits = (results[0][1] as number) || 1;
      let timeToExpire = (results[1][1] as number) || -1;

      // Set TTL on first hit
      if (timeToExpire === -1) {
        await this.redis.pexpire(key, ttl);
        timeToExpire = ttl;
      }

      return {
        totalHits,
        timeToExpire: Math.max(timeToExpire, 0),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    } catch (error) {
      this.logger.error('Redis increment error:', error);
      return this.inMemoryIncrement(key, ttl, limit, blockDuration);
    }
  }

  // Fallback in-memory storage for when Redis is unavailable
  private inMemoryStorage: Map<string, { hits: number; expiresAt: number }> =
    new Map();

  private inMemoryIncrement(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): {
    totalHits: number;
    timeToExpire: number;
    isBlocked: boolean;
    timeToBlockExpire: number;
  } {
    const now = Date.now();
    const record = this.inMemoryStorage.get(key);

    if (!record || record.expiresAt < now) {
      // Create new record
      this.inMemoryStorage.set(key, {
        hits: 1,
        expiresAt: now + ttl,
      });
      return {
        totalHits: 1,
        timeToExpire: ttl,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }

    // Increment existing record
    record.hits++;
    this.inMemoryStorage.set(key, record);

    return {
      totalHits: record.hits,
      timeToExpire: Math.max(record.expiresAt - now, 0),
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }

  // Cleanup expired in-memory records periodically
  private cleanupInterval = setInterval(
    () => {
      const now = Date.now();
      for (const [key, record] of this.inMemoryStorage.entries()) {
        if (record.expiresAt < now) {
          this.inMemoryStorage.delete(key);
        }
      }
    },
    60000, // Cleanup every minute
  );

  async onModuleDestroy() {
    clearInterval(this.cleanupInterval);
    if (this.redis) {
      await this.redis.quit();
    }
  }
}
