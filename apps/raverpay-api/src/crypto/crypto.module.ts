import { Module } from '@nestjs/common';
import { CryptoController } from './crypto.controller';
import { CryptoService } from './crypto.service';

// Venly services - COMMENTED OUT (not using Venly anymore, using Circle)
// import { VenlyAuthService } from './venly/venly-auth.service';
// import { VenlyService } from './venly/venly.service';
// import { VenlyUserService } from './venly/venly-user.service';

// Core services
import { CryptoWalletService } from './services/crypto-wallet.service';
import { CryptoBalanceService } from './services/crypto-balance.service';
import { CryptoSendService } from './services/crypto-send.service';
import { ConversionService } from './services/conversion.service';
import { ExchangeRateService } from './services/exchange-rate.service';
// PriceService - COMMENTED OUT (not using CoinGecko price fetching)
// import { PriceService } from './services/price.service';

// Cron jobs
import { BalanceSyncCron } from './cron/balance-sync.cron';
// PriceUpdateCron - COMMENTED OUT (not using CoinGecko price fetching)
// import { PriceUpdateCron } from './cron/price-update.cron';
import { TransactionStatusCron } from './cron/transaction-status.cron';

// Dependencies
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [PrismaModule, NotificationsModule, WalletModule],
  controllers: [CryptoController],
  providers: [
    // Main service
    CryptoService,

    // Venly services - COMMENTED OUT (not using Venly anymore, using Circle)
    // VenlyAuthService,
    // VenlyService,
    // VenlyUserService,

    // Core services
    CryptoWalletService,
    CryptoBalanceService,
    CryptoSendService,
    ConversionService,
    ExchangeRateService,
    // PriceService - COMMENTED OUT (not using CoinGecko price fetching)
    // PriceService,

    // Cron jobs
    BalanceSyncCron,
    // PriceUpdateCron - COMMENTED OUT (not using CoinGecko price fetching)
    // PriceUpdateCron,
    TransactionStatusCron,
  ],
  exports: [
    CryptoService,
    CryptoWalletService,
    CryptoBalanceService,
    ExchangeRateService,
    // PriceService - COMMENTED OUT (not using CoinGecko price fetching)
    // PriceService,
  ],
})
export class CryptoModule {}
