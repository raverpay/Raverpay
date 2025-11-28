import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { redisClient } from './redis-client';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value !== undefined && value !== null) {
        this.logger.debug(`✅ Cache HIT: ${key}`);
      } else {
        this.logger.debug(`❌ Cache MISS: ${key}`);
      }
      return value ?? null;
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL (in seconds)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const ttlMs = ttl ? ttl * 1000 : undefined;
      await this.cacheManager.set(key, value, ttlMs);
      this.logger.debug(`💾 Cache SET: ${key} (TTL: ${ttl || 'default'}s)`);
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}:`, error);
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`🗑️  Cache DEL: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DEL error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys matching pattern using Redis SCAN
   * Works with ioredis client for efficient pattern-based deletion
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      // Use the module-exported Redis client
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const client = redisClient;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (!client || typeof client.scanStream !== 'function') {
        this.logger.warn(
          `🗑️  Cache DEL PATTERN skipped: ${pattern} (no Redis client available, relying on TTL)`,
        );
        return;
      }

      // Use SCAN to find all matching keys and delete them
      let deletedCount = 0;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const stream = client.scanStream({
        match: pattern,
        count: 100,
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      stream.on('data', async (keys: string[]) => {
        if (keys.length > 0) {
          // Delete keys in pipeline for better performance
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          const pipeline = client.pipeline();
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          keys.forEach((key: string) => pipeline.del(key));
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          await pipeline.exec();
          deletedCount += keys.length;
        }
      });

      await new Promise<void>((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        stream.on('end', () => {
          this.logger.debug(
            `🗑️  Cache DEL PATTERN: ${pattern} (deleted ${deletedCount} keys)`,
          );
          resolve();
        });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        stream.on('error', (err: Error) => {
          reject(err);
        });
      });
    } catch (error) {
      this.logger.error(
        `Cache DEL PATTERN error for pattern ${pattern}:`,
        error,
      );
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    try {
      // Fallback implementation using get/set
      const current = (await this.get<number>(key)) || 0;
      const newValue = current + 1;
      await this.set(key, newValue);
      return newValue;
    } catch (error) {
      this.logger.error(`Cache INCR error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Set expiration on key (in seconds)
   */
  async expire(key: string, ttl: number): Promise<void> {
    try {
      const value = await this.get(key);
      if (value !== null) {
        await this.set(key, value, ttl);
      }
    } catch (error) {
      console.error(`Cache EXPIRE error for key ${key}:`, error);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const value = await this.get(key);
      return value !== null;
    } catch (error) {
      console.error(`Cache EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get multiple keys
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      return await Promise.all(keys.map((key) => this.get<T>(key)));
    } catch (error) {
      console.error(`Cache MGET error:`, error);
      return keys.map(() => null);
    }
  }
}
