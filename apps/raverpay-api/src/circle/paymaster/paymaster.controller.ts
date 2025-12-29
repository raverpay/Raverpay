import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PaymasterServiceV2 } from './paymaster-v2.service';
import { PaymasterEventService } from './paymaster-event.service';
import { PaymasterApprovalService } from './paymaster-approval.service';
import { CircleWalletService } from '../wallets/circle-wallet.service';
import { CircleBlockchain } from '../circle.types';
import { UserControlledWalletService } from '../user-controlled/user-controlled-wallet.service';

interface AuthRequest {
  user: { id: string; email: string; role: string };
}

/**
 * DTO for generating permit data
 */
class GeneratePermitDto {
  @IsString()
  @IsNotEmpty()
  walletId: string;

  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsNotEmpty()
  blockchain: string;
}

/**
 * DTO for submitting UserOperation
 */
class SubmitUserOpDto {
  @IsString()
  @IsNotEmpty()
  walletId: string;

  @IsString()
  @IsNotEmpty()
  destinationAddress: string;

  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsNotEmpty()
  blockchain: string;

  @IsString()
  @IsNotEmpty()
  permitSignature: string;

  @IsString()
  @IsOptional()
  feeLevel?: string;

  @IsString()
  @IsOptional()
  memo?: string;
}

/**
 * DTO for syncing events
 */
class SyncEventsDto {
  @IsString()
  @IsNotEmpty()
  blockchain: string;

  @IsString()
  @IsNotEmpty()
  fromBlock: string;

  @IsString()
  @IsNotEmpty()
  toBlock: string;
}

/**
 * DTO for approving Paymaster
 */
class ApprovePaymasterDto {
  @IsString()
  @IsNotEmpty()
  walletId: string;

  @IsString()
  @IsNotEmpty()
  blockchain: string;
}

/**
 * DTO for signing permit via Circle SDK
 * Returns a challengeId to execute in the mobile WebView
 */
class SignPermitChallengeDto {
  @IsString()
  @IsNotEmpty()
  walletId: string;

  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsNotEmpty()
  blockchain: string;

  @IsString()
  @IsNotEmpty()
  userToken: string;

  @IsString()
  @IsOptional()
  destinationAddress?: string;
}

/**
 * Paymaster Controller
 * Handles Circle Paymaster v0.8 operations
 */
@Controller('circle/paymaster')
@UseGuards(JwtAuthGuard)
export class PaymasterController {
  constructor(
    private readonly paymasterService: PaymasterServiceV2,
    private readonly eventService: PaymasterEventService,
    private readonly approvalService: PaymasterApprovalService,
    private readonly walletService: CircleWalletService,
    private readonly userControlledWalletService: UserControlledWalletService,
  ) {}

  /**
   * Generate permit typed data for client to sign
   * POST /circle/paymaster/generate-permit
   */
  @Post('generate-permit')
  async generatePermit(
    @Request() req: AuthRequest,
    @Body() dto: GeneratePermitDto,
  ) {
    // Verify wallet belongs to user
    await this.walletService.getWallet(dto.walletId, req.user.id);

    const permitData = await this.paymasterService.generatePermitData({
      walletId: dto.walletId,
      amount: dto.amount,
      blockchain: dto.blockchain as CircleBlockchain,
    });

    return {
      success: true,
      data: permitData,
    };
  }

  /**
   * Generate permit and return Circle SDK challenge for user signing
   * POST /circle/paymaster/sign-permit-challenge
   * 
   * This endpoint:
   * 1. Generates the EIP-2612 permit typed data
   * 2. Sends it to Circle SDK for signing
   * 3. Returns a challengeId that mobile app executes via WebView
   * 4. User enters their PIN in WebView to authorize the signature
   */
  @Post('sign-permit-challenge')
  async signPermitChallenge(
    @Request() req: AuthRequest,
    @Body() dto: SignPermitChallengeDto,
  ) {
    // Verify wallet belongs to user
    const wallet = await this.walletService.getWallet(dto.walletId, req.user.id);

    // Verify this is a user-controlled wallet
    if (wallet.custodyType !== 'USER') {
      throw new Error('This endpoint is only for user-controlled wallets. Developer-controlled wallets can use generate-permit directly.');
    }

    // Get the Circle wallet ID (the one from Circle, not our DB ID)
    const circleWalletId = wallet.circleWalletId;

    // Get the actual Circle user ID string from the relation
    // wallet.circleUserId is the FK to CircleUser.id
    // wallet.circleUser.circleUserId is the actual Circle API user ID
    if (!wallet.circleUser?.circleUserId) {
      throw new Error('Wallet does not have an associated Circle User. Please set up your wallet first.');
    }
    const circleApiUserId = wallet.circleUser.circleUserId;

    // Refresh the userToken server-side (tokens expire after 60 minutes)
    // This ensures we always have a valid token regardless of mobile app state
    const freshTokens = await this.userControlledWalletService.getUserToken(circleApiUserId);

    // 1. Generate the permit typed data
    const permitData = await this.paymasterService.generatePermitData({
      walletId: dto.walletId,
      amount: dto.amount,
      blockchain: dto.blockchain as CircleBlockchain,
    });

    // 2. Send to Circle SDK for signing - returns challengeId
    const signResult = await this.userControlledWalletService.signTypedData({
      userToken: freshTokens.userToken, // Use fresh token, not the one from mobile
      walletId: circleWalletId, // Use the Circle wallet ID
      typedData: permitData.typedData,
      memo: dto.destinationAddress 
        ? `Sign permit for ${dto.amount} USDC transfer to ${dto.destinationAddress.slice(0, 10)}...`
        : 'Sign permit for USDC gas payment',
    });

    return {
      success: true,
      data: {
        challengeId: signResult.challengeId,
        permitData: permitData,
        // Include these for the mobile app to use after challenge completion
        walletId: dto.walletId,
        blockchain: dto.blockchain,
        // Return fresh tokens so mobile can update its cache and execute the challenge
        userToken: freshTokens.userToken,
        encryptionKey: freshTokens.encryptionKey,
      },
    };
  }

