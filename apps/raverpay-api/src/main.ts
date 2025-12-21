// IMPORTANT: Import instrument.ts at the very top before any other imports
// This initializes Sentry before everything else
import './instrument';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { webcrypto } from 'crypto';

// Polyfill for crypto.randomUUID() in Node.js v18
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as any;
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Suppress Redis DNS lookup errors globally
  // These errors are expected when Redis is unavailable and are handled gracefully
  const shouldSuppressError = (error: any): boolean => {
    if (!error || typeof error !== 'object') return false;
    const message = error.message || error.toString() || '';
    const stack = error.stack || '';

    // Suppress Redis DNS lookup errors
    if (
      message.includes('ENOTFOUND') &&
      (message.includes('upstash.io') || stack.includes('upstash.io'))
    ) {
      return true;
    }
    // Suppress Redis connection errors
    if (
      message.includes('getaddrinfo ENOTFOUND') ||
      message.includes('ECONNREFUSED') ||
      (message.includes('Redis') && message.includes('connection'))
    ) {
      return true;
    }
    return false;
  };

  // Suppress uncaught exceptions from Redis
  process.on('uncaughtException', (error: Error) => {
    if (shouldSuppressError(error)) {
      // Silently ignore - Redis is unavailable, fallbacks are in place
      return;
    }
    // Let other errors through
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });

  // Suppress unhandled rejections from Redis
  process.on('unhandledRejection', (reason: any) => {
    if (shouldSuppressError(reason)) {
      // Silently ignore - Redis is unavailable, fallbacks are in place
      return;
    }
    // Let other rejections through
    console.error('Unhandled Rejection:', reason);
  });

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
