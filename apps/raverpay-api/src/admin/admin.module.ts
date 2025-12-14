import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { DeletionSchedulerService } from './deletions/deletion-scheduler.service';
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
import { AdminAdminsController } from './admins/admin-admins.controller';
import { AdminAdminsService } from './admins/admin-admins.service';
import { AdminVenlyWalletsController } from './venly-wallets/admin-venly-wallets.controller';
import { AdminVenlyWalletsService } from './venly-wallets/admin-venly-wallets.service';
import { AdminEmailsController } from './emails/admin-emails.controller';
import { AdminEmailsService } from './emails/admin-emails.service';
import { RateLimitsController } from './rate-limits/rate-limits.controller';
import { RateLimitsService } from './rate-limits/rate-limits.service';
import { HierarchyService } from '../common/services/hierarchy.service';
import { AccountLockingService } from '../common/services/account-locking.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { VTUModule } from '../vtu/vtu.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { SupportModule } from '../support/support.module';
import { PaymentsModule } from '../payments/payments.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    NotificationsModule,
    PaymentsModule,
    VTUModule,
    SupportModule,
    WebhooksModule,
    WalletModule,
    forwardRef(() => TransactionsModule),
  ],
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
    AdminAdminsController,
    AdminVenlyWalletsController,
    AdminEmailsController,
    RateLimitsController,
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
    DeletionSchedulerService,
    AdminGiftCardsService,
    AdminCryptoService,
    AdminNotificationsService,
    AdminAdvancedAnalyticsService,
    AdminAuditLogsService,
    AdminAdminsService,
    AdminVenlyWalletsService,
    AdminEmailsService,
    RateLimitsService,
    AccountLockingService,
    HierarchyService,
  ],
  exports: [HierarchyService],
})
export class AdminModule {}
