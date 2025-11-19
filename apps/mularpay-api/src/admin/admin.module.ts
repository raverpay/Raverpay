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
import { HierarchyService } from '../common/services/hierarchy.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    AdminUsersController,
    AdminTransactionsController,
    AdminAnalyticsController,
    AdminKYCController,
    AdminVTUController,
    AdminWalletsController,
    AdminVirtualAccountsController,
    AdminDeletionsController,
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
    HierarchyService,
  ],
  exports: [HierarchyService],
})
export class AdminModule {}
