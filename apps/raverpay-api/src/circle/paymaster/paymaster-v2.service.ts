import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CircleConfigService } from '../config/circle.config.service';
import { CircleApiClient } from '../circle-api.client';
import { CircleBlockchain, CircleFeeLevel } from '../circle.types';
import { PermitService } from './permit.service';
import { BundlerService } from './bundler.service';
import { createPublicClient, http, parseAbi, encodeFunctionData } from 'viem';

/**
 * DTO for submitting a UserOperation with Paymaster
 */
export interface SubmitUserOpRequest {
  walletId: string;
  destinationAddress: string;
  amount: string;
  blockchain: CircleBlockchain;
  permitSignature: string; // EIP-2612 permit signature from client
  feeLevel?: CircleFeeLevel;
  memo?: string;
}

/**
 * Response from UserOperation submission
 */
export interface SubmitUserOpResponse {
  userOpHash: string;
  status: string;
  estimatedGasUsdc: string;
  paymasterAddress: string;
}

/**
 * Paymaster Service - Full Implementation
 * Handles gas fee sponsorship using Circle's Paymaster v0.8
 */
@Injectable()
export class PaymasterServiceV2 {
  private readonly logger = new Logger(PaymasterServiceV2.name);

  // Paymaster v0.8 addresses
  private readonly PAYMASTER_ADDRESSES = {
    mainnet: '0x0578cFB241215b77442a541325d6A4E6dFE700Ec',
    testnet: '0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966',
  };

  // EntryPoint v0.7 address (same across all chains)
  private readonly ENTRY_POINT = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';

  // USDC transfer ABI
  private readonly USDC_ABI = parseAbi([
    'function transfer(address to, uint256 amount) returns (bool)',
  ]);

  constructor(
    private readonly config: CircleConfigService,
    private readonly apiClient: CircleApiClient,
    private readonly prisma: PrismaService,
    private readonly permitService: PermitService,
    private readonly bundlerService: BundlerService,
  ) {}

