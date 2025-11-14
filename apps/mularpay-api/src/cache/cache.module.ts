import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import { redisStore } from 'cache-manager-ioredis-yet';
import type { RedisOptions } from 'ioredis';

@Global()
@Module({
  imports: [
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

        console.log('✅ Redis cache enabled with URL:', redisUrl.replace(/:[^:@]*@/, ':****@'));

        // Parse Redis URL
        const url = new URL(redisUrl);
        const redisOptions: RedisOptions = {
          host: url.hostname,
          port: parseInt(url.port || '6379'),
          password: url.password || undefined,
          tls: url.protocol === 'rediss:' ? {} : undefined,
        };

        return {
          store: await redisStore(redisOptions),
          ttl: 60000, // 60 seconds default TTL
        };
      },
    }),
  ],
  providers: [RedisService],
  exports: [NestCacheModule, RedisService],
})
export class CacheModule {}
