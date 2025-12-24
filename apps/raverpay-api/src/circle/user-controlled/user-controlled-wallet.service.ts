import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CircleApiClient } from '../circle-api.client';
import { CircleBlockchain } from '../circle.types';

/**
 * User-Controlled Wallet Service
 * Manages Circle user-controlled (non-custodial) wallets
 */
@Injectable()
export class UserControlledWalletService {
  private readonly logger = new Logger(UserControlledWalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly circleApi: CircleApiClient,
  ) {}

  /**
   * Create a Circle user for user-controlled wallets
   * This is the first step in creating a user-controlled wallet
   */
  async createCircleUser(params: {
    userId: string;
    email?: string;
    authMethod: 'EMAIL' | 'PIN' | 'SOCIAL';
  }) {
    const { userId, email, authMethod } = params;

    this.logger.log(`Creating Circle user for userId: ${userId}`);

    // Generate a unique Circle user ID (UUID format)
    const circleUserId = `${userId}-${Date.now()}`;

    try {
      // Call Circle API to create user
      const response = await this.circleApi.post<{ data: any }>('/w3s/users', {
        userId: circleUserId,
      });

      this.logger.log(`Circle user created: ${circleUserId}`);

      // Save to database
      const circleUser = await this.prisma.circleUser.create({
        data: {
          userId,
          circleUserId,
          authMethod,
          email,
          status: 'ENABLED',
        },
      });

      return {
        id: circleUser.id,
        circleUserId: circleUser.circleUserId,
        authMethod: circleUser.authMethod,
        status: circleUser.status,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create Circle user: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to create Circle user: ${error.message}`);
    }
  }

  /**
   * Get user token for Circle user
   * User tokens are valid for 60 minutes and required for all user operations
   */
  async getUserToken(circleUserId: string) {
    this.logger.log(`Getting user token for: ${circleUserId}`);

    try {
      const response = await this.circleApi.post<{
        data: {
          userToken: string;
          encryptionKey: string;
        };
      }>('/w3s/users/token', {
        userId: circleUserId,
      });

      this.logger.log(`User token generated for: ${circleUserId}`);

      return {
        userToken: response.data.data.userToken,
        encryptionKey: response.data.data.encryptionKey,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get user token: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to get user token: ${error.message}`);
    }
  }

  /**
   * Initialize user and create wallet
   * This creates the user's first wallet and sets up their account
   */
  async initializeUserWithWallet(params: {
    userToken: string;
    blockchain: CircleBlockchain;
    accountType: 'SCA' | 'EOA';
    userId: string;
    circleUserId: string;
  }) {
    const { userToken, blockchain, accountType, userId, circleUserId } = params;

    this.logger.log(
      `Initializing user with wallet on ${blockchain} (${accountType})`,
    );

    try {
      // Call Circle API to initialize user and create wallet
      const response = await this.circleApi.post<{
        data: {
          challengeId: string;
        };
      }>(
        '/w3s/user/initialize',
        {
          idempotencyKey: this.circleApi.generateIdempotencyKey(),
          accountType,
          blockchains: [blockchain],
        },
        {
          'X-User-Token': userToken,
        },
      );

      this.logger.log(
        `User initialization challenge created: ${response.data.data.challengeId}`,
      );

      return {
        challengeId: response.data.data.challengeId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to initialize user with wallet: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Failed to initialize user with wallet: ${error.message}`,
      );
    }
  }

  /**
   * List user's wallets
   * Returns all wallets for a Circle user
   */
  async listUserWallets(userToken: string) {
    this.logger.log('Listing user wallets');

    try {
      const response = await this.circleApi.get<{
        data: {
          wallets: Array<{
            id: string;
            state: string;
            walletSetId: string;
            custodyType: string;
            userId: string;
            address: string;
            blockchain: string;
            accountType: string;
            createDate: string;
            updateDate: string;
          }>;
        };
      }>(
        '/w3s/wallets',
        {},
        {
          'X-User-Token': userToken,
        },
      );

      this.logger.log(
        `Found ${response.data.data.wallets.length} wallets for user`,
      );

      return response.data.data.wallets;
    } catch (error) {
      this.logger.error(
        `Failed to list user wallets: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to list user wallets: ${error.message}`);
    }
  }

  /**
   * Get user status
   * Returns current status of Circle user including PIN and security question status
   */
  async getUserStatus(userToken: string) {
    this.logger.log('Getting user status');

    try {
      const response = await this.circleApi.get<{
        data: {
          id: string;
          status: string;
          createDate: string;
          pinStatus: string;
          pinDetails?: {
            failedAttempts: number;
          };
          securityQuestionStatus?: string;
          securityQuestionDetails?: {
            failedAttempts: number;
          };
        };
      }>(
        '/w3s/user',
        {},
        {
          'X-User-Token': userToken,
        },
      );

      this.logger.log(`User status: ${response.data.data.status}`);

      return response.data.data;
    } catch (error) {
      this.logger.error(
        `Failed to get user status: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to get user status: ${error.message}`);
    }
  }

  /**
   * Get Circle user by our internal user ID
   */
  async getCircleUserByUserId(userId: string) {
    return this.prisma.circleUser.findFirst({
      where: { userId },
    });
  }

  /**
   * Get Circle user by Circle user ID
   */
  async getCircleUserByCircleUserId(circleUserId: string) {
    return this.prisma.circleUser.findUnique({
      where: { circleUserId },
    });
  }

  /**
   * Update Circle user status
   */
  async updateCircleUserStatus(params: {
    circleUserId: string;
    status?: string;
    pinStatus?: string;
    securityQuestionStatus?: string;
  }) {
    const { circleUserId, status, pinStatus, securityQuestionStatus } = params;

    return this.prisma.circleUser.update({
      where: { circleUserId },
      data: {
        ...(status && { status }),
        ...(pinStatus && { pinStatus }),
        ...(securityQuestionStatus && { securityQuestionStatus }),
        updatedAt: new Date(),
      },
    });
  }
}
