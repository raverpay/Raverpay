import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import rateLimit from 'express-rate-limit';
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

  // Rate limiting for OTP endpoints (10 requests per hour per IP)
  const otpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Max 10 OTP sends per hour per IP
    message: 'Too many OTP requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiting to OTP endpoints
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use('/api/users/send-email-verification', otpLimiter);
  expressApp.use('/api/users/send-phone-verification', otpLimiter);
  expressApp.use('/api/auth/forgot-password', otpLimiter);

  logger.log('✅ Rate limiting enabled for OTP endpoints (10 req/hour per IP)');

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`🚀 RaverPay API running on http://localhost:${port}`);
  logger.log(`📚 API endpoints available at http://localhost:${port}/api`);
}

void bootstrap();
