import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CircleApiClient } from '../circle-api.client';
import { CircleConfigService } from '../config/circle.config.service';
import { EntitySecretService } from '../entity/entity-secret.service';
import { WalletSetService } from './wallet-set.service';
import { NotificationDispatcherService } from '../../notifications/notification-dispatcher.service';
import {
  CreateWalletRequest,
  CreateWalletResponse,
  CircleWallet,
  CircleBlockchain,
  GetWalletBalanceResponse,
  TokenBalance,
} from '../circle.types';
import { CircleAccountType, CircleWalletState } from '@prisma/client';

/**
 * Circle Wallet Service
 * Manages Circle developer-controlled wallets for users
 */
@Injectable()
export class CircleWalletService {
  private readonly logger = new Logger(CircleWalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiClient: CircleApiClient,
    private readonly config: CircleConfigService,
    private readonly entitySecret: EntitySecretService,
    private readonly walletSetService: WalletSetService,
    private readonly notificationDispatcher: NotificationDispatcherService,
  ) {}

  /**
   * Create a new Circle wallet for a user
   */
  async createWallet(params: {
    userId: string;
    blockchain?: CircleBlockchain;
    accountType?: 'SCA' | 'EOA';
    name?: string;
  }): Promise<CircleWallet> {
    const { userId, name } = params;
    const blockchain = this.config.getBlockchain(
      params.blockchain,
    ) as CircleBlockchain;
    const accountType = params.accountType || this.config.defaultAccountType;

    // Check if user already has a wallet on this blockchain
    const existingWallet = await this.prisma.circleWallet.findFirst({
      where: { userId, blockchain },
    });

    if (existingWallet) {
      throw new BadRequestException(
        `User already has a Circle wallet on ${blockchain}`,
      );
    }

    try {
      // Get or create wallet set
      const walletSetId =
        await this.walletSetService.getOrCreateDefaultWalletSet();

      // Get the Circle wallet set ID
      const walletSet = await this.prisma.circleWalletSet.findUnique({
        where: { id: walletSetId },
      });

      if (!walletSet) {
        throw new Error('Wallet set not found');
      }

      // Generate entity secret ciphertext
      const entitySecretCiphertext =
        await this.entitySecret.generateEntitySecretCiphertext();

      // Generate idempotency key
      const idempotencyKey = this.apiClient.generateIdempotencyKey();

      const request: CreateWalletRequest = {
        idempotencyKey,
        entitySecretCiphertext,
        walletSetId: walletSet.circleWalletSetId,
        blockchains: [blockchain],
        accountType: accountType,
        count: 1,
        metadata: [
          {
            name: name || `Raverpay USDC`,
            refId: userId,
          },
        ],
      };

      this.logger.log(
        `Creating Circle wallet for user ${userId} on ${blockchain}`,
      );

      const response = await this.apiClient.post<CreateWalletResponse>(
        '/developer/wallets',
        request,
      );

      const wallet = response.data.wallets[0];

      // Save to database
      await this.prisma.circleWallet.create({
        data: {
          userId,
          circleWalletId: wallet.id,
          walletSetId: walletSetId,
          address: wallet.address,
          blockchain: wallet.blockchain,
          accountType: wallet.accountType as CircleAccountType,
          state: wallet.state as CircleWalletState,
          name: wallet.name,
          refId: wallet.refId,
          custodyType: wallet.custodyType,
          scaCore: wallet.scaCore,
        },
      });

      this.logger.log(
        `Circle wallet created: ${wallet.id} (${wallet.address}) for user ${userId}`,
      );

      // Send notification to user about wallet creation
      try {
        await this.notificationDispatcher.sendNotification({
          userId,
          eventType: 'circle_wallet_created',
          category: 'ACCOUNT',
          channels: ['EMAIL', 'PUSH', 'IN_APP'],
          title: `${blockchain} USDC Wallet Created`,
          message: `Your Circle USDC wallet on ${blockchain} has been successfully created and is ready to use!`,
          data: {
            walletAddress: wallet.address,
            blockchain: wallet.blockchain,
            accountType: wallet.accountType,
            walletName: wallet.name,
            timestamp: new Date().toLocaleString('en-NG', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }),
          },
        });

        this.logger.log(
          `Circle wallet creation notification sent for user ${userId}`,
        );
      } catch (notificationError) {
        // Log but don't fail wallet creation if notification fails
        this.logger.error(
          `Failed to send wallet creation notification for user ${userId}`,
          notificationError,
        );
      }

      return wallet;
    } catch (error) {
      this.logger.error(
        `Failed to create Circle wallet for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get user's Circle wallets
   */
  async getUserWallets(userId: string) {
    return this.prisma.circleWallet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a specific wallet by ID
   */
  async getWallet(walletId: string, userId?: string) {
    const wallet = await this.prisma.circleWallet.findFirst({
      where: {
        id: walletId,
        ...(userId && { userId }),
      },
      include: {
        circleUser: true, // Include circle user for getting the actual Circle user ID
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  /**
   * Get wallet by Circle wallet ID
   */
  async getWalletByCircleId(circleWalletId: string) {
    const wallet = await this.prisma.circleWallet.findUnique({
      where: { circleWalletId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  /**
   * Get wallet by blockchain address
   */
  async getWalletByAddress(address: string) {
    const wallet = await this.prisma.circleWallet.findFirst({
      where: { address: address.toLowerCase() },
    });

    return wallet;
  }

  /**
   * Get wallet balance from Circle API
   */
  async getWalletBalance(circleWalletId: string): Promise<TokenBalance[]> {
    try {
      const response = await this.apiClient.get<GetWalletBalanceResponse>(
        `/wallets/${circleWalletId}/balances`,
      );
      return response.data.tokenBalances;
    } catch (error) {
      this.logger.error(
        `Failed to get balance for wallet ${circleWalletId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get USDC balance for a wallet
   */
  async getUsdcBalance(circleWalletId: string): Promise<string> {
    const balances = await this.getWalletBalance(circleWalletId);

    const usdcBalance = balances.find(
      (b) =>
        b.token.symbol === 'USDC' ||
        b.token.name.toLowerCase().includes('usdc'),
    );

    return usdcBalance?.amount || '0';
  }

  /**
   * Get wallet details from Circle API
   */
  async getWalletFromCircle(circleWalletId: string): Promise<CircleWallet> {
    try {
      const response = await this.apiClient.get<{ wallet: CircleWallet }>(
        `/wallets/${circleWalletId}`,
      );
      return response.data.wallet;
    } catch (error) {
      this.logger.error(
        `Failed to get wallet from Circle ${circleWalletId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update wallet metadata
   */
  async updateWallet(
    circleWalletId: string,
    data: { name?: string; refId?: string },
  ): Promise<CircleWallet> {
    try {
      const response = await this.apiClient.put<{ wallet: CircleWallet }>(
        `/wallets/${circleWalletId}`,
        data,
      );

      // Update database
      await this.prisma.circleWallet.updateMany({
        where: { circleWalletId },
        data: {
          name: data.name,
          refId: data.refId,
        },
      });

      return response.data.wallet;
    } catch (error) {
      this.logger.error(`Failed to update wallet ${circleWalletId}:`, error);
      throw error;
    }
  }

  /**
   * List all wallets from Circle with filters
   */
  async listWalletsFromCircle(params?: {
    address?: string;
    blockchain?: CircleBlockchain;
    walletSetId?: string;
    refId?: string;
    from?: string;
    to?: string;
    pageSize?: number;
    pageBefore?: string;
    pageAfter?: string;
  }): Promise<CircleWallet[]> {
    try {
      const response = await this.apiClient.get<{ wallets: CircleWallet[] }>(
        '/wallets',
        params,
      );
      return response.data.wallets;
    } catch (error) {
      this.logger.error('Failed to list wallets from Circle:', error);
      throw error;
    }
  }

  /**
   * Sync wallet state from Circle
   */
  async syncWallet(circleWalletId: string): Promise<void> {
    try {
      const circleWallet = await this.getWalletFromCircle(circleWalletId);

      await this.prisma.circleWallet.updateMany({
        where: { circleWalletId },
        data: {
          state: circleWallet.state as CircleWalletState,
          name: circleWallet.name,
        },
      });

      this.logger.log(`Wallet synced: ${circleWalletId}`);
    } catch (error) {
      this.logger.error(`Failed to sync wallet ${circleWalletId}:`, error);
      throw error;
    }
  }

  /**
   * Get deposit info for a wallet (address and blockchain)
   */
  async getDepositInfo(userId: string, blockchain?: string) {
    const wallet = await this.prisma.circleWallet.findFirst({
      where: {
        userId,
        ...(blockchain && { blockchain }),
      },
    });

    if (!wallet) {
      throw new NotFoundException(
        'Circle wallet not found. Please create one first.',
      );
    }

    return {
      address: wallet.address,
      blockchain: wallet.blockchain,
      accountType: wallet.accountType,
      usdcTokenAddress: this.config.getUsdcTokenAddress(wallet.blockchain),
    };
  }
}
