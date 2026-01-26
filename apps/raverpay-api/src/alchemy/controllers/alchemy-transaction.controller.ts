import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
  Request,
  Logger,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AlchemyTransactionService } from '../transactions/alchemy-transaction.service';
import { SendTokenDto, GetBalanceDto } from './dto/alchemy.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

/**
 * Alchemy Transaction Controller
 *
 * Manages cryptocurrency transactions
 * All endpoints require authentication
 */
@ApiTags('Alchemy Transactions')
@Controller('alchemy/transactions')
@UseGuards(JwtAuthGuard) // Authentication enabled
@ApiBearerAuth()
export class AlchemyTransactionController {
  private readonly logger = new Logger(AlchemyTransactionController.name);

  constructor(
    private readonly transactionService: AlchemyTransactionService,
  ) {}

  /**
   * Send tokens (USDC/USDT)
   */
  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send USDC or USDT tokens' })
  @ApiResponse({
    status: 200,
    description: 'Transaction submitted successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 'tx-abc-123',
          reference: 'ALY-1234567890-abc',
          transactionHash: '0x123abc...',
          state: 'COMPLETED',
          amount: '10 USDC',
          destinationAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          blockNumber: '12345',
          completedAt: '2026-01-25T12:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async sendToken(@Body() dto: SendTokenDto, @Request() req: any) {
    try {
      const userId = req.user?.id || 'mock-user-id';

      const transaction = await this.transactionService.sendToken({
        userId,
        walletId: dto.walletId,
        destinationAddress: dto.destinationAddress,
        amount: dto.amount,
        tokenType: dto.tokenType,
      });

      this.logger.log(
        `User ${userId} sent ${dto.amount} ${dto.tokenType} (tx: ${transaction.reference})`,
      );

      return {
        success: true,
        data: transaction,
        message: 'Transaction submitted successfully',
      };
    } catch (error) {
      this.logger.error(
        `Error sending tokens: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get token balance
   */
  @Post('balance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get token balance for a wallet' })
  @ApiResponse({
    status: 200,
    description: 'Balance retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          walletId: 'wallet-abc-123',
          address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          tokenType: 'USDC',
          tokenAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          balance: '142.50',
          blockchain: 'BASE',
          network: 'sepolia',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getBalance(@Body() dto: GetBalanceDto, @Request() req: any) {
    try {
      const userId = req.user?.id || 'mock-user-id';

      const balance = await this.transactionService.getTokenBalance({
        userId,
        walletId: dto.walletId,
        tokenType: dto.tokenType,
      });

      return {
        success: true,
        data: balance,
      };
    } catch (error) {
      this.logger.error(`Error getting balance: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get transaction history for a wallet
   */
  @Get('history/:walletId')
  @ApiOperation({ summary: 'Get transaction history for a wallet' })
  @ApiParam({ name: 'walletId', description: 'Wallet ID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of transactions to return',
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of transactions to skip',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction history retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'tx-abc-123',
            reference: 'ALY-1234567890-abc',
            type: 'SEND',
            state: 'COMPLETED',
            sourceAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
            destinationAddress: '0x123...',
            tokenAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
            amount: '10 USDC',
            transactionHash: '0x123abc...',
            blockNumber: '12345',
            createdAt: '2026-01-25T12:00:00.000Z',
            completedAt: '2026-01-25T12:01:00.000Z',
          },
        ],
        count: 1,
        limit: 50,
        offset: 0,
      },
    },
  })
  async getHistory(
    @Param('walletId') walletId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Request() req: any,
  ) {
    try {
      const userId = req.user?.id || 'mock-user-id';

      const transactions =
        await this.transactionService.getTransactionHistory({
          userId,
          walletId,
          limit,
          offset,
        });

      return {
        success: true,
        data: transactions,
        count: transactions.length,
        limit,
        offset,
      };
    } catch (error) {
      this.logger.error(
        `Error getting transaction history: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get transaction by reference
   */
  @Get('reference/:reference')
  @ApiOperation({ summary: 'Get transaction by reference' })
  @ApiParam({
    name: 'reference',
    description: 'Transaction reference',
    example: 'ALY-1234567890-abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getByReference(
    @Param('reference') reference: string,
    @Request() req: any,
  ) {
    try {
      const userId = req.user?.id || 'mock-user-id';

      const transaction =
        await this.transactionService.getTransactionByReference(
          userId,
          reference,
        );

      return {
        success: true,
        data: transaction,
      };
    } catch (error) {
      this.logger.error(
        `Error getting transaction: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