  /**
   * Submit UserOperation with Paymaster
   * POST /circle/paymaster/submit-userop
   */
  @Post('submit-userop')
  async submitUserOp(
    @Request() req: AuthRequest,
    @Body() dto: SubmitUserOpDto,
  ) {
    // Verify wallet belongs to user
    await this.walletService.getWallet(dto.walletId, req.user.id);

    const result = await this.paymasterService.submitUserOperation({
      walletId: dto.walletId,
      destinationAddress: dto.destinationAddress,
      amount: dto.amount,
      blockchain: dto.blockchain as CircleBlockchain,
      permitSignature: dto.permitSignature,
      feeLevel: dto.feeLevel as any,
      memo: dto.memo,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get UserOperation status
   * GET /circle/paymaster/userop/:hash
   */
  @Get('userop/:hash')
  async getUserOpStatus(@Param('hash') hash: string) {
    const userOp = await this.paymasterService.getUserOperationStatus(hash);

    return {
      success: true,
      data: userOp,
    };
  }

  /**
   * Get Paymaster events for a wallet
   * GET /circle/paymaster/events/:walletId
   */
  @Get('events/:walletId')
  async getWalletEvents(
    @Request() req: AuthRequest,
    @Param('walletId') walletId: string,
  ) {
    // Verify wallet belongs to user
    await this.walletService.getWallet(walletId, req.user.id);

    const events = await this.eventService.getWalletEvents(walletId);

    return {
      success: true,
      data: events,
    };
  }

  /**
   * Get Paymaster statistics
   * GET /circle/paymaster/stats
   */
  @Get('stats')
  async getStats() {
    const stats = await this.eventService.getPaymasterStats();

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Sync events for a block range (admin only)
   * POST /circle/paymaster/sync-events
   */
  @Post('sync-events')
  async syncEvents(@Body() dto: SyncEventsDto) {
    const result = await this.eventService.syncEvents({
      blockchain: dto.blockchain as CircleBlockchain,
      fromBlock: BigInt(dto.fromBlock),
      toBlock: BigInt(dto.toBlock),
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Approve Paymaster to spend USDC (one-time setup)
   * POST /circle/paymaster/approve
   */
  @Post('approve')
  async approvePaymaster(
    @Request() req: AuthRequest,
    @Body() dto: ApprovePaymasterDto,
  ) {
    // Verify wallet belongs to user
    await this.walletService.getWallet(dto.walletId, req.user.id);

    const result = await this.approvalService.approvePaymaster({
      walletId: dto.walletId,
      blockchain: dto.blockchain as CircleBlockchain,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Check if Paymaster is approved for a wallet
   * GET /circle/paymaster/approval/:walletId/:blockchain
   */
  @Get('approval/:walletId/:blockchain')
  async checkApproval(
    @Request() req: AuthRequest,
    @Param('walletId') walletId: string,
    @Param('blockchain') blockchain: string,
  ) {
    // Verify wallet belongs to user
    await this.walletService.getWallet(walletId, req.user.id);

    const result = await this.approvalService.checkApproval({
      walletId,
      blockchain: blockchain as CircleBlockchain,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Check if wallet is compatible with Paymaster
   * GET /circle/paymaster/compatible/:walletId
   */
  @Get('compatible/:walletId')
  async checkCompatibility(
    @Request() req: AuthRequest,
    @Param('walletId') walletId: string,
  ) {
    const wallet = await this.walletService.getWallet(walletId, req.user.id);
    
    // Paymaster only works with SCA + USER custody
    // Note: detailed custodyType check might need adjustment depending on how it's stored
    // verifying wallet.custodyType is available on the wallet object returned by service
    const isCompatible = wallet.accountType === 'SCA' && wallet.custodyType === 'USER';
    
    return {
      success: true,
      data: {
        isPaymasterCompatible: isCompatible,
        reason: isCompatible ? null : 'Paymaster requires SCA wallet with USER custody',
      },
    };
  }
}
