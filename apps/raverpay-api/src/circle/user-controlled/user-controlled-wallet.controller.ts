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
  async createUser(@Request() req: AuthRequest, @Body() body: any) {
    const { email, authMethod = 'EMAIL' } = body;

    const result = await this.userControlledWalletService.createCircleUser({
      userId: req.user.id,
      email: email || req.user.email,
      authMethod,
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
  async getUserToken(@Request() req: AuthRequest, @Body() body: any) {
    const { circleUserId } = body;

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
  async createWallet(@Request() req: AuthRequest, @Body() body: any) {
    const { circleUserId, blockchain, accountType = 'SCA', userToken } = body;

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
        accountType,
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
  async listWallets(@Request() req: AuthRequest, @Body() body: any) {
    const { userToken } = body;

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
  async getDeviceToken(@Request() req: AuthRequest, @Body() body: any) {
    const { email, deviceId } = body;

    const result = await this.emailAuthService.getDeviceToken({
      email: email || req.user.email,
      deviceId,
    });

    return {
      success: true,
      data: result,
    };
  }
}
