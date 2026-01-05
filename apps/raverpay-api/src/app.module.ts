import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';
import { UtilsModule } from './utils/utils.module';
import { VirtualAccountsModule } from './virtual-accounts/virtual-accounts.module';
import { VTUModule } from './vtu/vtu.module';
import { WalletModule } from './wallet/wallet.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { SupportModule } from './support/support.module';
import { CashbackModule } from './cashback/cashback.module';
import { CryptoModule } from './crypto/crypto.module';
import { CircleModule } from './circle/circle.module';
import { DeviceModule } from './device/device.module';
import { LimitsModule } from './limits/limits.module';
import { AppConfigModule } from './app-config/app-config.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
import { RedisThrottlerStorage } from './common/storage/redis-throttler.storage';
import { RateLimitLoggerInterceptor } from './common/interceptors/rate-limit-logger.interceptor';
import { AccountLockingService } from './common/services/account-locking.service';
import { AccountLockGuard } from './common/guards/account-lock.guard';
import { IdempotencyService } from './common/services/idempotency.service';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';
import { RequestLoggerInterceptor } from './common/interceptors/request-logger.interceptor';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueModule } from './queue/queue.module';
import { SentryModule } from '@sentry/nestjs/setup';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import { LogtailModule } from './common/logging/logtail.module';
import { PostHogModule } from './common/analytics/posthog.module';
import { PrismaPulseModule } from './common/monitoring/prisma-pulse.module';
import { DiagnosticModule } from './diagnostic/diagnostic.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    // Configure ConfigModule to load environment variables from .env file
    ConfigModule.forRoot({
      isGlobal: true, // Make ConfigModule available globally
      envFilePath: '.env', // Path to .env file (relative to process.cwd())
    }),
    ScheduleModule.forRoot(), // Enable cron jobs
    // Global rate limiting with Redis storage for distributed tracking
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: seconds(60), // 1 minute window
            limit: 200, // 200 requests per minute
          },
          {
            name: 'short',
            ttl: seconds(10), // 10 second window
            limit: 20, // 20 requests per 10 seconds (burst protection)
          },
          {
            name: 'burst',
            ttl: seconds(5), // 5 second window
            limit: 1, // 1 request per 5 seconds (strict burst protection)
          },
        ],
        storage: new RedisThrottlerStorage(configService),
      }),
    }),
    CacheModule, // Add cache module first for global availability
    CommonModule, // Common module with AuditService - global
    UtilsModule, // Utils module (BVN encryption) - global
    PrismaModule,
    // Monitoring & Queue Infrastructure
    SentryModule.forRoot(), // Error tracking (official NestJS SDK)
    LogtailModule, // Log aggregation
    PostHogModule, // Product analytics
    PrismaPulseModule, // Database change monitoring (requires Prisma Accelerate/Pulse)
    // BullMQ Queue Module - conditionally enabled via USE_BULLMQ_QUEUE env var
    // Set USE_BULLMQ_QUEUE=true to enable, false or unset to disable
    ...(process.env.USE_BULLMQ_QUEUE === 'true' ? [QueueModule] : []),
    AuthModule,
    UsersModule,
    DeviceModule, // Device fingerprinting and management
    LimitsModule, // Daily transaction limits by KYC tier
    WalletModule,
    TransactionsModule,
    PaymentsModule,
    VirtualAccountsModule,
    WebhooksModule,
    VTUModule,
    CashbackModule, // Cashback rewards system
    CryptoModule, // Crypto wallet system (Venly)
    CircleModule, // Circle USDC wallet system
    CloudinaryModule,
    NotificationsModule,
    SupportModule, // Support system (chat, tickets, help center)
    AppConfigModule, // App configuration (rating prompts, etc.)
    DiagnosticModule, // Diagnostic endpoints for testing monitoring services
    AdminModule, // Admin module for dashboard
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AccountLockingService,
    IdempotencyService,
    // Apply custom throttler guard globally (tracks by user ID or IP)
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    // Check if account is locked before processing requests
    {
      provide: APP_GUARD,
      useClass: AccountLockGuard,
    },
    // Log rate limit violations with geolocation
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitLoggerInterceptor,
    },
    // Log all HTTP requests with structured data
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggerInterceptor,
    },
    // Handle idempotency keys (only applies to endpoints with @Idempotent() decorator)
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
    // Global exception filter for Sentry error tracking (official NestJS SDK)
    // This must be added before any other exception filters
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule {}
