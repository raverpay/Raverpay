import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoBalanceService } from '../services/crypto-balance.service';
import { WalletType } from '@prisma/client';

/**
 * Balance Sync Cron Job
 * Syncs all user crypto balances from blockchain every 5 minutes
 */
@Injectable()
export class BalanceSyncCron {
  private readonly logger = new Logger(BalanceSyncCron.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoBalance: CryptoBalanceService,
  ) {}

  /**
   * Sync all crypto wallet balances every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncAllBalances() {
    if (this.isRunning) {
      this.logger.warn('Balance sync already running, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      this.logger.log('Starting balance sync for all crypto wallets...');

      // Get all users with crypto wallets
      const cryptoWallets = await this.prisma.wallet.findMany({
        where: {
          type: WalletType.CRYPTO,
        },
        include: {
          user: {
            select: {
              id: true,
            },
          },
        },
      });

      this.logger.log(`Found ${cryptoWallets.length} crypto wallets to sync`);

      let successCount = 0;
      let failureCount = 0;

      // Sync balances in batches to avoid rate limiting
      const batchSize = 10;
      for (let i = 0; i < cryptoWallets.length; i += batchSize) {
        const batch = cryptoWallets.slice(i, i + batchSize);

        await Promise.allSettled(
          batch.map(async (wallet) => {
            try {
              await this.cryptoBalance.syncBalances(wallet.user.id);
              successCount++;
            } catch (error) {
              this.logger.error(
                `Failed to sync balance for user ${wallet.user.id}`,
                error,
              );
              failureCount++;
            }
          }),
        );

        // Wait between batches
        if (i + batchSize < cryptoWallets.length) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      this.logger.log(
        `Balance sync completed: ${successCount} successful, ${failureCount} failed`,
      );
    } catch (error) {
      this.logger.error('Balance sync cron failed', error);
    } finally {
      this.isRunning = false;
    }
  }
}
