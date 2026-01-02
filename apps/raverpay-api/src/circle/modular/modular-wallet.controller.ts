import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ModularWalletService } from './modular-wallet.service';

// Auth request interface
interface AuthRequest {
  user: {
    id: string;
    email: string;
  };
}

/**
 * Modular Wallet Controller
 * Handles Circle Modular Wallets (Smart Accounts with Passkey authentication)
 * 
 * Note: Passkey registration/login and transaction signing happen client-side.
 * This controller only manages the database records for wallets and credentials.
 */
@ApiTags('Circle - Modular Wallets')
@Controller('circle/modular')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ModularWalletController {
  constructor(private readonly modularWalletService: ModularWalletService) {}

  /**
   * Save passkey credential after client-side registration
   * POST /circle/modular/passkey/save
   */
  @Post('passkey/save')
  @ApiOperation({
    summary: 'Save Passkey Credential',
    description:
      'Save passkey credential to database after successful client-side registration',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        credentialId: { type: 'string' },
        publicKey: { type: 'string' },
        rpId: { type: 'string' },
        username: { type: 'string' },
      },
      required: ['credentialId', 'publicKey'],
    },
  })
  @ApiResponse({ status: 201, description: 'Passkey credential saved' })
  async savePasskey(
    @Request() req: AuthRequest,
    @Body()
    dto: {
      credentialId: string;
      publicKey: string;
      rpId?: string;
      username?: string;
    },
  ) {
    const credential = await this.modularWalletService.savePasskeyCredential({
      userId: req.user.id,
      credentialId: dto.credentialId,
      publicKey: dto.publicKey,
      rpId: dto.rpId,
      username: dto.username,
    });

    return {
      success: true,
      data: credential,
    };
  }

  /**
   * Get user's passkey credentials
   * GET /circle/modular/passkeys
   */
  @Get('passkeys')
  @ApiOperation({
    summary: 'Get Passkey Credentials',
    description: "Get user's passkey credentials",
  })
  @ApiResponse({ status: 200, description: 'Passkey credentials retrieved' })
  async getPasskeys(@Request() req: AuthRequest) {
    const passkeys = await this.modularWalletService.getUserPasskeys(
      req.user.id,
    );

    return {
      success: true,
      data: passkeys,
    };
  }

  /**
   * Save modular wallet after client-side creation
   * POST /circle/modular/wallets/save
   */
  @Post('wallets/save')
  @ApiOperation({
    summary: 'Save Modular Wallet',
    description:
      'Save modular wallet to database after successful client-side creation',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        circleWalletId: { type: 'string' },
        address: { type: 'string' },
        blockchain: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['circleWalletId', 'address', 'blockchain'],
    },
  })
  @ApiResponse({ status: 201, description: 'Modular wallet saved' })
  async saveWallet(
    @Request() req: AuthRequest,
    @Body()
    dto: {
      circleWalletId: string;
      address: string;
      blockchain: string;
      name?: string;
    },
  ) {
    const wallet = await this.modularWalletService.saveModularWallet({
      userId: req.user.id,
      circleWalletId: dto.circleWalletId,
      address: dto.address,
      blockchain: dto.blockchain,
      name: dto.name,
    });

    return {
      success: true,
      data: wallet,
    };
  }

  /**
   * Get user's modular wallets
   * GET /circle/modular/wallets
   */
  @Get('wallets')
  @ApiOperation({
    summary: 'Get Modular Wallets',
    description: "Get user's modular wallets",
  })
  @ApiResponse({ status: 200, description: 'Modular wallets retrieved' })
  async getWallets(@Request() req: AuthRequest) {
    const wallets = await this.modularWalletService.getUserWallets(
      req.user.id,
    );

    return {
      success: true,
      data: wallets,
    };
  }

  /**
   * Get modular wallet by ID
   * GET /circle/modular/wallets/:id
   */
  @Get('wallets/:id')
  @ApiOperation({
    summary: 'Get Modular Wallet',
    description: 'Get modular wallet by ID',
  })
  @ApiResponse({ status: 200, description: 'Modular wallet retrieved' })
  async getWallet(@Request() req: AuthRequest, @Param('id') id: string) {
    const wallet = await this.modularWalletService.getWallet(id, req.user.id);

    return {
      success: true,
      data: wallet,
    };
  }
}
