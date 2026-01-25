import { Module } from '@nestjs/common';
import { AlchemyKeyEncryptionService } from './encryption/alchemy-key-encryption.service';
import { AlchemyConfigService } from './config/alchemy-config.service';
import { AlchemyWalletGenerationService } from './wallets/alchemy-wallet-generation.service';
import { AlchemySmartAccountService } from './wallets/alchemy-smart-account.service';
import { AlchemyTransactionService } from './transactions/alchemy-transaction.service';
import { AlchemyWebhookService } from './webhooks/alchemy-webhook.service';
import { AlchemyWebhookController } from './webhooks/alchemy-webhook.controller';
import { AlchemyWalletController } from './controllers/alchemy-wallet.controller';
import { AlchemyTransactionController } from './controllers/alchemy-transaction.controller';
import { AlchemyAdminService } from './admin/alchemy-admin.service';
import { AlchemyAdminController } from './admin/alchemy-admin.controller';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Alchemy Integration Module
 *
 * Provides cryptocurrency wallet and transaction services using Alchemy
 * - Wallet generation and management
 * - ERC20 token transfers (USDC/USDT)
 * - Transaction tracking and history
 * - Webhook integration for automatic updates
 * - Multi-blockchain support (Polygon, Arbitrum, Base)
 */
@Module({
  controllers: [
    AlchemyWalletController,
    AlchemyTransactionController,
    AlchemyWebhookController,
    AlchemyAdminController,
  ],
  providers: [
    // Core Services
    AlchemyKeyEncryptionService,
    AlchemyConfigService,

    // Wallet Services
    AlchemyWalletGenerationService,
    AlchemySmartAccountService,

    // Transaction Services
    AlchemyTransactionService,

    // Webhook Services
    AlchemyWebhookService,

    // Admin Services
    AlchemyAdminService,

    // Prisma (if not global)
    PrismaService,
  ],
  exports: [
    // Export services for use in other modules
    AlchemyKeyEncryptionService,
    AlchemyConfigService,
    AlchemyWalletGenerationService,
    AlchemySmartAccountService,
    AlchemyTransactionService,
    AlchemyWebhookService,
    AlchemyAdminService,
  ],
})
export class AlchemyModule {}
