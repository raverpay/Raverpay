import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AlchemyWalletGenerationService } from '../wallets/alchemy-wallet-generation.service';
import { AlchemySmartAccountService } from '../wallets/alchemy-smart-account.service';
import { CreateWalletDto, UpdateWalletNameDto } from './dto/alchemy.dto';

/**
 * Alchemy Wallet Controller
 *
 * Manages cryptocurrency wallets
 * All endpoints require authentication
 */
@ApiTags('Alchemy Wallets')
@Controller('api/alchemy/wallets')
// @UseGuards(JwtAuthGuard) // Uncomment when ready to add auth
@ApiBearerAuth()
export class AlchemyWalletController {
  private readonly logger = new Logger(AlchemyWalletController.name);

  constructor(
    private readonly walletService: AlchemyWalletGenerationService,
    private readonly smartAccountService: AlchemySmartAccountService,
  ) {}

  /**
   * Create a new wallet
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new Alchemy wallet' })
  @ApiResponse({
    status: 201,
    description: 'Wallet created successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 'wallet-abc-123',
          address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          blockchain: 'BASE',
          network: 'sepolia',
          accountType: 'EOA',
          name: 'My Wallet',
          isGasSponsored: false,
          createdAt: '2026-01-25T12:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 409, description: 'Wallet already exists' })
  async createWallet(@Body() dto: CreateWalletDto, @Request() req: any) {
    try {
      // In production, get userId from JWT token
      // For now, using a mock userId
      const userId = req.user?.userId || 'mock-user-id';

      const wallet = await this.walletService.generateEOAWallet({
        userId,
        blockchain: dto.blockchain,
        network: dto.network,
        name: dto.name,
      });

      this.logger.log(
        `User ${userId} created wallet ${wallet.id} on ${dto.blockchain}-${dto.network}`,
      );

      return {
        success: true,
        data: wallet,
      };
    } catch (error) {
      this.logger.error(`Error creating wallet: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all wallets for authenticated user
   */
  @Get()
  @ApiOperation({ summary: 'Get all wallets for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Wallets retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'wallet-abc-123',
            address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
            blockchain: 'BASE',
            network: 'sepolia',
            accountType: 'EOA',
            state: 'ACTIVE',
            name: 'My Wallet',
            isGasSponsored: false,
            createdAt: '2026-01-25T12:00:00.000Z',
          },
        ],
        count: 1,
      },
    },
  })
  async getWallets(@Request() req: any) {
    try {
      const userId = req.user?.userId || 'mock-user-id';

      const wallets = await this.walletService.getUserWallets(userId);

      return {
        success: true,
        data: wallets,
        count: wallets.length,
      };
    } catch (error) {
      this.logger.error(`Error getting wallets: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get wallet by ID
   */
  @Get(':walletId')
  @ApiOperation({ summary: 'Get wallet by ID' })
  @ApiParam({ name: 'walletId', description: 'Wallet ID' })
  @ApiResponse({
    status: 200,
    description: 'Wallet retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getWallet(@Param('walletId') walletId: string, @Request() req: any) {
    try {
      const userId = req.user?.userId || 'mock-user-id';

      const wallet = await this.walletService.getWallet(walletId, userId);

      return {
        success: true,
        data: wallet,
      };
    } catch (error) {
      this.logger.error(`Error getting wallet: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get wallet by blockchain and network
   */
  @Get('by-network/:blockchain/:network')
  @ApiOperation({ summary: 'Get wallet by blockchain and network' })
  @ApiParam({ name: 'blockchain', description: 'Blockchain name' })
  @ApiParam({ name: 'network', description: 'Network name' })
  @ApiResponse({
    status: 200,
    description: 'Wallet retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getWalletByNetwork(
    @Param('blockchain') blockchain: string,
    @Param('network') network: string,
    @Request() req: any,
  ) {
    try {
      const userId = req.user?.userId || 'mock-user-id';

      const wallet = await this.walletService.getWalletByNetwork(
        userId,
        blockchain,
        network,
      );

      if (!wallet) {
        return {
          success: false,
          message: `No wallet found for ${blockchain}-${network}`,
          data: null,
        };
      }

      return {
        success: true,
        data: wallet,
      };
    } catch (error) {
      this.logger.error(
        `Error getting wallet by network: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update wallet name
   */
  @Patch(':walletId/name')
  @ApiOperation({ summary: 'Update wallet name' })
  @ApiParam({ name: 'walletId', description: 'Wallet ID' })
  @ApiResponse({
    status: 200,
    description: 'Wallet name updated successfully',
  })
  async updateWalletName(
    @Param('walletId') walletId: string,
    @Body() dto: UpdateWalletNameDto,
    @Request() req: any,
  ) {
    try {
      const userId = req.user?.userId || 'mock-user-id';

      const wallet = await this.walletService.updateWalletName(
        walletId,
        userId,
        dto.name,
      );

      this.logger.log(`User ${userId} updated wallet ${walletId} name`);

      return {
        success: true,
        data: wallet,
        message: 'Wallet name updated successfully',
      };
    } catch (error) {
      this.logger.error(
        `Error updating wallet name: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Deactivate wallet
   */
  @Delete(':walletId')
  @ApiOperation({ summary: 'Deactivate wallet (soft delete)' })
  @ApiParam({ name: 'walletId', description: 'Wallet ID' })
  @ApiResponse({
    status: 200,
    description: 'Wallet deactivated successfully',
  })
  async deactivateWallet(
    @Param('walletId') walletId: string,
    @Request() req: any,
  ) {
    try {
      const userId = req.user?.userId || 'mock-user-id';

      const wallet = await this.walletService.deactivateWallet(
        walletId,
        userId,
      );

      this.logger.log(`User ${userId} deactivated wallet ${walletId}`);

      return {
        success: true,
        data: wallet,
        message: 'Wallet deactivated successfully',
      };
    } catch (error) {
      this.logger.error(
        `Error deactivating wallet: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Lock wallet (security feature)
   */
  @Post(':walletId/lock')
  @ApiOperation({ summary: 'Lock wallet for security' })
  @ApiParam({ name: 'walletId', description: 'Wallet ID' })
  @ApiResponse({
    status: 200,
    description: 'Wallet locked successfully',
  })
  async lockWallet(@Param('walletId') walletId: string, @Request() req: any) {
    try {
      const userId = req.user?.userId || 'mock-user-id';

      const wallet = await this.walletService.lockWallet(walletId, userId);

      this.logger.warn(`User ${userId} locked wallet ${walletId}`);

      return {
        success: true,
        data: wallet,
        message: 'Wallet locked successfully',
      };
    } catch (error) {
      this.logger.error(`Error locking wallet: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Mark wallet as compromised (emergency)
   */
  @Post(':walletId/compromised')
  @ApiOperation({ summary: 'Mark wallet as compromised (emergency shutdown)' })
  @ApiParam({ name: 'walletId', description: 'Wallet ID' })
  @ApiResponse({
    status: 200,
    description: 'Wallet marked as compromised',
  })
  async markCompromised(
    @Param('walletId') walletId: string,
    @Request() req: any,
  ) {
    try {
      const userId = req.user?.userId || 'mock-user-id';

      const wallet = await this.walletService.markWalletCompromised(
        walletId,
        userId,
      );

      this.logger.error(
        `🚨 SECURITY: User ${userId} marked wallet ${walletId} as COMPROMISED`,
      );

      return {
        success: true,
        data: wallet,
        message: 'Wallet marked as compromised',
      };
    } catch (error) {
      this.logger.error(
        `Error marking wallet compromised: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * SMART ACCOUNT ENDPOINTS (Account Abstraction)
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * Create a Smart Account (Account Abstraction)
   */
  @Post('smart-account')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a Smart Contract Account with gas sponsorship' })
  @ApiResponse({
    status: 201,
    description: 'Smart Account created successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 'wallet-smart-123',
          address: '0x8a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
          blockchain: 'BASE',
          network: 'sepolia',
          accountType: 'SMART_CONTRACT',
          name: 'My Smart Account',
          isGasSponsored: true,
          gasPolicyId: 'policy-xyz',
          createdAt: '2026-01-25T13:00:00.000Z',
          features: {
            gasSponsorship: true,
            batchTransactions: true,
            sessionKeys: true,
            socialRecovery: false,
          },
        },
      },
    },
  })
  async createSmartAccount(
    @Body() dto: CreateWalletDto,
    @Request() req: any,
  ) {
    try {
      const userId = req.user?.userId || 'mock-user-id';

      const smartAccount = await this.smartAccountService.createSmartAccount({
        userId,
        blockchain: dto.blockchain,
        network: dto.network,
        name: dto.name,
      });

      this.logger.log(
        `User ${userId} created Smart Account ${smartAccount.id} with gas sponsorship!`,
      );

      return {
        success: true,
        data: smartAccount,
        message: 'Smart Account created with gas sponsorship enabled!',
      };
    } catch (error) {
      this.logger.error(
        `Error creating Smart Account: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get all Smart Accounts for user
   */
  @Get('smart-accounts')
  @ApiOperation({ summary: 'Get all Smart Accounts for authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Smart Accounts retrieved successfully',
  })
  async getSmartAccounts(@Request() req: any) {
    try {
      const userId = req.user?.userId || 'mock-user-id';

      const accounts = await this.smartAccountService.getUserSmartAccounts(
        userId,
      );

      return {
        success: true,
        data: accounts,
        count: accounts.length,
      };
    } catch (error) {
      this.logger.error(
        `Error getting Smart Accounts: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Check gas sponsorship status
   */
  @Get(':walletId/gas-sponsorship')
  @ApiOperation({ summary: 'Check gas sponsorship status for Smart Account' })
  @ApiParam({ name: 'walletId', description: 'Smart Account wallet ID' })
  @ApiResponse({
    status: 200,
    description: 'Gas sponsorship status retrieved',
    schema: {
      example: {
        success: true,
        data: {
          isEnabled: true,
          policyId: 'policy-xyz',
          dailyLimit: 'Unlimited',
          currentUsage: '$5.23',
          remainingToday: 'Unlimited',
          message: 'Gas fees are sponsored - users transact for free!',
        },
      },
    },
  })
  async checkGasSponsorship(
    @Param('walletId') walletId: string,
    @Request() req: any,
  ) {
    try {
      const userId = req.user?.userId || 'mock-user-id';

      const status = await this.smartAccountService.checkGasSponsorship(
        walletId,
        userId,
      );

      return {
        success: true,
        data: status,
      };
    } catch (error) {
      this.logger.error(
        `Error checking gas sponsorship: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Upgrade EOA to Smart Account
   */
  @Post(':walletId/upgrade-to-smart-account')
  @ApiOperation({
    summary: 'Upgrade existing EOA wallet to Smart Account',
    description:
      'Creates a new Smart Account while keeping the original EOA wallet active',
  })
  @ApiParam({ name: 'walletId', description: 'EOA Wallet ID to upgrade' })
  @ApiResponse({
    status: 200,
    description: 'Successfully upgraded to Smart Account',
  })
  async upgradeToSmartAccount(
    @Param('walletId') walletId: string,
    @Request() req: any,
  ) {
    try {
      const userId = req.user?.userId || 'mock-user-id';

      const result = await this.smartAccountService.upgradeToSmartAccount(
        walletId,
        userId,
      );

      this.logger.log(
        `User ${userId} upgraded EOA ${walletId} to Smart Account ${result.newWallet.id}`,
      );

      return {
        success: true,
        data: result,
        message: 'Successfully upgraded to Smart Account with gas sponsorship!',
      };
    } catch (error) {
      this.logger.error(
        `Error upgrading to Smart Account: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
