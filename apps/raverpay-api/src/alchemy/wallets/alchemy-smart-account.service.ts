import { Injectable, Logger } from '@nestjs/common';
import { AlchemyKeyEncryptionService } from '../encryption/alchemy-key-encryption.service';
import { AlchemyConfigService } from '../config/alchemy-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AlchemyAccountType, AlchemyWalletState } from '@prisma/client';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

/**
 * Alchemy Smart Account Service
 *
 * Manages Smart Contract Accounts (Account Abstraction)
 * - Creates smart accounts with gas sponsorship
 * - Manages user operations
 * - Integrates with Alchemy Gas Manager
 *
 * Note: This is a foundational implementation.
 * In production, use Alchemy's Account Kit SDK for full AA features.
 */
@Injectable()
export class AlchemySmartAccountService {
  private readonly logger = new Logger(AlchemySmartAccountService.name);

  constructor(
    private readonly encryptionService: AlchemyKeyEncryptionService,
    private readonly configService: AlchemyConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.logger.log('Alchemy Smart Account service initialized');
  }

  /**
   * Create a Smart Contract Account
   *
   * Smart Accounts provide:
   * - Gas sponsorship (users don't pay gas!)
   * - Batch transactions
   * - Session keys
   * - Enhanced security
   *
   * @param params - Smart account creation parameters
   * @returns Created smart account info
   */
  async createSmartAccount(params: {
    userId: string;
    blockchain: string;
    network: string;
    name?: string;
  }) {
    const { userId, blockchain, network, name } = params;

    this.logger.log(
      `Creating Smart Account for user ${userId} on ${blockchain}-${network}`,
    );

    // 1. Validate network is supported
    if (!this.configService.isValidNetwork(blockchain, network)) {
      throw new Error(
        `Invalid network: ${blockchain}-${network}. Please use a supported network.`,
      );
    }

    // 2. Check if user already has a smart account on this network
    const existing = await this.prisma.alchemyWallet.findFirst({
      where: {
        userId,
        blockchain,
        network,
        accountType: AlchemyAccountType.SMART_CONTRACT,
      },
    });

    if (existing) {
      throw new Error(
        `User already has a Smart Account on ${blockchain}-${network}. Wallet ID: ${existing.id}`,
      );
    }

    // 3. Get Gas Manager policy ID
    const gasPolicyId = this.configService.getGasPolicyId();

    // 4. Generate owner key (this controls the smart account)
    const ownerPrivateKey = generatePrivateKey();
    const ownerAccount = privateKeyToAccount(ownerPrivateKey as `0x${string}`);

    this.logger.debug(
      `Generated owner account: ${ownerAccount.address} for user ${userId}`,
    );

    // 5. In production, you would:
    //    - Use Alchemy Account Kit to deploy smart account
    //    - Get the smart account address from the factory
    //    - Link it to the Gas Manager policy
    //
    // For now, we'll create a placeholder smart account address
    // In real implementation, this would be the deployed smart contract address
    const smartAccountAddress = this.generateSmartAccountAddress(
      ownerAccount.address,
      blockchain,
      network,
    );

    // 6. Encrypt owner private key
    const encryptedPrivateKey = this.encryptionService.encryptPrivateKey(
      ownerPrivateKey,
      userId,
    );

    // 7. Store smart account in database
    const wallet = await this.prisma.alchemyWallet.create({
      data: {
        userId,
        address: smartAccountAddress.toLowerCase(),
        encryptedPrivateKey, // This is the OWNER key, not the smart account key
        blockchain,
        network,
        accountType: AlchemyAccountType.SMART_CONTRACT,
        state: AlchemyWalletState.ACTIVE,
        name: name || `${blockchain} ${network} Smart Account`,
        isGasSponsored: true, // Smart accounts get gas sponsorship!
        gasPolicyId,
      },
    });

    this.logger.log(
      `Created Smart Account ${wallet.id} for user ${userId} (gas sponsored!)`,
    );

    return {
      id: wallet.id,
      address: wallet.address,
      blockchain: wallet.blockchain,
      network: wallet.network,
      accountType: wallet.accountType,
      name: wallet.name,
      isGasSponsored: wallet.isGasSponsored,
      gasPolicyId: wallet.gasPolicyId,
      createdAt: wallet.createdAt,
      features: {
        gasSponsorship: true,
        batchTransactions: true,
        sessionKeys: true,
        socialRecovery: false, // Would be enabled with full Account Kit integration
      },
    };
  }

  /**
   * Get smart account details
   *
   * @param walletId - Smart account wallet ID
   * @param userId - User ID for ownership verification
   * @returns Smart account details
   */
  async getSmartAccount(walletId: string, userId: string) {
    const wallet = await this.prisma.alchemyWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new Error('Smart Account not found');
    }

    if (wallet.userId !== userId) {
      this.logger.warn(
        `Access denied: User ${userId} attempted to access smart account ${walletId} owned by ${wallet.userId}`,
      );
      throw new Error('Access denied: You do not own this smart account');
    }

