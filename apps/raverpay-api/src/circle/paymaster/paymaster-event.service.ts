import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BundlerService } from './bundler.service';
import { CircleBlockchain } from '../circle.types';
import { createPublicClient, http, parseAbi, Log } from 'viem';

/**
 * Paymaster Event Tracking Service
 * Listens for UserOperationSponsored events and tracks actual gas costs
 */
@Injectable()
export class PaymasterEventService implements OnModuleInit {
  private readonly logger = new Logger(PaymasterEventService.name);

  // UserOperationSponsored event ABI
  private readonly EVENT_ABI = parseAbi([
    'event UserOperationSponsored(address indexed token, address indexed sender, bytes32 indexed userOpHash, uint256 nativeTokenPrice, uint256 actualTokenNeeded, uint256 feeTokenAmount)',
  ]);

  // Paymaster addresses
  private readonly PAYMASTER_ADDRESSES = {
    mainnet: '0x0578cFB241215b77442a541325d6A4E6dFE700Ec',
    testnet: '0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966',
  };

  // Supported blockchains for event tracking
  private readonly SUPPORTED_CHAINS: CircleBlockchain[] = [
    'ETH-SEPOLIA',
    'ARB-SEPOLIA',
    'BASE-SEPOLIA',
    'OP-SEPOLIA',
    'MATIC-AMOY',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly bundlerService: BundlerService,
  ) {}

  /**
   * Initialize event listeners on module start
   *
   * NOTE: Auto-start disabled because public RPC nodes don't support persistent filters.
   * Use manual sync via /circle/paymaster/sync-events endpoint instead.
   */
  async onModuleInit() {
    this.logger.log('Paymaster Event Service initialized');
    this.logger.warn(
      'Auto event listeners disabled. Use sync-events endpoint to manually sync events.',
    );

    // Auto-start disabled - uncomment when using dedicated RPC with filter support
    // for (const blockchain of this.SUPPORTED_CHAINS) {
    //   this.startEventListener(blockchain);
    // }
  }

  /**
   * Start listening for UserOperationSponsored events on a blockchain
   */
  private async startEventListener(blockchain: CircleBlockchain) {
    const publicClient = this.bundlerService.getPublicClient(blockchain);
    if (!publicClient) {
      this.logger.warn(
        `No public client for ${blockchain}, skipping event listener`,
      );
      return;
    }

    const paymasterAddress = this.getPaymasterAddress(blockchain);

    this.logger.log(
      `Starting event listener for ${blockchain} at ${paymasterAddress}`,
    );

    // Watch for UserOperationSponsored events
    publicClient.watchContractEvent({
      address: paymasterAddress as `0x${string}`,
      abi: this.EVENT_ABI,
      eventName: 'UserOperationSponsored',
      onLogs: (logs) => {
        void this.handleEvents(logs, blockchain);
      },
      onError: (error) => {
        this.logger.error(
          `Error watching events on ${blockchain}: ${error.message}`,
        );
      },
    });
  }

