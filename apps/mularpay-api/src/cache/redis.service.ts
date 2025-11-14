import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

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
   * Delete multiple keys matching pattern
   * Note: This is a simplified implementation that doesn't actually support patterns
   * For production use with pattern matching, consider using a direct Redis client
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      // For now, we'll just log the pattern
      // In production, you'd need direct Redis access for pattern matching
      this.logger.debug(
        `🗑️  Cache DEL PATTERN requested: ${pattern} (relying on TTL expiration)`,
      );
      // Since we can't efficiently delete by pattern without direct Redis access,
      // we'll rely on TTL to expire old cache entries
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
