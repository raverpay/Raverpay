import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VTUController } from './vtu.controller';
import { VTUWebhooksController } from './vtu-webhooks.controller';
import { VTUService } from './vtu.service';
import { VTPassService } from './services/vtpass.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CashbackModule } from '../cashback/cashback.module';
import { LimitsModule } from '../limits/limits.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    WalletModule,
    UsersModule,
    NotificationsModule,
    CashbackModule,
    LimitsModule,
  ],
  controllers: [VTUController, VTUWebhooksController],
  providers: [VTUService, VTPassService],
  exports: [VTUService, VTPassService],
})
export class VTUModule {}
