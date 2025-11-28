import { Module } from '@nestjs/common';
import { AdminVenlyWalletsController } from './admin-venly-wallets.controller';
import { AdminVenlyWalletsService } from './admin-venly-wallets.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminVenlyWalletsController],
  providers: [AdminVenlyWalletsService],
  exports: [AdminVenlyWalletsService],
})
export class AdminVenlyWalletsModule {}
