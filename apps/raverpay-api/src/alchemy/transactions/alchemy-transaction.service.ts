import { Injectable, Logger } from '@nestjs/common';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  type Address,
  type Hash,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { AlchemyWalletGenerationService } from '../wallets/alchemy-wallet-generation.service';
import { AlchemyConfigService } from '../config/alchemy-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AlchemyTransactionState,
  AlchemyTransactionType,
} from '@prisma/client';

// ERC20 Token ABI (minimal - just what we need)
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
] as const;

/**
 * Alchemy Transaction Service
 *
 * Handles blockchain transactions using Alchemy RPC
 * - Send USDC/USDT tokens
 * - Check token balances
 * - Track transaction history
 * - Monitor transaction states
 */
@Injectable()
export class AlchemyTransactionService {
  private readonly logger = new Logger(AlchemyTransactionService.name);

  constructor(
    private readonly walletService: AlchemyWalletGenerationService,
    private readonly configService: AlchemyConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.logger.log('Alchemy transaction service initialized');
  }

  /**
   * Send USDC or USDT to an address
   *
   * @param params - Transaction parameters
   * @returns Transaction details
   */
  async sendToken(params: {
    userId: string;
    walletId: string;
    destinationAddress: string;
    amount: string; // Amount in token units (e.g., "10" for 10 USDC)
    tokenType: 'USDC' | 'USDT';
  }) {
    const { userId, walletId, destinationAddress, amount, tokenType } = params;

    this.logger.log(
      `Sending ${amount} ${tokenType} from wallet ${walletId} to ${destinationAddress}`,
    );

    // 1. Get wallet and verify ownership
    const wallet = await this.walletService.getWallet(walletId, userId);

    // 2. Get network configuration
    const networkConfig = this.configService.getNetworkConfig(
      wallet.blockchain,
      wallet.network,
    );

    // 3. Get token address
    const tokenAddress =
      tokenType === 'USDC'
        ? networkConfig.usdcAddress
        : networkConfig.usdtAddress;

    if (!tokenAddress) {
      throw new Error(
        `${tokenType} not supported on ${wallet.blockchain}-${wallet.network}`,
      );
    }

    // 4. Validate destination address
    if (!destinationAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid destination address format');
    }

    // 5. Get decrypted private key
    const privateKey = await this.walletService.getDecryptedPrivateKey(
      walletId,
      userId,
    );

    // 6. Create transaction reference
    const reference = `ALY-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // 7. Create database transaction record (PENDING state)
    const txRecord = await this.prisma.alchemyTransaction.create({
      data: {
        reference,
        userId,
        walletId,
        type: AlchemyTransactionType.SEND,
        state: AlchemyTransactionState.PENDING,
        sourceAddress: wallet.address,
        destinationAddress: destinationAddress.toLowerCase(),
        tokenAddress: tokenAddress.toLowerCase(),
        blockchain: wallet.blockchain,
        network: wallet.network,
        amount: parseUnits(amount, 6).toString(), // USDC/USDT have 6 decimals
        amountFormatted: `${amount} ${tokenType}`,
      },
    });

    try {
      // 8. Create viem clients
      const chain = this.getChainConfig(networkConfig.chainId);
      const account = privateKeyToAccount(privateKey as `0x${string}`);

      const publicClient = createPublicClient({
        chain,
        transport: http(networkConfig.rpcUrl),
      });

      const walletClient = createWalletClient({
        account,
        chain,
        transport: http(networkConfig.rpcUrl),
      });

      // 9. Prepare transaction
      const amountInWei = parseUnits(amount, 6); // USDC/USDT use 6 decimals

      // 10. Send transaction
      this.logger.debug(
        `Submitting transaction to blockchain for ${reference}`,
      );

      const hash = await walletClient.writeContract({
        address: tokenAddress as Address,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [destinationAddress as Address, amountInWei],
      });

      this.logger.log(`Transaction submitted: ${hash}`);

      // 11. Update transaction record with hash
      await this.prisma.alchemyTransaction.update({
        where: { id: txRecord.id },
        data: {
          transactionHash: hash,
          state: AlchemyTransactionState.SUBMITTED,
        },
      });

      // 12. Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
      });

      this.logger.log(
        `Transaction confirmed in block ${receipt.blockNumber}: ${hash}`,
      );

      // 13. Update transaction record with confirmation
      const finalTx = await this.prisma.alchemyTransaction.update({
        where: { id: txRecord.id },
        data: {
          state:
            receipt.status === 'success'
              ? AlchemyTransactionState.COMPLETED
              : AlchemyTransactionState.FAILED,
          blockNumber: receipt.blockNumber,
          blockHash: receipt.blockHash,
          gasUsed: receipt.gasUsed.toString(),
          confirmations: 1,
          completedAt: receipt.status === 'success' ? new Date() : undefined,
          failedAt: receipt.status === 'success' ? undefined : new Date(),
          errorMessage:
            receipt.status === 'success' ? undefined : 'Transaction reverted',
        },
      });

      return {
        id: finalTx.id,
        reference: finalTx.reference,
        transactionHash: finalTx.transactionHash,
        state: finalTx.state,
        amount: finalTx.amountFormatted,
        destinationAddress: finalTx.destinationAddress,
        blockNumber: finalTx.blockNumber?.toString(),
        completedAt: finalTx.completedAt,
      };
    } catch (error) {
      // Update transaction as failed
      await this.prisma.alchemyTransaction.update({
        where: { id: txRecord.id },
        data: {
          state: AlchemyTransactionState.FAILED,
          errorMessage: error.message,
          failedAt: new Date(),
        },
      });

      this.logger.error(
        `Transaction failed for ${reference}: ${error.message}`,
        error.stack,
      );

      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  /**
   * Get token balance for a wallet
   *
   * @param params - Balance query parameters
   * @returns Token balance
   */
  async getTokenBalance(params: {
    userId: string;
    walletId: string;
    tokenType: 'USDC' | 'USDT';
  }) {
    const { userId, walletId, tokenType } = params;

    // 1. Get wallet and verify ownership
    const wallet = await this.walletService.getWallet(walletId, userId);

    // DEBUG: Log wallet details
    this.logger.debug(
      `Getting balance for wallet: ${walletId}, blockchain: ${wallet.blockchain}, network: ${wallet.network}`,
    );

    // 2. Get network configuration
    const networkConfig = this.configService.getNetworkConfig(
      wallet.blockchain,
      wallet.network,
    );

    // 3. Get token address
    const tokenAddress =
      tokenType === 'USDC'
        ? networkConfig.usdcAddress
        : networkConfig.usdtAddress;

    if (!tokenAddress) {
      throw new Error(
        `${tokenType} not supported on ${wallet.blockchain}-${wallet.network}`,
      );
    }

    // 4. Create public client
    const chain = this.getChainConfig(networkConfig.chainId);
    const publicClient = createPublicClient({
      chain,
      transport: http(networkConfig.rpcUrl),
    });

    // 5. Read balance from contract
    const balance = await publicClient.readContract({
      address: tokenAddress as Address,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [wallet.address as Address],
    });

    // 6. Format balance (USDC/USDT use 6 decimals)
    const formattedBalance = formatUnits(balance as bigint, 6);

    return {
      walletId: wallet.id,
      address: wallet.address,
      tokenType,
      tokenAddress,
      balance: formattedBalance,
      balanceRaw: (balance as bigint).toString(),
      blockchain: wallet.blockchain,
      network: wallet.network,
    };
  }

  /**
   * Get transaction history for a wallet
   *
   * @param params - History query parameters
   * @returns List of transactions
   */
  async getTransactionHistory(params: {
    userId: string;
    walletId: string;
    limit?: number;
    offset?: number;
  }) {
    const { userId, walletId, limit = 50, offset = 0 } = params;

    // Verify wallet ownership
    await this.walletService.getWallet(walletId, userId);

    // Get transactions from database
    const transactions = await this.prisma.alchemyTransaction.findMany({
      where: { walletId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return transactions.map((tx) => ({
      id: tx.id,
      reference: tx.reference,
      type: tx.type,
      state: tx.state,
      sourceAddress: tx.sourceAddress,
      destinationAddress: tx.destinationAddress,
      tokenAddress: tx.tokenAddress,
      amount: tx.amountFormatted,
      transactionHash: tx.transactionHash,
      blockNumber: tx.blockNumber?.toString(),
      gasUsed: tx.gasUsed,
      errorMessage: tx.errorMessage,
      createdAt: tx.createdAt,
      completedAt: tx.completedAt,
      failedAt: tx.failedAt,
    }));
  }

  /**
   * Get transaction by reference
   *
   * @param userId - User ID
   * @param reference - Transaction reference
   * @returns Transaction details
   */
  async getTransactionByReference(userId: string, reference: string) {
    const tx = await this.prisma.alchemyTransaction.findUnique({
      where: { reference },
    });

    if (!tx) {
      throw new Error('Transaction not found');
    }

    // Verify ownership
    if (tx.userId !== userId) {
      throw new Error('Access denied');
    }

    return {
      id: tx.id,
      reference: tx.reference,
      type: tx.type,
      state: tx.state,
      sourceAddress: tx.sourceAddress,
      destinationAddress: tx.destinationAddress,
      tokenAddress: tx.tokenAddress,
      amount: tx.amountFormatted,
      transactionHash: tx.transactionHash,
      blockNumber: tx.blockNumber?.toString(),
      gasUsed: tx.gasUsed,
      networkFee: tx.networkFee,
      errorMessage: tx.errorMessage,
      confirmations: tx.confirmations,
      createdAt: tx.createdAt,
      completedAt: tx.completedAt,
      failedAt: tx.failedAt,
    };
  }

  /**
   * Get native token balance for a wallet (ETH/MATIC/ARB)
   *
   * @param params - Balance query parameters
   * @returns Native token balance
   */
  async getNativeTokenBalance(params: { userId: string; walletId: string }) {
    const { userId, walletId } = params;

    // 1. Get wallet and verify ownership
    const wallet = await this.walletService.getWallet(walletId, userId);

    // 2. Get network configuration
    const networkConfig = this.configService.getNetworkConfig(
      wallet.blockchain,
      wallet.network,
    );

    // 3. Create public client
    const chain = this.getChainConfig(networkConfig.chainId);
    const publicClient = createPublicClient({
      chain,
      transport: http(networkConfig.rpcUrl),
    });

    // 4. Get native token balance
    const balance = await publicClient.getBalance({
      address: wallet.address as Address,
    });

    // 5. Format balance (native tokens use 18 decimals)
    const formattedBalance = formatUnits(balance, 18);

    return {
      walletId: wallet.id,
      address: wallet.address,
      tokenType: networkConfig.nativeToken, // ETH, MATIC, ARB
      tokenAddress: null, // Native token has no contract address
      balance: formattedBalance,
      balanceRaw: balance.toString(),
      blockchain: wallet.blockchain,
      network: wallet.network,
    };
  }

  /**
   * Send native token (ETH/MATIC/ARB) to an address
   *
   * @param params - Transaction parameters
   * @returns Transaction details
   */
  async sendNativeToken(params: {
    userId: string;
    walletId: string;
    destinationAddress: string;
    amount: string; // Amount in native token units (e.g., "0.1" for 0.1 ETH)
  }) {
    const { userId, walletId, destinationAddress, amount } = params;

    this.logger.log(
      `Sending ${amount} native token from wallet ${walletId} to ${destinationAddress}`,
    );

    // 1. Get wallet and verify ownership
    const wallet = await this.walletService.getWallet(walletId, userId);

    // 2. Validate destination address
    if (!destinationAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid destination address format');
    }

    // 3. Get network configuration
    const networkConfig = this.configService.getNetworkConfig(
      wallet.blockchain,
      wallet.network,
    );

    // 4. Get decrypted private key
    const privateKey = await this.walletService.getDecryptedPrivateKey(
      walletId,
      userId,
    );

    // 5. Create transaction reference
    const reference = `ALY-NATIVE-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // 6. Create database transaction record (PENDING state)
    const txRecord = await this.prisma.alchemyTransaction.create({
      data: {
        reference,
        userId,
        walletId,
        type: AlchemyTransactionType.SEND,
        state: AlchemyTransactionState.PENDING,
        sourceAddress: wallet.address,
        destinationAddress: destinationAddress.toLowerCase(),
        tokenAddress: null, // Native token has no contract address
        blockchain: wallet.blockchain,
        network: wallet.network,
        amount: parseUnits(amount, 18).toString(), // Native tokens use 18 decimals
        amountFormatted: `${amount} ${networkConfig.nativeToken}`,
      },
    });

    try {
      // 7. Create viem clients
      const chain = this.getChainConfig(networkConfig.chainId);
      const account = privateKeyToAccount(privateKey as `0x${string}`);

      const publicClient = createPublicClient({
        chain,
        transport: http(networkConfig.rpcUrl),
      });

      const walletClient = createWalletClient({
        account,
        chain,
        transport: http(networkConfig.rpcUrl),
      });

      // 8. Prepare transaction
      const amountInWei = parseUnits(amount, 18);

      // 9. Send native token transaction
      this.logger.debug(
        `Submitting native token transaction to blockchain for ${reference}`,
      );

      const hash = await walletClient.sendTransaction({
        to: destinationAddress as Address,
        value: amountInWei,
      });

      this.logger.log(`Native token transaction submitted: ${hash}`);

      // 10. Update transaction record with hash
      await this.prisma.alchemyTransaction.update({
        where: { id: txRecord.id },
        data: {
          transactionHash: hash,
          state: AlchemyTransactionState.SUBMITTED,
        },
      });

      // 11. Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
      });

