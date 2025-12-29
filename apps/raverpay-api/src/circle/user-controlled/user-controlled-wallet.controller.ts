import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { UserControlledWalletService } from './user-controlled-wallet.service';
import { EmailAuthService } from './email-auth.service';
import { CircleBlockchain } from '../circle.types';
import {
  CreateCircleUserDto,
  GetCircleUserTokenDto,
  InitializeUserWalletDto,
  ListUserWalletsDto,
  GetEmailDeviceTokenDto,
  SaveSecurityQuestionsDto,
} from '../dto';

interface AuthRequest {
  user: { id: string; email: string; role: string };
}

/**
 * User-Controlled Wallet Controller
 * Handles API endpoints for Circle user-controlled (non-custodial) wallets
 */
@Controller('circle/user-controlled')
@UseGuards(JwtAuthGuard)
export class UserControlledWalletController {
  constructor(
    private readonly userControlledWalletService: UserControlledWalletService,
    private readonly emailAuthService: EmailAuthService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create Circle user
   * POST /circle/user-controlled/users/create
   */
  @Post('users/create')
  async createUser(
    @Request() req: AuthRequest,
    @Body() dto: CreateCircleUserDto,
  ) {
    const result = await this.userControlledWalletService.createCircleUser({
      userId: req.user.id,
      email: dto.email || req.user.email,
      authMethod: dto.authMethod || 'PIN',
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Check if user has existing Circle user and wallets
   * GET /circle/user-controlled/users/check-status
   */
  @Get('users/check-status')
  async checkUserStatus(@Request() req: AuthRequest) {
    const circleUser = await this.userControlledWalletService.getCircleUserByUserId(req.user.id);
    
    if (!circleUser) {
      return {
        success: true,
        data: {
          hasCircleUser: false,
          hasUserControlledWallet: false,
          circleUser: null,
          wallets: [],
        },
      };
    }

    // Check for user-controlled wallets
    const wallets = await this.userControlledWalletService.getUserControlledWallets(req.user.id);

    return {
      success: true,
      data: {
        hasCircleUser: true,
        hasUserControlledWallet: wallets.length > 0,
        circleUser: {
          id: circleUser.id,
          circleUserId: circleUser.circleUserId,
          authMethod: circleUser.authMethod,
          pinStatus: circleUser.pinStatus,
          status: circleUser.status,
        },
        wallets: wallets.map(w => ({
          id: w.id,
          address: w.address,
          blockchain: w.blockchain,
          state: w.state,
        })),
      },
    };
  }

  /**
   * Get user token
   * POST /circle/user-controlled/users/token
   */
  @Post('users/token')
  async getUserToken(
    @Request() req: AuthRequest,
    @Body() dto: GetCircleUserTokenDto,
  ) {
    const { circleUserId } = dto;

    // Verify the Circle user belongs to the authenticated user
    const circleUser =
      await this.userControlledWalletService.getCircleUserByCircleUserId(
        circleUserId,
      );

    if (!circleUser || circleUser.userId !== req.user.id) {
      throw new Error('Circle user not found or unauthorized');
    }

    const result =
      await this.userControlledWalletService.getUserToken(circleUserId);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get user status
   * GET /circle/user-controlled/users/:circleUserId/status
   */
  @Get('users/:circleUserId/status')
  async getUserStatus(
    @Request() req: AuthRequest,
    @Param('circleUserId') circleUserId: string,
  ) {
    // Verify ownership
    const circleUser =
      await this.userControlledWalletService.getCircleUserByCircleUserId(
        circleUserId,
      );

    if (!circleUser || circleUser.userId !== req.user.id) {
      throw new Error('Circle user not found or unauthorized');
    }

    // Get user token first
    const { userToken } =
      await this.userControlledWalletService.getUserToken(circleUserId);

    // Get status
    const status =
      await this.userControlledWalletService.getUserStatus(userToken);

    return {
      success: true,
      data: status,
    };
  }

  /**
   * Initialize user and create wallet
   * POST /circle/user-controlled/wallets/create
   */
  @Post('wallets/create')
  async createWallet(
    @Request() req: AuthRequest,
    @Body() dto: InitializeUserWalletDto,
  ) {
    const { circleUserId, blockchain, accountType, userToken, isExistingUser } = dto;

    // Verify ownership
    const circleUser =
      await this.userControlledWalletService.getCircleUserByCircleUserId(
        circleUserId,
      );

    if (!circleUser || circleUser.userId !== req.user.id) {
      throw new Error('Circle user not found or unauthorized');
    }

    const result =
      await this.userControlledWalletService.initializeUserWithWallet({
        userToken,
        blockchain: Array.isArray(blockchain) 
          ? blockchain.map(b => b as CircleBlockchain)
          : blockchain as CircleBlockchain,
        accountType: accountType || 'SCA',
        userId: req.user.id,
        circleUserId,
        isExistingUser,
      });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * List user's wallets
   * GET /circle/user-controlled/wallets
   */
  @Get('wallets')
  async listWallets(
    @Request() req: AuthRequest,
    @Body() dto: ListUserWalletsDto,
  ) {
    const { userToken } = dto;

    const wallets =
      await this.userControlledWalletService.listUserWallets(userToken);

    return {
      success: true,
      data: wallets,
    };
  }

  /**
   * Sync wallets to database after challenge completion
   * POST /circle/user-controlled/wallets/sync
   */
  @Post('wallets/sync')
  async syncWallets(
    @Request() req: AuthRequest,
    @Body() dto: { circleUserId: string; userToken: string },
  ) {
    const { circleUserId, userToken } = dto;

    // Verify ownership
    const circleUser =
      await this.userControlledWalletService.getCircleUserByCircleUserId(
        circleUserId,
      );

    if (!circleUser || circleUser.userId !== req.user.id) {
      throw new Error('Circle user not found or unauthorized');
    }

    const result =
      await this.userControlledWalletService.syncUserWalletsToDatabase({
        userToken,
        userId: req.user.id,
        circleUserId,
      });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get device token for email authentication
   * POST /circle/user-controlled/auth/email/device-token
   */
  @Post('auth/email/device-token')
  async getDeviceToken(
    @Request() req: AuthRequest,
    @Body() dto: GetEmailDeviceTokenDto,
  ) {
    const { email, deviceId } = dto;

    const result = await this.emailAuthService.getDeviceToken({
      email: email || req.user.email,
      deviceId,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Save security questions metadata
   * POST /circle/user-controlled/users/:circleUserId/security-questions
   */
  @Post('users/:circleUserId/security-questions')
  async saveSecurityQuestions(
    @Request() req: AuthRequest,
    @Param('circleUserId') circleUserId: string,
    @Body() dto: SaveSecurityQuestionsDto,
  ) {
    // Verify ownership
    const circleUser =
      await this.userControlledWalletService.getCircleUserByCircleUserId(
        circleUserId,
      );

    if (!circleUser || circleUser.userId !== req.user.id) {
      throw new Error('Circle user not found or unauthorized');
    }

    const result = await this.userControlledWalletService.saveSecurityQuestions(
      circleUserId,
      dto.questions,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get security questions metadata
   * GET /circle/user-controlled/users/:circleUserId/security-questions
   */
  @Get('users/:circleUserId/security-questions')
  async getSecurityQuestions(
    @Request() req: AuthRequest,
    @Param('circleUserId') circleUserId: string,
  ) {
    // Verify ownership
    const circleUser =
      await this.userControlledWalletService.getCircleUserByCircleUserId(
        circleUserId,
      );

    if (!circleUser || circleUser.userId !== req.user.id) {
      throw new Error('Circle user not found or unauthorized');
    }

    const questions =
      await this.userControlledWalletService.getSecurityQuestions(circleUserId);

    return {
      success: true,
      data: questions,
    };
  }

  /**
   * Create a transaction for user-controlled wallet
   * Returns a challengeId to execute via Circle SDK WebView
   * POST /circle/user-controlled/transactions/create
   */
  @Post('transactions/create')
  async createTransaction(
    @Request() req: AuthRequest,
    @Body()
    dto: {
      walletId: string;
      destinationAddress: string;
      amount: string;
      feeLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
      memo?: string;
    },
  ) {
    // Get the Circle user for this wallet
    const circleUser =
      await this.userControlledWalletService.getCircleUserByUserId(req.user.id);

    if (!circleUser) {
      throw new Error('Circle user not found. Please set up your wallet first.');
    }

    // Get fresh user token
    const tokens = await this.userControlledWalletService.getUserToken(
      circleUser.circleUserId,
    );

    // Get wallet info from database
    const wallet = await this.prisma.circleWallet.findFirst({
      where: {
        id: dto.walletId,
        userId: req.user.id,
        custodyType: 'USER',
      },
    });

    if (!wallet) {
      throw new Error('User-controlled wallet not found');
    }

    // Get the token ID for USDC on this blockchain
    // Circle uses standardized token IDs
    const usdcTokenIds: Record<string, string> = {
      'ETH-SEPOLIA': '5797fbd6-3795-519d-84ca-ec4c5f80c3b1', // USDC on ETH-SEPOLIA
      'MATIC-AMOY': '36b6931a-873a-56a8-8a27-b706b17104ee', // USDC on MATIC-AMOY
      'ARB-SEPOLIA': '2e0e3072-4f9e-5750-abed-e346acce2a18', // USDC on ARB-SEPOLIA
    };

    const tokenId = usdcTokenIds[wallet.blockchain];
    if (!tokenId) {
      throw new Error(`USDC not supported on ${wallet.blockchain}`);
    }

    // Circle User Control Wallet API expects Major Units (e.g. "0.1" for 0.1 USDC), not atomic units
    const amountStr = dto.amount;

    try {
      const result = await this.userControlledWalletService.createTransaction({
        userToken: tokens.userToken,
        walletId: wallet.circleWalletId, // Use Circle wallet ID, not our DB ID
        destinationAddress: dto.destinationAddress,
        amounts: [amountStr],
        tokenId,
        feeLevel: dto.feeLevel || 'MEDIUM',
        memo: dto.memo,
      });

      return {
        success: true,
        data: {
          challengeId: result.challengeId,
          userToken: tokens.userToken,
          encryptionKey: tokens.encryptionKey,
          walletId: dto.walletId,
        },
      };
    } catch (error) {
      console.error('Create transaction failed:', error);
      throw error;
    }
  }
}
