import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { LogtailService } from '../logging/logtail.service';

/**
 * Prisma Pulse Service
 *
 * Monitors database changes in real-time using Prisma Pulse.
 * Requires Prisma Accelerate or Pulse subscription.
 *
 * To enable:
 * 1. Set up Prisma Accelerate or Pulse
 * 2. Update DATABASE_URL to use Accelerate connection string
 * 3. Set ENABLE_PRISMA_PULSE=true
 */
@Injectable()
export class PrismaPulseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaPulseService.name);
  private enabled = false;
  private subscriptions: Array<{ unsubscribe: () => Promise<void> }> = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly logtail: LogtailService,
  ) {}

  async onModuleInit() {
    const enablePulse =
      this.configService.get<string>('ENABLE_PRISMA_PULSE') === 'true';

    if (!enablePulse) {
      this.logger.log(
        'Prisma Pulse monitoring disabled (set ENABLE_PRISMA_PULSE=true to enable)',
      );
      return;
    }

    try {
      // Check if Prisma Pulse is available
      // Note: This requires Prisma Accelerate or Pulse subscription
      // The $subscribe method is available when using Accelerate connection
      this.enabled = true;
      await this.subscribeToChanges();
      this.logger.log('✅ Prisma Pulse monitoring enabled');
    } catch (error) {
      this.logger.warn(
        'Prisma Pulse not available. Ensure you have Prisma Accelerate or Pulse enabled and DATABASE_URL uses Accelerate connection string.',
      );
      this.logger.debug('Pulse error:', error);
      this.enabled = false;
    }
  }

  async onModuleDestroy() {
    // Unsubscribe from all changes
    for (const subscription of this.subscriptions) {
      try {
        await subscription.unsubscribe();
      } catch (error) {
        this.logger.error('Error unsubscribing from Pulse:', error);
      }
    }
  }

  /**
   * Subscribe to database changes
   * Note: $subscribe is only available with Prisma Accelerate/Pulse
   */
  private async subscribeToChanges() {
    // Check if $subscribe is available (only with Prisma Accelerate/Pulse)
    const prismaClient = this.prisma as any;

    if (!prismaClient.$subscribe) {
      this.logger.warn(
        'Prisma $subscribe not available. Ensure you are using Prisma Accelerate or Pulse with the Accelerate connection string.',
      );
      return;
    }

    // Subscribe to transaction changes
    try {
      // Type assertion needed because $subscribe is not in standard PrismaClient types
      const transactionSubscription = await prismaClient.$subscribe.transaction(
        {
          create: {},
          update: {},
        },
      );

      // Process transaction events asynchronously
      this.processTransactionEvents(transactionSubscription).catch((error) => {
        this.logger.error('Error processing transaction events:', error);
      });

      this.logger.log('Subscribed to transaction changes');
    } catch (error) {
      this.logger.warn('Could not subscribe to transaction changes:', error);
    }

    // Subscribe to wallet balance changes
    try {
      // Type assertion needed because $subscribe is not in standard PrismaClient types
      const walletSubscription = await prismaClient.$subscribe.wallet({
        update: {
          fields: ['balance', 'ledgerBalance'],
        },
      });

      // Process wallet events asynchronously
      this.processWalletEvents(walletSubscription).catch((error) => {
        this.logger.error('Error processing wallet events:', error);
      });

      this.logger.log('Subscribed to wallet balance changes');
    } catch (error) {
      this.logger.warn('Could not subscribe to wallet changes:', error);
    }
  }

  /**
   * Process transaction events from Prisma Pulse
   */
  private async processTransactionEvents(subscription: AsyncIterable<any>) {
    try {
      for await (const event of subscription) {
        await this.handleTransactionChange(event);
      }
    } catch (error) {
      this.logger.error('Error in transaction event stream:', error);
    }
  }

  /**
   * Process wallet events from Prisma Pulse
   */
  private async processWalletEvents(subscription: AsyncIterable<any>) {
    try {
      for await (const event of subscription) {
        await this.handleWalletChange(event);
      }
    } catch (error) {
      this.logger.error('Error in wallet event stream:', error);
    }
  }

  /**
   * Handle transaction change events
   */
  private async handleTransactionChange(event: any) {
    try {
      const { type, model, args } = event;

      if (model === 'Transaction') {
        const transaction = args.data || args.where;

        // Log significant transaction events
        if (type === 'create' && transaction.status === 'COMPLETED') {
          await this.logtail.info('Transaction completed', {
            context: 'PrismaPulse',
            transactionId: transaction.id,
            reference: transaction.reference,
            type: transaction.type,
            amount: transaction.amount,
            userId: transaction.userId,
          });
        }

        if (type === 'update' && transaction.status === 'FAILED') {
          await this.logtail.error('Transaction failed', {
            context: 'PrismaPulse',
            transactionId: transaction.id,
            reference: transaction.reference,
            type: transaction.type,
            userId: transaction.userId,
          });
        }
      }
    } catch (error) {
      this.logger.error('Error handling transaction change:', error);
    }
  }

  /**
   * Handle wallet balance change events
   */
  private async handleWalletChange(event: any) {
    try {
      const { type, model, args } = event;

      if (model === 'Wallet' && type === 'update') {
        const wallet = args.data;
        const previousBalance = args.where?.balance;

        // Log significant balance changes
        if (wallet.balance && previousBalance) {
          const balanceChange =
            Number(wallet.balance) - Number(previousBalance);

          // Only log significant changes (> ₦10,000)
          if (Math.abs(balanceChange) > 10000) {
            await this.logtail.info('Significant wallet balance change', {
              context: 'PrismaPulse',
              walletId: wallet.id,
              userId: wallet.userId,
              previousBalance: Number(previousBalance),
              newBalance: Number(wallet.balance),
              change: balanceChange,
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Error handling wallet change:', error);
    }
  }
}