      this.logger.log(
        `Native token transaction confirmed in block ${receipt.blockNumber}: ${hash}`,
      );

      // 12. Update transaction record with confirmation
      const finalTx = await this.prisma.alchemyTransaction.update({
        where: { id: txRecord.id },
        data: {
          state:
            receipt.status === 'success'
              ? AlchemyTransactionState.COMPLETED
              : AlchemyTransactionState.FAILED,
          blockNumber: receipt.blockNumber,
          blockHash: receipt.blockHash,
          gasUsed: receipt.gasUsed.toString(),
          confirmations: 1,
          completedAt: receipt.status === 'success' ? new Date() : undefined,
          failedAt: receipt.status === 'success' ? undefined : new Date(),
          errorMessage:
            receipt.status === 'success' ? undefined : 'Transaction reverted',
        },
      });

      return {
        id: finalTx.id,
        reference: finalTx.reference,
        transactionHash: finalTx.transactionHash,
        state: finalTx.state,
        amount: finalTx.amountFormatted,
        destinationAddress: finalTx.destinationAddress,
        blockNumber: finalTx.blockNumber?.toString(),
        completedAt: finalTx.completedAt,
      };
    } catch (error) {
      // Update transaction as failed
      await this.prisma.alchemyTransaction.update({
        where: { id: txRecord.id },
        data: {
          state: AlchemyTransactionState.FAILED,
          errorMessage: error.message,
          failedAt: new Date(),
        },
      });

      this.logger.error(
        `Native token transaction failed for ${reference}: ${error.message}`,
        error.stack,
      );

      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  /**
   * Get gas price for a network
   *
   * @param params - Gas price query parameters
   * @returns Gas price information
   */
  async getGasPrice(params: { blockchain: string; network: string }) {
    const { blockchain, network } = params;

    // 1. Get network configuration
    const networkConfig = this.configService.getNetworkConfig(
      blockchain,
      network,
    );

    // 2. Create public client
    const chain = this.getChainConfig(networkConfig.chainId);
    const publicClient = createPublicClient({
      chain,
      transport: http(networkConfig.rpcUrl),
    });

    // 3. Get gas price (or use fee data for EIP-1559)
    const feeData = await publicClient.estimateFeesPerGas();

    // 4. Format gas prices (values are already bigint from estimateFeesPerGas)
    return {
      blockchain,
      network,
      gasPrice: feeData.gasPrice
        ? formatUnits(feeData.gasPrice, 9) // 9 decimals for gwei
        : null,
      maxFeePerGas: feeData.maxFeePerGas
        ? formatUnits(feeData.maxFeePerGas, 9) // 9 decimals for gwei
        : null,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
        ? formatUnits(feeData.maxPriorityFeePerGas, 9) // 9 decimals for gwei
        : null,
      nativeToken: networkConfig.nativeToken,
    };
  }

  /**
   * Get chain configuration for viem
   * @private
   */
  private getChainConfig(chainId: number) {
    // Simplified chain configs - viem will handle the rest
    return {
      id: chainId,
      name: `Chain ${chainId}`,
      nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
      rpcUrls: {
        default: { http: [''] }, // Will be overridden by transport
        public: { http: [''] },
      },
    } as const;
  }
}
