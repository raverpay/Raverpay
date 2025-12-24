import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

// Config
import { CircleConfigService } from './config/circle.config.service';

// API Client
import { CircleApiClient } from './circle-api.client';

// Entity Secret
import { EntitySecretService } from './entity/entity-secret.service';

// Wallet Services
import { WalletSetService } from './wallets/wallet-set.service';
import { CircleWalletService } from './wallets/circle-wallet.service';

// Transaction Services
import { CircleTransactionService } from './transactions/circle-transaction.service';
import { CCTPService } from './transactions/cctp.service';

// Paymaster Services
import { PaymasterService } from './paymaster/paymaster.service';
import { PermitService } from './paymaster/permit.service';
import { BundlerService } from './paymaster/bundler.service';
import { PaymasterServiceV2 } from './paymaster/paymaster-v2.service';
import { PaymasterEventService } from './paymaster/paymaster-event.service';
import { PaymasterApprovalService } from './paymaster/paymaster-approval.service';
import { PaymasterController } from './paymaster/paymaster.controller';

// User-Controlled Wallet Services
import { UserControlledWalletService } from './user-controlled/user-controlled-wallet.service';
import { EmailAuthService } from './user-controlled/email-auth.service';
import { UserControlledWalletController } from './user-controlled/user-controlled-wallet.controller';

// Webhook Services
import { CircleWebhookService } from './webhooks/circle-webhook.service';
import { CircleWebhookController } from './webhooks/circle-webhook.controller';

// Controllers
import { CircleController } from './circle.controller';

/**
 * Circle Module
 * Provides Circle blockchain integration for USDC wallets and transactions
 *
 * Features:
 * - Developer-controlled wallets for users
 * - USDC transfers on multiple blockchains
 * - CCTP cross-chain transfers
 * - Webhook handling for transaction updates
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    forwardRef(() => NotificationsModule), // Use forwardRef to break circular dependency
  ],
  controllers: [
    CircleController,
    CircleWebhookController,
    PaymasterController,
    UserControlledWalletController,
  ],
  providers: [
    // Configuration
    CircleConfigService,

    // API Client
    CircleApiClient,

    // Entity Secret Management
    EntitySecretService,

    // Wallet Services
    WalletSetService,
    CircleWalletService,

    // Transaction Services
    CircleTransactionService,
    CCTPService,

    // Paymaster Services
    PaymasterService,
    PermitService,
    BundlerService,
    PaymasterServiceV2,
    PaymasterEventService,
    PaymasterApprovalService,

    // User-Controlled Wallet Services
    UserControlledWalletService,
    EmailAuthService,

    // Webhook Services
    CircleWebhookService,
  ],
  exports: [
    CircleConfigService,
    CircleApiClient,
    EntitySecretService,
    WalletSetService,
    CircleWalletService,
    CircleTransactionService,
    CCTPService,
    PaymasterService,
    PermitService,
    BundlerService,
    PaymasterServiceV2,
    PaymasterEventService,
    PaymasterApprovalService,
    UserControlledWalletService,
    EmailAuthService,
    CircleWebhookService,
  ],
})
export class CircleModule {}