  /**
   * Submit a UserOperation with Paymaster sponsorship
   */
  async submitUserOperation(
    request: SubmitUserOpRequest,
  ): Promise<SubmitUserOpResponse> {
    const {
      walletId,
      destinationAddress,
      amount,
      blockchain,
      permitSignature,
      feeLevel = 'MEDIUM',
    } = request;

    // 1. Get wallet details
    const wallet = await this.prisma.circleWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (wallet.accountType !== 'SCA') {
      throw new Error('Only SCA wallets support Paymaster');
    }

    // 2. Get Paymaster address for this chain
    const paymasterAddress = this.getPaymasterAddress(blockchain);
    const usdcAddress = this.config.getUsdcTokenAddress(blockchain);

    if (!usdcAddress) {
      throw new Error(`USDC not supported on ${blockchain}`);
    }

    // 3. Encode paymaster data with permit signature
    const parsedSignature = this.permitService.parsePermitSignature(
      permitSignature as `0x${string}`,
    );

    // Dynamically calculate gas buffer based on estimated gas
    let gasBufferUsdc = 3_000_000n; // Default 3 USDC in smallest units
    try {
      const gasEstimateNum = await this.estimateGasInUsdc(blockchain);
      gasBufferUsdc = BigInt(Math.ceil(gasEstimateNum * 1e6));
    } catch (error) {
      this.logger.warn(`Failed to estimate gas, using default: ${error}`);
    }

    // Add 20% safety margin to gas estimate
    const gasBuffer = (gasBufferUsdc * 120n) / 100n;
    const permitAmount = BigInt(amount) + gasBuffer;

    const paymasterData = this.permitService.encodePaymasterData({
      tokenAddress: usdcAddress,
      permitAmount,
      permitSignature: parsedSignature,
    });

    // 4. Get account nonce from EntryPoint
    const publicClient = this.bundlerService.getPublicClient(blockchain);
    if (!publicClient) {
      throw new Error(`No public client for ${blockchain}`);
    }

    const nonce = await publicClient.readContract({
      address: this.ENTRY_POINT as `0x${string}`,
      abi: parseAbi([
        'function getNonce(address sender, uint192 key) view returns (uint256)',
      ]),
      functionName: 'getNonce',
      args: [wallet.address as `0x${string}`, 0n],
    });

    // 5. Construct call data (USDC transfer)
    const callData = encodeFunctionData({
      abi: this.USDC_ABI,
      functionName: 'transfer',
      args: [destinationAddress as `0x${string}`, BigInt(amount)],
    });

    // 6. Build UserOperation
    const userOp = {
      sender: wallet.address,
      nonce: `0x${nonce.toString(16)}`,
      callData,
      callGasLimit: '0x0',
      verificationGasLimit: '0x0',
      preVerificationGas: '0x0',
      maxFeePerGas: '0x0',
      maxPriorityFeePerGas: '0x0',
      paymaster: paymasterAddress,
      paymasterVerificationGasLimit: '0x30d40', // 200,000
      paymasterPostOpGasLimit: '0x3a98', // 15,000
      paymasterData,
      signature: '0x', // Will be filled by bundler
    };

    // 7. Estimate gas
    const gasEstimate = await this.bundlerService.estimateUserOperationGas({
      blockchain,
      userOp,
    });

    // Update UserOp with gas estimates
    userOp.callGasLimit = `0x${gasEstimate.callGasLimit.toString(16)}`;
    userOp.verificationGasLimit = `0x${gasEstimate.verificationGasLimit.toString(16)}`;
    userOp.preVerificationGas = `0x${gasEstimate.preVerificationGas.toString(16)}`;
    userOp.maxFeePerGas = `0x${gasEstimate.maxFeePerGas.toString(16)}`;
    userOp.maxPriorityFeePerGas = `0x${gasEstimate.maxPriorityFeePerGas.toString(16)}`;

    // 8. Calculate estimated gas cost in USDC
    const totalGas =
      gasEstimate.callGasLimit +
      gasEstimate.verificationGasLimit +
      gasEstimate.preVerificationGas +
      200000n + // paymasterVerificationGasLimit
      15000n; // paymasterPostOpGasLimit

    const gasCostWei = totalGas * gasEstimate.maxFeePerGas;
    // Approximate: 1 ETH = 3000 USDC, 1 USDC = 1e6
    const estimatedGasUsdcStr = ((Number(gasCostWei) / 1e18) * 3000).toFixed(6);

    // 9. Submit to bundler
    const userOpHash = await this.bundlerService.submitUserOperation({
      blockchain,
      userOp,
    });

    // 10. Store in database
    await this.prisma.paymasterUserOperation.create({
      data: {
        userOpHash,
        sender: wallet.address,
        walletId: wallet.id,
        blockchain,
        status: 'PENDING',
        estimatedGasUsdc: estimatedGasUsdcStr,
        permitSignature,
        paymasterData,
      },
    });

    this.logger.log(
      `UserOperation submitted: ${userOpHash} for wallet ${walletId}`,
    );

    return {
      userOpHash,
      status: 'PENDING',
      estimatedGasUsdc: estimatedGasUsdcStr,
      paymasterAddress,
    };
  }

