import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VTUController } from './vtu.controller';
import { VTUWebhooksController } from './vtu-webhooks.controller';
import { VTUService } from './vtu.service';
import { VTPassService } from './services/vtpass.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [ConfigModule, PrismaModule, WalletModule],
  controllers: [VTUController, VTUWebhooksController],
  providers: [VTUService, VTPassService],
  exports: [VTUService],
})
export class VTUModule {}
