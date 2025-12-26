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
      const response = await this.circleApi.post<{ data: any }>('/users', {
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
      // CircleApiResponse already wraps response in { data: T }
      // So we just specify T as the inner structure
      const response = await this.circleApi.post<{
        userToken: string;
        encryptionKey: string;
      }>('/users/token', {
        userId: circleUserId,
      });

      this.logger.log(`User token generated for: ${circleUserId}`);
      this.logger.debug(`Circle API response: ${JSON.stringify(response)}`);

      // response is already { data: { userToken, encryptionKey } }
      const tokenData = response.data;
      
      if (!tokenData?.userToken) {
        this.logger.error(`Invalid token response: ${JSON.stringify(response)}`);
        throw new Error('userToken not found in Circle API response');
      }

      return {
        userToken: tokenData.userToken,
        encryptionKey: tokenData.encryptionKey,
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
      // CircleApiResponse already wraps in { data: T }, so T is the inner structure
      const response = await this.circleApi.post<{
        challengeId: string;
      }>(
        '/user/initialize',
        {
          idempotencyKey: this.circleApi.generateIdempotencyKey(),
          accountType,
          blockchains: [blockchain],
        },
        {
          'X-User-Token': userToken,
        },
      );

      this.logger.debug(`Circle API initialize response: ${JSON.stringify(response)}`);
      
      const challengeData = response.data;
      
      if (!challengeData?.challengeId) {
        this.logger.error(`Invalid initialize response: ${JSON.stringify(response)}`);
        throw new Error('challengeId not found in Circle API response');
      }

      this.logger.log(
        `User initialization challenge created: ${challengeData.challengeId}`,
      );

      return {
        challengeId: challengeData.challengeId,
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
      // CircleApiResponse already wraps in { data: T }
      const response = await this.circleApi.get<{
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
      }>(
        '/wallets',
        {},
        {
          'X-User-Token': userToken,
        },
      );

      const walletData = response.data;
      
      this.logger.log(
        `Found ${walletData?.wallets?.length || 0} wallets for user`,
      );

      return walletData?.wallets || [];
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
      // CircleApiResponse already wraps in { data: T }
      const response = await this.circleApi.get<{
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
      }>(
        '/user',
        {},
        {
          'X-User-Token': userToken,
        },
      );

      const userData = response.data;
      
      this.logger.log(`User status: ${userData?.status}`);

      return userData;
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

  /**
   * Save security questions metadata
   * Stores which questions the user selected (not the answers - Circle encrypts those)
   */
  async saveSecurityQuestions(params: {
    circleUserId: string;
    questions: Array<{
      questionId: string;
      questionText: string;
      questionIndex: number;
    }>;
  }) {
    const { circleUserId, questions } = params;

    this.logger.log(
      `Saving security questions metadata for: ${circleUserId}`,
    );

    // Get the internal CircleUser record
    const circleUser = await this.prisma.circleUser.findUnique({
      where: { circleUserId },
    });

    if (!circleUser) {
      throw new Error(`Circle user not found: ${circleUserId}`);
    }

    // Upsert security questions (delete existing and create new)
    await this.prisma.$transaction(async (tx) => {
      // Delete existing questions for this user
      await tx.circleSecurityQuestion.deleteMany({
        where: { circleUserId: circleUser.id },
      });

      // Create new questions
      await tx.circleSecurityQuestion.createMany({
        data: questions.map((q) => ({
          circleUserId: circleUser.id,
          questionId: q.questionId,
          questionText: q.questionText,
          questionIndex: q.questionIndex,
        })),
      });

      // Update Circle user to mark security questions as enabled
      await tx.circleUser.update({
        where: { id: circleUser.id },
        data: {
          securityQuestionStatus: 'ENABLED',
        },
      });
    });

    this.logger.log(
      `Security questions saved for: ${circleUserId} (${questions.length} questions)`,
    );

    return { success: true };
  }

  /**
   * Get security questions for a Circle user
   */
  async getSecurityQuestions(circleUserId: string) {
    const circleUser = await this.prisma.circleUser.findUnique({
      where: { circleUserId },
      include: {
        securityQuestions: true,
      },
    });

    if (!circleUser) {
      throw new Error(`Circle user not found: ${circleUserId}`);
    }

    return circleUser.securityQuestions.map((q) => ({
      questionId: q.questionId,
      questionText: q.questionText,
      questionIndex: q.questionIndex,
    }));
  }
}
