import { Module } from '@nestjs/common';
import { CryptoController } from './crypto.controller';
import { CryptoService } from './crypto.service';

// Venly services
import { VenlyAuthService } from './venly/venly-auth.service';
import { VenlyService } from './venly/venly.service';
import { VenlyUserService } from './venly/venly-user.service';

// Core services
import { CryptoWalletService } from './services/crypto-wallet.service';
import { CryptoBalanceService } from './services/crypto-balance.service';
import { CryptoSendService } from './services/crypto-send.service';
import { ConversionService } from './services/conversion.service';
import { ExchangeRateService } from './services/exchange-rate.service';
import { PriceService } from './services/price.service';

// Cron jobs
import { BalanceSyncCron } from './cron/balance-sync.cron';
import { PriceUpdateCron } from './cron/price-update.cron';

// Dependencies
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CryptoController],
  providers: [
    // Main service
    CryptoService,

    // Venly services
    VenlyAuthService,
    VenlyService,
    VenlyUserService,

    // Core services
    CryptoWalletService,
    CryptoBalanceService,
    CryptoSendService,
    ConversionService,
    ExchangeRateService,
    PriceService,

    // Cron jobs
    BalanceSyncCron,
    PriceUpdateCron,
  ],
  exports: [
    CryptoService,
    CryptoWalletService,
    CryptoBalanceService,
    ExchangeRateService,
    PriceService,
  ],
})
export class CryptoModule {}
