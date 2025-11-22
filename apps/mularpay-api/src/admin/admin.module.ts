import { Module } from '@nestjs/common';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';
import { AdminTransactionsController } from './transactions/admin-transactions.controller';
import { AdminTransactionsService } from './transactions/admin-transactions.service';
import { AdminAnalyticsController } from './analytics/admin-analytics.controller';
import { AdminAnalyticsService } from './analytics/admin-analytics.service';
import { AdminKYCController } from './kyc/admin-kyc.controller';
import { AdminKYCService } from './kyc/admin-kyc.service';
import { AdminVTUController } from './vtu/admin-vtu.controller';
import { AdminVTUService } from './vtu/admin-vtu.service';
import { AdminWalletsController } from './wallets/admin-wallets.controller';
import { AdminWalletsService } from './wallets/admin-wallets.service';
import { AdminVirtualAccountsController } from './virtual-accounts/admin-virtual-accounts.controller';
import { AdminVirtualAccountsService } from './virtual-accounts/admin-virtual-accounts.service';
import { AdminDeletionsController } from './deletions/admin-deletions.controller';
import { AdminDeletionsService } from './deletions/admin-deletions.service';
import { AdminGiftCardsController } from './giftcards/admin-giftcards.controller';
import { AdminGiftCardsService } from './giftcards/admin-giftcards.service';
import { AdminCryptoController } from './crypto/admin-crypto.controller';
import { AdminCryptoService } from './crypto/admin-crypto.service';
import { AdminNotificationsController } from './notifications/admin-notifications.controller';
import { AdminNotificationsService } from './notifications/admin-notifications.service';
import { AdminAdvancedAnalyticsController } from './advanced-analytics/admin-advanced-analytics.controller';
import { AdminAdvancedAnalyticsService } from './advanced-analytics/admin-advanced-analytics.service';
import { AdminAuditLogsController } from './audit-logs/admin-audit-logs.controller';
import { AdminAuditLogsService } from './audit-logs/admin-audit-logs.service';
import { HierarchyService } from '../common/services/hierarchy.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [
    AdminUsersController,
    AdminTransactionsController,
    AdminAnalyticsController,
    AdminKYCController,
    AdminVTUController,
    AdminWalletsController,
    AdminVirtualAccountsController,
    AdminDeletionsController,
    AdminGiftCardsController,
    AdminCryptoController,
    AdminNotificationsController,
    AdminAdvancedAnalyticsController,
    AdminAuditLogsController,
  ],
  providers: [
    AdminUsersService,
    AdminTransactionsService,
    AdminAnalyticsService,
    AdminKYCService,
    AdminVTUService,
    AdminWalletsService,
    AdminVirtualAccountsService,
    AdminDeletionsService,
    AdminGiftCardsService,
    AdminCryptoService,
    AdminNotificationsService,
    AdminAdvancedAnalyticsService,
    AdminAuditLogsService,
    HierarchyService,
  ],
  exports: [HierarchyService],
})
export class AdminModule {}