  /**
   * Get UserOperation status
   */
  async getUserOperationStatus(userOpHash: string) {
    const userOp = await this.prisma.paymasterUserOperation.findUnique({
      where: { userOpHash },
      include: {
        wallet: true,
        events: true,
      },
    });

    if (!userOp) {
      throw new Error('UserOperation not found');
    }

    // Try to get receipt from bundler if still pending
    if (userOp.status === 'PENDING' && !userOp.transactionHash) {
      try {
        const receipt = await this.bundlerService.waitForUserOperationReceipt({
          blockchain: userOp.blockchain as CircleBlockchain,
          userOpHash,
          timeout: 5000, // 5 second timeout for status check
        });

        // Update database with transaction hash
        await this.prisma.paymasterUserOperation.update({
          where: { userOpHash },
          data: {
            transactionHash: receipt.transactionHash,
            status: receipt.success ? 'CONFIRMED' : 'FAILED',
          },
        });

        userOp.transactionHash = receipt.transactionHash;
        userOp.status = receipt.success ? 'CONFIRMED' : 'FAILED';
      } catch (error) {
        // Still pending
        this.logger.debug(`UserOp ${userOpHash} still pending`);
      }
    }

    return userOp;
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
   * Generate permit typed data for client to sign
   */
  async generatePermitData(params: {
    walletId: string;
    amount: string;
    blockchain: CircleBlockchain;
  }) {
    const { walletId, amount, blockchain } = params;

    const wallet = await this.prisma.circleWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const usdcAddress = this.config.getUsdcTokenAddress(blockchain);
    if (!usdcAddress) {
      throw new Error(`USDC not supported on ${blockchain}`);
    }

    const paymasterAddress = this.getPaymasterAddress(blockchain);
    const chain = this.bundlerService.getChain(blockchain);

    if (!chain) {
      throw new Error(`Chain not supported: ${blockchain}`);
    }

    // Get current nonce from USDC contract
    const publicClient = this.bundlerService.getPublicClient(blockchain);
    if (!publicClient) {
      throw new Error(`No public client for ${blockchain}`);
    }

    const nonce = await publicClient.readContract({
      address: usdcAddress as `0x${string}`,
      abi: this.permitService.getEip2612Abi(),
      functionName: 'nonces',
      args: [wallet.address as `0x${string}`],
    });

    // Dynamically calculate gas buffer based on estimated gas
    // Default to 3 USDC if estimation fails, with 20% safety margin
    let estimatedGasUsdc = 3_000_000n; // 3 USDC in smallest units
    try {
      const gasEstimate = await this.estimateGasInUsdc(blockchain);
      estimatedGasUsdc = BigInt(Math.ceil(gasEstimate * 1e6));
    } catch (error) {
      this.logger.warn(`Failed to estimate gas, using default: ${error}`);
    }

    // Add 20% safety margin to gas estimate
    const gasBuffer = (estimatedGasUsdc * 120n) / 100n;
    const permitAmount = BigInt(amount) + gasBuffer;

    this.logger.debug(
      `Permit calculation: amount=${amount}, gasBuffer=${gasBuffer.toString()}, total=${permitAmount.toString()}`,
    );

    // Generate typed data
    const typedData = await this.permitService.generatePermitTypedData({
      tokenAddress: usdcAddress,
      tokenName: 'USD Coin',
      tokenVersion: '2',
      chainId: chain.id,
      ownerAddress: wallet.address,
      spenderAddress: paymasterAddress,
      value: permitAmount,
      nonce: nonce as bigint,
    });

    return {
      typedData,
      permitAmount: permitAmount.toString(),
      paymasterAddress,
      usdcAddress,
      estimatedGasUsdc: (Number(gasBuffer) / 1e6).toFixed(6),
    };
  }

  /**
   * Estimate gas cost in USDC for a UserOperation on a given blockchain
   */
  private async estimateGasInUsdc(blockchain: CircleBlockchain): Promise<number> {
    // Get gas price from chain
    const publicClient = this.bundlerService.getPublicClient(blockchain);
    if (!publicClient) {
      return 3.0; // Default to 3 USDC
    }

    try {
      const gasPrice = await publicClient.getGasPrice();
      
      // Estimate typical UserOp gas usage (~500k gas for transfer with paymaster)
      const estimatedGas = 500_000n;
      const gasCostWei = estimatedGas * gasPrice;
      
      // Convert to USD using approximate ETH prices per chain
      // These are rough estimates - in production, use an oracle
      const ethPrices: Record<string, number> = {
        'ETH': 3000, 'ETH-SEPOLIA': 3000,
        'ARB': 3000, 'ARB-SEPOLIA': 3000,
        'BASE': 3000, 'BASE-SEPOLIA': 3000,
        'OP': 3000, 'OP-SEPOLIA': 3000,
        'AVAX': 35, 'AVAX-FUJI': 35,
        'MATIC': 0.8, 'MATIC-AMOY': 0.8,
      };
      
      const ethPrice = ethPrices[blockchain] || 3000;
      const gasCostUsd = (Number(gasCostWei) / 1e18) * ethPrice;
      
      // Minimum 0.5 USDC, maximum 10 USDC
      return Math.max(0.5, Math.min(10, gasCostUsd));
    } catch (error) {
      this.logger.warn(`Gas estimation failed for ${blockchain}: ${error}`);
      return 3.0; // Default to 3 USDC
    }
  }
}
