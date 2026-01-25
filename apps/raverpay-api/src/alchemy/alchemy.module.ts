import { Module } from '@nestjs/common';
import { AlchemyKeyEncryptionService } from './encryption/alchemy-key-encryption.service';
import { AlchemyConfigService } from './config/alchemy-config.service';
import { AlchemyWalletGenerationService } from './wallets/alchemy-wallet-generation.service';
import { AlchemyTransactionService } from './transactions/alchemy-transaction.service';
import { AlchemyWebhookService } from './webhooks/alchemy-webhook.service';
import { AlchemyWebhookController } from './webhooks/alchemy-webhook.controller';
import { AlchemyWalletController } from './controllers/alchemy-wallet.controller';
import { AlchemyTransactionController } from './controllers/alchemy-transaction.controller';
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
  ],
  providers: [
    // Core Services
    AlchemyKeyEncryptionService,
    AlchemyConfigService,

    // Wallet Services
    AlchemyWalletGenerationService,

    // Transaction Services
    AlchemyTransactionService,

    // Webhook Services
    AlchemyWebhookService,

    // Prisma (if not global)
    PrismaService,
  ],
  exports: [
    // Export services for use in other modules
    AlchemyKeyEncryptionService,
    AlchemyConfigService,
    AlchemyWalletGenerationService,
    AlchemyTransactionService,
    AlchemyWebhookService,
  ],
})
export class AlchemyModule {}
