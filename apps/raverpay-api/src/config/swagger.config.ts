import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Swagger/OpenAPI Configuration for Raverpay API
 *
 * This configuration sets up comprehensive API documentation with:
 * - JWT authentication scheme
 * - Organized endpoint tags
 * - Environment-based servers
 * - Custom branding
 */
import { AdminModule } from '../admin/admin.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';
import { VirtualAccountsModule } from '../virtual-accounts/virtual-accounts.module';
import { VTUModule } from '../vtu/vtu.module';
import { WalletModule } from '../wallet/wallet.module';

import { SupportModule } from '../support/support.module';
import { CashbackModule } from '../cashback/cashback.module';
import { CryptoModule } from '../crypto/crypto.module';
import { CircleModule } from '../circle/circle.module';
import { DeviceModule } from '../device/device.module';
import { LimitsModule } from '../limits/limits.module';
import { AppConfigModule } from '../app-config/app-config.module';
import { DiagnosticModule } from '../diagnostic/diagnostic.module';
import { WebhooksModule } from '../webhooks/webhooks.module'; // Corrected import

/**
 * Configure Public API Swagger Documentation
 * Excludes AdminModule
 */
export function setupPublicSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Raverpay API')
    .setDescription(
      `
# Raverpay Fintech Platform API

Welcome to the Raverpay API documentation. This API powers a comprehensive fintech platform.

## Core Features
- **Wallet Management** - Multi-currency wallets with real-time balance tracking
- **Payments** - Fund, withdraw, and P2P transfers
- **Circle Integration** - USDC wallets, CCTP bridging, and paymaster functionality
- **Authentication** - JWT-based auth with role-based access control
- **VTU Services** - Airtime and data purchases
- **Giftcards** - Buy and sell giftcards
- **Crypto** - Cryptocurrency trading via Venly
- **Notifications** - Multi-channel notifications (Email, Push, In-App)
- **Cashback** - Rewards and cashback system

## Authentication
Most endpoints require JWT authentication.
      `.trim(),
    )
    .setVersion('1.0.0')
    .setContact(
      'Raverpay Support',
      'https://app.raverpay.com',
      'support@raverpay.com',
    )
    .setLicense('Proprietary', 'https://app.raverpay.com/terms')
    .addServer('http://localhost:3001', 'Local Development')
    .addServer('https://api-staging.raverpay.com', 'Staging')
    .addServer('https://api.raverpay.com', 'Production')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    // Organize endpoints by tags
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Users', 'User profile and account management')
    .addTag('Wallet', 'Wallet balance and operations')
    .addTag('Payments', 'Payment processing and webhooks')
    .addTag('Transactions', 'Transaction history and details')
    .addTag('Circle', 'Circle USDC wallets and operations')
    .addTag('Circle - User Controlled', 'User-controlled Circle wallets')
    .addTag('Circle - Paymaster', 'Paymaster pre-approval and operations')
    .addTag('Circle - Webhooks', 'Circle webhook handlers')
    .addTag('VTU', 'Airtime and data top-up services')
    .addTag('Crypto', 'Cryptocurrency trading via Venly')
    .addTag('Virtual Accounts', 'Virtual account management')
    .addTag('Cashback', 'Cashback and rewards')
    .addTag('Notifications', 'User notifications and preferences')
    .addTag('Support', 'Customer support and help')
    .addTag('Devices', 'Device management')
    .addTag('Limits', 'Transaction limits')
    .addTag('App Config', 'Application configuration')
    .addTag('Diagnostic', 'System health and diagnostics')
    .addTag('Webhooks - Paystack', 'Paystack webhook handlers')
    .addTag('Webhooks - Circle', 'Circle webhook handlers')
    .addTag('Webhooks - Resend', 'Resend webhook handlers')
    .addTag('Webhooks - VTU', 'VTU webhook handlers')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey}_${methodKey}`,
    include: [
      AuthModule,
      UsersModule,
      WalletModule,
      PaymentsModule,
      TransactionsModule,
      CircleModule,
      VTUModule,
      CryptoModule,
      VirtualAccountsModule,
      CashbackModule,
      NotificationsModule,
      SupportModule,
      DeviceModule,
      LimitsModule,
      AppConfigModule,
      DiagnosticModule,
      WebhooksModule,
    ],
  });

  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Raverpay API Documentation',
    customfavIcon: 'https://app.raverpay.com/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #6366f1; }
      .swagger-ui .scheme-container { background: #f8f9fa; padding: 20px; border-radius: 8px; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      filter: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      defaultModelsExpandDepth: 3,
      defaultModelExpandDepth: 3,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  console.log('📚 Public Swagger documentation available at /api/docs');
}

/**
 * Configure Admin API Swagger Documentation
 * Includes ONLY AdminModule
 */
export function setupAdminSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Raverpay Admin API')
    .setDescription('Restricted access for internal administration tools.')
    .setVersion('1.0.0')
    .addServer('http://localhost:3001', 'Local Development')
    .addServer('https://api-staging.raverpay.com', 'Staging')
    .addServer('https://api.raverpay.com', 'Production')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Admin - Users', 'Admin user management')
    .addTag('Admin - Wallets', 'Admin wallet operations')
    .addTag('Admin - Transactions', 'Admin transaction management')
    .addTag('Admin - Circle', 'Admin Circle operations')
    .addTag('Admin - Crypto', 'Admin crypto operations')
    .addTag('Admin - VTU', 'Admin VTU management')
    .addTag('Admin - Giftcards', 'Admin giftcard management')
    .addTag('Admin - KYC', 'Admin KYC verification')
    .addTag('Admin - Support', 'Admin support management')
    .addTag('Admin - Notifications', 'Admin notification management')
    .addTag('Admin - Analytics', 'Admin analytics and reporting')
    .addTag('Admin - Advanced Analytics', 'Advanced analytics and insights')
    .addTag('Admin - Virtual Accounts', 'Admin virtual account management')
    .addTag('Admin - Venly Wallets', 'Admin Venly wallet management')
    .addTag('Admin - Admins', 'Admin user management')
    .addTag('Admin - Emails', 'Admin email management')
    .addTag('Admin - Audit Logs', 'Admin audit log viewing')
    .addTag('Admin - Rate Limits', 'Admin rate limit management')
    .addTag('Admin - Deletions', 'Admin data deletion operations')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey}_${methodKey}`,
    include: [AdminModule, AuthModule],
  });

  SwaggerModule.setup('api/admin/docs', app, document, {
    customSiteTitle: 'Raverpay Admin API',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #ef4444; } /* Red title for Admin */
      .swagger-ui .scheme-container { background: #fee2e2; padding: 20px; border-radius: 8px; } /* Reddish bg for Admin */
    `,
    swaggerOptions: {
      persistAuthorization: true,
      filter: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  console.log('🔒 Admin Swagger documentation available at /api/admin/docs');
}

/**
 * Check if Swagger should be enabled based on environment
 */
export function shouldEnableSwagger(): boolean {
  const env = process.env.NODE_ENV;
  const forceEnable = process.env.ENABLE_SWAGGER === 'true';
  const forceDisable = process.env.DISABLE_SWAGGER === 'true';

  if (forceDisable) return false;
  if (forceEnable) return true;

  // Enable in development and staging, disable in production by default
  return env !== 'production';
}
