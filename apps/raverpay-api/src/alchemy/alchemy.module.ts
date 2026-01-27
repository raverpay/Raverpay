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
import { PrismaService } from '../prisma/prisma.service';
import { UsersModule } from '../users/users.module';

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
  imports: [UsersModule], // Import UsersModule to use UsersService
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
    AlchemySmartAccountService,

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
    AlchemySmartAccountService,
    AlchemyTransactionService,
    AlchemyWebhookService,
  ],
})
export class AlchemyModule {}
