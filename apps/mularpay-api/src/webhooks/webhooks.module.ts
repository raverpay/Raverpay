import { Module } from '@nestjs/common';
import { PaystackWebhookController } from './paystack-webhook.controller';
import { PaystackWebhookService } from './paystack-webhook.service';
import { ResendWebhookController } from './resend-webhook.controller';
import { ResendWebhookService } from './resend-webhook.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SupportModule } from '../support/support.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    PaymentsModule,
    WalletModule,
    NotificationsModule,
    SupportModule,
    ConfigModule,
  ],
  controllers: [PaystackWebhookController, ResendWebhookController],
  providers: [PaystackWebhookService, ResendWebhookService],
  exports: [PaystackWebhookService, ResendWebhookService],
})
export class WebhooksModule {}
