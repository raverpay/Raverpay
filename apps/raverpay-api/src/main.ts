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
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3002',
      'https://admin.raverpay.com',
      'https://mularpay-admin.vercel.app',
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
