import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import { redisStore } from 'cache-manager-ioredis-yet';
import type { RedisOptions } from 'ioredis';
import { setRedisClient } from './redis-client';

@Global()
@Module({
  imports: [
    ConfigModule,
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        // Try multiple environment variable names for Redis URL
        const redisUrl =
          configService.get<string>('UPSTASH_REDIS_URL') ||
          configService.get<string>('REDIS_URL');

        if (!redisUrl) {
          // Fallback to in-memory cache if Redis is not configured
          console.warn(
            '⚠️  REDIS_URL or UPSTASH_REDIS_URL not found. Using in-memory cache.',
          );
          return {
            ttl: 60000, // 60 seconds default TTL
            max: 100, // Max items in cache
          };
        }

        console.log(
          '✅ Redis cache enabled with URL:',
          redisUrl.replace(/:[^:@]*@/, ':****@'),
        );

        // Parse Redis URL
        const url = new URL(redisUrl);

        // For Upstash, extract the full auth token (everything between :// and @)
        // Format: rediss://default:TOKEN@host:port or rediss://TOKEN@host:port
        let password: string | undefined;
        if (url.username && url.password) {
          // If username is 'default', use the password as-is
          password = url.password;
        } else if (url.username) {
          // If only username exists (no :password), username IS the password
          password = url.username;
        }

        const redisOptions: RedisOptions = {
          host: url.hostname,
          port: parseInt(url.port || '6379'),
          password,
          tls: url.protocol === 'rediss:' ? {} : undefined,
          retryStrategy: (times) => {
            // Retry up to 3 times with exponential backoff
            if (times > 3) {
              // Suppress error message - already handled by error event
              return null; // Stop retrying
            }
            const delay = Math.min(times * 100, 1000);
            return delay;
          },
          connectTimeout: 10000,
          lazyConnect: true, // Don't connect immediately - prevents error spam
          enableReadyCheck: true,
          maxRetriesPerRequest: null, // Required for some Redis operations
          enableOfflineQueue: false,
          showFriendlyErrorStack: false,
        };

        const isDevelopment =
          configService.get<string>('NODE_ENV') !== 'production';
        if (isDevelopment) {
          console.log('🔌 Redis cache configured (lazy connect)', {
            host: redisOptions.host,
            port: redisOptions.port,
            tls: !!redisOptions.tls,
          });
        }

        try {
          const store = await redisStore(redisOptions);

          // Add error handler to suppress unhandled error events
          // The store.client may be an ioredis instance
          if (store && typeof store === 'object' && 'client' in store) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            const client = (store as any).client;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (client && typeof client.on === 'function') {
              let hasLoggedError = false;
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
              client.on('error', (err: Error) => {
                // Suppress ALL DNS lookup errors and repeated errors
                if (
                  err.message.includes('ENOTFOUND') ||
                  err.message.includes('WRONGPASS') ||
                  err.message.includes('ECONNREFUSED')
                ) {
                  // Completely suppress these errors - they're expected when Redis is unavailable
                  return;
                }
                // Only log other errors once
                if (!hasLoggedError) {
                  const isDevelopment =
                    configService.get<string>('NODE_ENV') !== 'production';
                  if (isDevelopment) {
                    console.warn(
                      `⚠️  Redis cache connection issue: ${err.message}. Using in-memory fallback.`,
                    );
                  } else {
                    console.error('Redis client error:', err.message);
                  }
                  hasLoggedError = true;
                }
              });
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
              client.on('ready', () => {
                console.log('✅ Redis cache client ready and authenticated');
                hasLoggedError = false; // Reset on successful connection
              });

              // Store client reference for RedisService
              setRedisClient(client);
            }
          }

          const isDevelopment =
            configService.get<string>('NODE_ENV') !== 'production';
          if (isDevelopment) {
            console.log('✅ Redis store created successfully (lazy connect)');
          }
          return {
            store,
            ttl: 60000, // 60 seconds default TTL
          };
        } catch (error) {
          const isDevelopment =
            configService.get<string>('NODE_ENV') !== 'production';
          if (isDevelopment) {
            console.warn('⚠️  Redis cache unavailable. Using in-memory fallback.');
          } else {
            console.error('❌ Failed to create Redis store:', error);
            console.warn('⚠️  Falling back to in-memory cache');
          }
          return {
            ttl: 60000,
            max: 100,
          };
        }
      },
    }),
  ],
  providers: [RedisService],
  exports: [NestCacheModule, RedisService],
})
export class CacheModule {}
