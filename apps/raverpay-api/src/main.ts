import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { webcrypto } from 'crypto';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// Polyfill for crypto.randomUUID() in Node.js v18
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as any;
}

// Initialize Sentry before creating the NestJS app
const sentryDsn = process.env.SENTRY_DSN;
const environment =
  process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
const release =
  process.env.SENTRY_RELEASE || process.env.npm_package_version || '1.0.0';

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment,
    release,
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
    integrations: [Sentry.httpIntegration(), nodeProfilingIntegration()],
    beforeSend(event, hint) {
      // Filter sensitive data
      if (event.request?.headers) {
        const sensitiveFields = [
          'password',
          'pin',
          'token',
          'bvn',
          'nin',
          'authorization',
          'x-api-key',
        ];

        sensitiveFields.forEach((field) => {
          if (event.request?.headers?.[field]) {
            event.request.headers[field] = '[Filtered]';
          }
        });
      }

      if (event.request?.data) {
        const data = event.request.data as Record<string, any>;
        const sensitiveFields = ['password', 'pin', 'token', 'bvn', 'nin'];
        sensitiveFields.forEach((field) => {
          if (data[field]) {
            data[field] = '[Filtered]';
          }
        });
      }

      return event;
    },
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'NetworkError',
      'Failed to fetch',
    ],
  });
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Configure log level based on environment variable
  // Default: 'warn' in production, 'log' in development
  const logLevel =
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === 'production' ? 'warn' : 'log');

  const app = await NestFactory.create(AppModule, {
    logger:
      logLevel === 'error'
        ? ['error']
        : logLevel === 'warn'
          ? ['error', 'warn']
          : logLevel === 'log'
            ? ['error', 'warn', 'log']
            : logLevel === 'debug'
              ? ['error', 'warn', 'log', 'debug', 'verbose']
              : ['error', 'warn', 'log'],
  });

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'https://myadmin.raverpay.com',
    ],
    credentials: true,
  });

  // Global validation pipe for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties exist
      transform: true, // Transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API prefix (e.g., /api/auth/login)
  app.setGlobalPrefix('api');

  logger.log('✅ Global rate limiting enabled:');
  logger.log('   - 200 requests/minute per user/IP (default)');
  logger.log('   - 20 requests/10 seconds per user/IP (burst protection)');
  logger.log('   - Login: 5 attempts/15 min');
  logger.log('   - Register: 3 attempts/hour');
  logger.log('   - Password reset: 3 attempts/hour');
  logger.log('   - Card funding: 10 attempts/hour');
  logger.log('   - Withdrawals: 5 attempts/hour');
  logger.log('   - P2P transfers: 20 attempts/hour');
  logger.log('   - Admin operations: 100 requests/minute');

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`🚀 RaverPay API running on http://localhost:${port}`);
  logger.log(`📚 API endpoints available at http://localhost:${port}/api`);
}

void bootstrap();
