import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CircleApiClient } from '../circle-api.client';
import { CircleConfigService } from '../config/circle.config.service';
import { EntitySecretService } from '../entity/entity-secret.service';
import {
  CreateWalletSetRequest,
  CreateWalletSetResponse,
  CircleWalletSet,
} from '../circle.types';

/**
 * Wallet Set Service
 * Manages Circle wallet sets (collections of wallets sharing a single private key)
 */
@Injectable()
export class WalletSetService {
  private readonly logger = new Logger(WalletSetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiClient: CircleApiClient,
    private readonly config: CircleConfigService,
    private readonly entitySecret: EntitySecretService,
  ) {}

  /**
   * Create a new wallet set on Circle
   */
  async createWalletSet(name?: string): Promise<CircleWalletSet> {
    try {
      // Generate entity secret ciphertext
      const entitySecretCiphertext =
        await this.entitySecret.generateEntitySecretCiphertext();

      // Generate idempotency key
      const idempotencyKey = this.apiClient.generateIdempotencyKey();

      const request: CreateWalletSetRequest = {
        idempotencyKey,
        entitySecretCiphertext,
        name: name || 'RaverPay Wallet Set',
      };

      this.logger.log(`Creating wallet set: ${request.name}`);

      const response = await this.apiClient.post<CreateWalletSetResponse>(
        '/developer/walletSets',
        request,
      );

      const walletSet = response.data.walletSet;

      // Save to database
      await this.prisma.circleWalletSet.create({
        data: {
          circleWalletSetId: walletSet.id,
          name: walletSet.name,
          custodyType: walletSet.custodyType,
          isActive: true,
        },
      });

      this.logger.log(`Wallet set created successfully: ${walletSet.id}`);
      return walletSet;
    } catch (error) {
      this.logger.error('Failed to create wallet set:', error);
      throw error;
    }
  }

  /**
   * Get or create the default wallet set for RaverPay
   */
  async getOrCreateDefaultWalletSet(): Promise<string> {
    // Check if we have an existing active wallet set
    const existingWalletSet = await this.prisma.circleWalletSet.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    if (existingWalletSet) {
      return existingWalletSet.id;
    }

    // Create a new wallet set
    const walletSet = await this.createWalletSet('RaverPay Default Wallet Set');

    // Get the database record
    const dbWalletSet = await this.prisma.circleWalletSet.findUnique({
      where: { circleWalletSetId: walletSet.id },
    });

    if (!dbWalletSet) {
      throw new Error('Failed to find created wallet set in database');
    }

    return dbWalletSet.id;
  }

  /**
   * Get all wallet sets from Circle API
   */
  async getAllWalletSets(params?: {
    from?: string;
    to?: string;
    pageSize?: number;
    pageBefore?: string;
    pageAfter?: string;
  }): Promise<CircleWalletSet[]> {
    try {
      const response = await this.apiClient.get<{
        walletSets: CircleWalletSet[];
      }>('/developer/walletSets', params);
      return response.data.walletSets;
    } catch (error) {
      this.logger.error('Failed to get wallet sets:', error);
      throw error;
    }
  }

  /**
   * Get a specific wallet set by ID
   */
  async getWalletSet(walletSetId: string): Promise<CircleWalletSet> {
    try {
      const response = await this.apiClient.get<{ walletSet: CircleWalletSet }>(
        `/developer/walletSets/${walletSetId}`,
      );
      return response.data.walletSet;
    } catch (error) {
      this.logger.error(`Failed to get wallet set ${walletSetId}:`, error);
      throw error;
    }
  }

  /**
   * Update wallet set name
   */
  async updateWalletSet(
    walletSetId: string,
    name: string,
  ): Promise<CircleWalletSet> {
    try {
      const response = await this.apiClient.put<{ walletSet: CircleWalletSet }>(
        `/developer/walletSets/${walletSetId}`,
        { name },
      );

      // Update database
      await this.prisma.circleWalletSet.updateMany({
        where: { circleWalletSetId: walletSetId },
        data: { name },
      });

      return response.data.walletSet;
    } catch (error) {
      this.logger.error(`Failed to update wallet set ${walletSetId}:`, error);
      throw error;
    }
  }

  /**
   * Deactivate a wallet set in our database (cannot delete from Circle)
   */
  async deactivateWalletSet(walletSetId: string): Promise<void> {
    await this.prisma.circleWalletSet.updateMany({
      where: { circleWalletSetId: walletSetId },
      data: { isActive: false },
    });
    this.logger.log(`Wallet set deactivated: ${walletSetId}`);
  }

  /**
   * Sync wallet sets from Circle to database
   */
  async syncWalletSets(): Promise<void> {
    try {
      const circleWalletSets = await this.getAllWalletSets();

      for (const walletSet of circleWalletSets) {
        await this.prisma.circleWalletSet.upsert({
          where: { circleWalletSetId: walletSet.id },
          create: {
            circleWalletSetId: walletSet.id,
            name: walletSet.name,
            custodyType: walletSet.custodyType,
            isActive: true,
          },
          update: {
            name: walletSet.name,
            custodyType: walletSet.custodyType,
          },
        });
      }

      this.logger.log(`Synced ${circleWalletSets.length} wallet sets`);
    } catch (error) {
      this.logger.error('Failed to sync wallet sets:', error);
      throw error;
    }
  }
}