  /**
   * Handle UserOperationSponsored events
   */
  private async handleEvents(logs: Log[], blockchain: CircleBlockchain) {
    for (const log of logs) {
      try {
        await this.processEvent(log, blockchain);
      } catch (error) {
        this.logger.error(
          `Error processing event: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  /**
   * Process a single UserOperationSponsored event
   */
  private async processEvent(log: Log, blockchain: CircleBlockchain) {
    const { args, transactionHash, blockNumber } = log as any;

    const {
      token,
      sender,
      userOpHash,
      nativeTokenPrice,
      actualTokenNeeded,
      feeTokenAmount,
    } = args;

    this.logger.log(
      `UserOperationSponsored: ${userOpHash} - ${actualTokenNeeded} USDC`,
    );

    // Find the UserOperation in database
    const userOp = await this.prisma.paymasterUserOperation.findUnique({
      where: { userOpHash },
    });

    if (!userOp) {
      this.logger.warn(`UserOperation not found: ${userOpHash}`);
      return;
    }

    // Convert to USDC (6 decimals)
    const actualGasUsdc = (Number(actualTokenNeeded) / 1e6).toFixed(6);

    // Update UserOperation with actual gas cost
    await this.prisma.paymasterUserOperation.update({
      where: { userOpHash },
      data: {
        actualGasUsdc,
        transactionHash,
        status: 'CONFIRMED',
      },
    });

    // Create PaymasterEvent record
    await this.prisma.paymasterEvent.create({
      data: {
        userOpHash,
        token,
        sender,
        nativeTokenPrice: nativeTokenPrice.toString(),
        actualTokenNeeded: actualTokenNeeded.toString(),
        feeTokenAmount: feeTokenAmount.toString(),
        transactionHash,
        blockNumber: Number(blockNumber),
      },
    });

    // Check for overpayment and trigger refund if needed
    const estimatedUsdc = parseFloat(userOp.estimatedGasUsdc);
    const actualUsdc = parseFloat(actualGasUsdc);
    const overpayment = estimatedUsdc - actualUsdc;

    if (overpayment > 1.0) {
      // More than $1 overpayment
      this.logger.warn(
        `Overpayment detected: ${overpayment.toFixed(6)} USDC for ${userOpHash}. ` +
          `Consider implementing refund process for user ${userOp.walletId}`,
      );
      // Note: Refund process should be implemented based on business requirements
      // This could involve creating a refund transaction or crediting user's account
    }

    this.logger.log(
      `Event processed: ${userOpHash} - Estimated: ${estimatedUsdc} USDC, Actual: ${actualUsdc} USDC`,
    );
  }

  /**
   * Get Paymaster address for blockchain
   */
  private getPaymasterAddress(blockchain: CircleBlockchain): string {
    const isTestnet =
      blockchain.includes('SEPOLIA') ||
      blockchain.includes('FUJI') ||
      blockchain.includes('AMOY');
    return isTestnet
      ? this.PAYMASTER_ADDRESSES.testnet
      : this.PAYMASTER_ADDRESSES.mainnet;
  }

  /**
   * Manually sync events for a specific block range
   * Useful for catching up on missed events
   */
  async syncEvents(params: {
    blockchain: CircleBlockchain;
    fromBlock: bigint;
    toBlock: bigint;
  }) {
    const { blockchain, fromBlock, toBlock } = params;

    const publicClient = this.bundlerService.getPublicClient(blockchain);
    if (!publicClient) {
      throw new Error(`No public client for ${blockchain}`);
    }

    const paymasterAddress = this.getPaymasterAddress(blockchain);

    this.logger.log(
      `Syncing events for ${blockchain} from block ${fromBlock} to ${toBlock}`,
    );

    const logs = await publicClient.getLogs({
      address: paymasterAddress as `0x${string}`,
      event: this.EVENT_ABI[0],
      fromBlock,
      toBlock,
    });

    this.logger.log(`Found ${logs.length} events to sync`);

    for (const log of logs) {
      await this.processEvent(log, blockchain);
    }

    return { synced: logs.length };
  }

  /**
   * Get Paymaster events for a wallet
   */
  async getWalletEvents(walletId: string) {
    const userOps = await this.prisma.paymasterUserOperation.findMany({
      where: { walletId },
      include: { events: true },
      orderBy: { createdAt: 'desc' },
    });

    return userOps;
  }

  /**
   * Get Paymaster statistics
   */
  async getPaymasterStats() {
    const totalUserOps = await this.prisma.paymasterUserOperation.count();

    const confirmedUserOps = await this.prisma.paymasterUserOperation.count({
      where: { status: 'CONFIRMED' },
    });

    // Get all confirmed UserOps with actual gas cost
    const confirmedOps = await this.prisma.paymasterUserOperation.findMany({
      where: {
        status: 'CONFIRMED',
        actualGasUsdc: { not: null },
      },
      select: { actualGasUsdc: true },
    });

    // Calculate totals manually since actualGasUsdc is TEXT
    const totalGasSpent = confirmedOps.reduce((sum, op) => {
      return sum + parseFloat(op.actualGasUsdc || '0');
    }, 0);

    const avgGasPerTx =
      confirmedOps.length > 0 ? totalGasSpent / confirmedOps.length : 0;

    return {
      totalUserOps,
      confirmedUserOps,
      pendingUserOps: totalUserOps - confirmedUserOps,
      totalGasSpentUsdc: totalGasSpent.toFixed(6),
      averageGasPerTxUsdc: avgGasPerTx.toFixed(6),
    };
  }
}
