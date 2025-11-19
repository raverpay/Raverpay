import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';
import { UtilsModule } from './utils/utils.module';
import { VirtualAccountsModule } from './virtual-accounts/virtual-accounts.module';
import { VTUModule } from './vtu/vtu.module';
import { WalletModule } from './wallet/wallet.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    CacheModule, // Add cache module first for global availability
    UtilsModule, // Utils module (BVN encryption) - global
    PrismaModule,
    AuthModule,
    UsersModule,
    WalletModule,
    TransactionsModule,
    PaymentsModule,
    VirtualAccountsModule,
    WebhooksModule,
    VTUModule,
    CloudinaryModule,
    NotificationsModule,
    AdminModule, // Admin module for dashboard
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