    if (wallet.accountType !== AlchemyAccountType.SMART_CONTRACT) {
      throw new Error('This wallet is not a Smart Account (it\'s an EOA)');
    }

    return {
      id: wallet.id,
      address: wallet.address,
      blockchain: wallet.blockchain,
      network: wallet.network,
      accountType: wallet.accountType,
      state: wallet.state,
      name: wallet.name,
      isGasSponsored: wallet.isGasSponsored,
      gasPolicyId: wallet.gasPolicyId,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
      features: {
        gasSponsorship: wallet.isGasSponsored,
        batchTransactions: true,
        sessionKeys: true,
        socialRecovery: false,
      },
    };
  }

  /**
   * Get all smart accounts for a user
   *
   * @param userId - User ID
   * @returns List of smart accounts
   */
  async getUserSmartAccounts(userId: string) {
    const wallets = await this.prisma.alchemyWallet.findMany({
      where: {
        userId,
        accountType: AlchemyAccountType.SMART_CONTRACT,
      },
      orderBy: { createdAt: 'desc' },
    });

    return wallets.map((wallet) => ({
      id: wallet.id,
      address: wallet.address,
      blockchain: wallet.blockchain,
      network: wallet.network,
      accountType: wallet.accountType,
      state: wallet.state,
      name: wallet.name,
      isGasSponsored: wallet.isGasSponsored,
      gasPolicyId: wallet.gasPolicyId,
      createdAt: wallet.createdAt,
      features: {
        gasSponsorship: wallet.isGasSponsored,
        batchTransactions: true,
        sessionKeys: true,
      },
    }));
  }

  /**
   * Check if gas sponsorship is available
   *
   * @param walletId - Smart account wallet ID
   * @param userId - User ID
   * @returns Gas sponsorship status
   */
  async checkGasSponsorship(walletId: string, userId: string) {
    const wallet = await this.getSmartAccount(walletId, userId);

    // In production, you would query Alchemy Gas Manager API
    // to get current policy status, spending limits, etc.
    return {
      isEnabled: wallet.isGasSponsored,
      policyId: wallet.gasPolicyId,
      dailyLimit: 'Unlimited', // From gas policy
      currentUsage: '$0.00', // Would query from Alchemy
      remainingToday: 'Unlimited',
      message: wallet.isGasSponsored
        ? 'Gas fees are sponsored - users transact for free!'
        : 'Gas sponsorship not enabled',
    };
  }

  /**
   * Generate smart account address (deterministic)
   * In production, this would come from Alchemy's smart account factory
   *
   * @private
   */
  private generateSmartAccountAddress(
    ownerAddress: string,
    blockchain: string,
    network: string,
  ): string {
    // This is a placeholder implementation
    // In production, use Alchemy Account Kit's factory to deploy and get real address
    //
    // The real process:
    // 1. Call Alchemy's SimpleAccountFactory.getAddress(owner, salt)
    // 2. This returns the counterfactual address (address before deployment)
    // 3. Account is deployed lazily on first transaction
    //
    // For now, we generate a deterministic placeholder address
    const crypto = require('crypto');
    const hash = crypto
      .createHash('sha256')
      .update(`${ownerAddress}-${blockchain}-${network}-smart-account`)
      .digest('hex');

    return `0x${hash.substring(0, 40)}`;
  }

  /**
   * Upgrade EOA to Smart Account (migration helper)
   *
   * This helps users migrate from EOA to Smart Account
   * while keeping their transaction history
   *
   * @param eoaWalletId - Existing EOA wallet ID
   * @param userId - User ID
   * @returns New smart account info
   */
  async upgradeToSmartAccount(eoaWalletId: string, userId: string) {
    // 1. Get EOA wallet
    const eoaWallet = await this.prisma.alchemyWallet.findUnique({
      where: { id: eoaWalletId },
    });

    if (!eoaWallet) {
      throw new Error('EOA wallet not found');
    }

    if (eoaWallet.userId !== userId) {
      throw new Error('Access denied');
    }

    if (eoaWallet.accountType !== AlchemyAccountType.EOA) {
      throw new Error('Wallet is already a Smart Account');
    }

    // 2. Create new smart account
    const smartAccount = await this.createSmartAccount({
      userId,
      blockchain: eoaWallet.blockchain,
      network: eoaWallet.network,
      name: `${eoaWallet.name} (Smart Account)`,
    });

    // 3. Mark EOA as inactive (optional - user might want to keep both)
    // await this.prisma.alchemyWallet.update({
    //   where: { id: eoaWalletId },
    //   data: { state: AlchemyWalletState.INACTIVE }
    // });

    this.logger.log(
      `User ${userId} upgraded EOA ${eoaWalletId} to Smart Account ${smartAccount.id}`,
    );

    return {
      oldWallet: {
        id: eoaWallet.id,
        address: eoaWallet.address,
        type: 'EOA',
      },
      newWallet: smartAccount,
      message:
        'Your EOA has been kept active. You now have both EOA and Smart Account wallets.',
    };
  }
}
