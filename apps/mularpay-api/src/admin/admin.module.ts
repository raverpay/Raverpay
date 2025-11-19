import { Module } from '@nestjs/common';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';
import { AdminTransactionsController } from './transactions/admin-transactions.controller';
import { AdminTransactionsService } from './transactions/admin-transactions.service';
import { AdminAnalyticsController } from './analytics/admin-analytics.controller';
import { AdminAnalyticsService } from './analytics/admin-analytics.service';
import { HierarchyService } from '../common/services/hierarchy.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    AdminUsersController,
    AdminTransactionsController,
    AdminAnalyticsController,
  ],
  providers: [
    AdminUsersService,
    AdminTransactionsService,
    AdminAnalyticsService,
    HierarchyService,
  ],
  exports: [HierarchyService],
})
export class AdminModule {}
