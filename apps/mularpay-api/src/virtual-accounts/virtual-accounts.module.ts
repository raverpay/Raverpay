import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VirtualAccountsService } from './virtual-accounts.service';
import { VirtualAccountsController } from './virtual-accounts.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [ConfigModule, PrismaModule, forwardRef(() => PaymentsModule)],
  controllers: [VirtualAccountsController],
  providers: [VirtualAccountsService],
  exports: [VirtualAccountsService],
})
export class VirtualAccountsModule {}
