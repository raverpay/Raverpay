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
    const { circleUserId, blockchain, accountType, userToken } = dto;

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
        blockchain: blockchain as CircleBlockchain,
        accountType: accountType || 'SCA',
        userId: req.user.id,
        circleUserId,
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
      {
        circleUserId,
        questions: dto.questions,
      },
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
}
