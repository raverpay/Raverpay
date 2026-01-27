import { Injectable, Logger } from '@nestjs/common';
import {
  generatePrivateKey,
  privateKeyToAccount,
  generateMnemonic,
  mnemonicToAccount,
  english,
} from 'viem/accounts';
import { AlchemyKeyEncryptionService } from '../encryption/alchemy-key-encryption.service';
import { AlchemyConfigService } from '../config/alchemy-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AlchemyAccountType, AlchemyWalletState } from '@prisma/client';

/**
 * Alchemy Wallet Generation Service
 *
 * Generates and manages Alchemy wallets for users
 * - EOA (Externally Owned Account) wallet generation
 * - Private key encryption and secure storage
 * - Wallet retrieval and management
 *
 * Security Notes:
 * - Private keys are NEVER exposed in API responses
 * - Private keys are encrypted before storage
 * - Decryption is only done internally for transaction signing
 * - All key access is audit logged
 */
@Injectable()
export class AlchemyWalletGenerationService {
  private readonly logger = new Logger(AlchemyWalletGenerationService.name);

  constructor(
    private readonly encryptionService: AlchemyKeyEncryptionService,
    private readonly configService: AlchemyConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.logger.log('Alchemy wallet generation service initialized');
  }

  /**
   * Generate a new EOA (Externally Owned Account) wallet for a user
   *
   * Flow:
   * 1. Generate random private key
   * 2. Derive public address from private key
   * 3. Encrypt private key
   * 4. Store in database
   *
   * @param userId - User ID who owns this wallet
   * @param blockchain - Blockchain name (POLYGON, ARBITRUM, BASE)
   * @param network - Network name (mainnet, sepolia, amoy)
   * @param name - Optional wallet name
   * @returns Created wallet info (without private key!)
   */
  async generateEOAWallet(params: {
    userId: string;
    blockchain: string;
    network: string;
    name?: string;
  }) {
    const { userId, blockchain, network, name } = params;

    this.logger.log(
      `Generating EOA wallet for user ${userId} on ${blockchain}-${network}`,
    );

    // 1. Validate network is supported
    if (!this.configService.isValidNetwork(blockchain, network)) {
      throw new Error(
        `Invalid network: ${blockchain}-${network}. Please use a supported network.`,
      );
    }

    // 2. Check if user already has a wallet on this network
    const existingWallet = await this.prisma.alchemyWallet.findUnique({
      where: {
        userId_blockchain_network: {
          userId,
          blockchain,
          network,
        },
      },
    });

    if (existingWallet) {
      throw new Error(
        `User already has a wallet on ${blockchain}-${network}. Wallet ID: ${existingWallet.id}`,
      );
    }

    // 3. Generate BIP-39 mnemonic (12-word seed phrase)
    const mnemonic = generateMnemonic(english);

    // 4. Derive account from mnemonic
    const account = mnemonicToAccount(mnemonic);
    const address = account.address;

    // 5. Extract private key from HD key
    const hdKey = account.getHdKey();
    const privateKeyBuffer = hdKey.privateKey;
    if (!privateKeyBuffer) {
      throw new Error('Failed to derive private key from mnemonic');
    }
    const privateKey = `0x${Buffer.from(privateKeyBuffer).toString('hex')}`;

    this.logger.debug(
      `Generated EOA with address: ${address} for user ${userId}`,
    );

    // 5. Encrypt private key and mnemonic before storing
    const encryptedPrivateKey = this.encryptionService.encryptPrivateKey(
      privateKey,
      userId,
    );

    const encryptedMnemonic = this.encryptionService.encryptMnemonic(
      mnemonic,
      userId,
    );

    // 6. Store wallet in database
    const wallet = await this.prisma.alchemyWallet.create({
      data: {
        userId,
        address: address.toLowerCase(), // Normalize to lowercase
        encryptedPrivateKey,
        encryptedMnemonic,
        blockchain,
        network,
        accountType: AlchemyAccountType.EOA,
        state: AlchemyWalletState.ACTIVE,
        name: name || `${blockchain} ${network} Wallet`,
        isGasSponsored: false, // EOA wallets don't get gas sponsorship
      },
    });

    this.logger.log(
      `Created Alchemy EOA wallet ${wallet.id} for user ${userId}`,
    );

    // 7. Return wallet info (WITHOUT private key or mnemonic!)
    return {
      id: wallet.id,
      address: wallet.address,
      blockchain: wallet.blockchain,
      network: wallet.network,
      accountType: wallet.accountType,
      name: wallet.name,
      isGasSponsored: wallet.isGasSponsored,
      hasSeedPhrase: true, // Always true for newly created wallets
      createdAt: wallet.createdAt,
    };
  }

  /**
   * Get wallet by ID
   * @param walletId - Wallet ID
   * @param userId - User ID (for ownership verification)
   * @returns Wallet info (without private key)
   */
  async getWallet(walletId: string, userId: string) {
    const wallet = await this.prisma.alchemyWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Verify ownership
    if (wallet.userId !== userId) {
      this.logger.warn(
        `Access denied: User ${userId} attempted to access wallet ${walletId} owned by ${wallet.userId}`,
      );
      throw new Error('Access denied: You do not own this wallet');
    }

    // Return without private key
    return {
      id: wallet.id,
      address: wallet.address,
      blockchain: wallet.blockchain,
      network: wallet.network,
      accountType: wallet.accountType,
      state: wallet.state,
      name: wallet.name,
      isGasSponsored: wallet.isGasSponsored,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  /**
   * Get all wallets for a user
   * @param userId - User ID
   * @returns List of wallets (without private keys)
   */
  async getUserWallets(userId: string) {
    const wallets = await this.prisma.alchemyWallet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Return without private keys or mnemonics (security)
    return wallets.map((wallet) => ({
      id: wallet.id,
      address: wallet.address,
      blockchain: wallet.blockchain,
      network: wallet.network,
      accountType: wallet.accountType,
      state: wallet.state,
      name: wallet.name,
      isGasSponsored: wallet.isGasSponsored,
      hasSeedPhrase: !!wallet.encryptedMnemonic, // Boolean flag only
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    }));
  }

  /**
   * Get wallet by blockchain and network
   * @param userId - User ID
   * @param blockchain - Blockchain name
   * @param network - Network name
   * @returns Wallet info (without private key) or null
   */
  async getWalletByNetwork(
    userId: string,
    blockchain: string,
    network: string,
  ) {
    const wallet = await this.prisma.alchemyWallet.findUnique({
      where: {
        userId_blockchain_network: {
          userId,
          blockchain,
          network,
        },
      },
    });

    if (!wallet) {
      return null;
    }

    // Return without private key or mnemonic (security)
    return {
      id: wallet.id,
      address: wallet.address,
      blockchain: wallet.blockchain,
      network: wallet.network,
      accountType: wallet.accountType,
      state: wallet.state,
      name: wallet.name,
      isGasSponsored: wallet.isGasSponsored,
      hasSeedPhrase: !!wallet.encryptedMnemonic, // Boolean flag only
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  /**
   * Export seed phrase (requires PIN verification in controller)
   * @param walletId - Wallet ID
   * @param userId - User ID (for ownership verification)
   * @returns Decrypted mnemonic (12-word phrase)
   */
  async exportSeedPhrase(walletId: string, userId: string): Promise<string> {
    // 1. Verify wallet ownership (use existing getWallet method)
    const wallet = await this.prisma.alchemyWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Verify ownership
    if (wallet.userId !== userId) {
      this.logger.warn(
        `Access denied: User ${userId} attempted to export seed phrase for wallet ${walletId} owned by ${wallet.userId}`,
      );
      throw new Error('Access denied: You do not own this wallet');
    }

    // 2. Check wallet type (EOA only)
    if (wallet.accountType !== AlchemyAccountType.EOA) {
      throw new Error('Seed phrase export only available for EOA wallets');
    }

    // 3. Check if mnemonic exists
    if (!wallet.encryptedMnemonic) {
      throw new Error('Seed phrase not available for this wallet');
    }

    // 4. Decrypt mnemonic
    const mnemonic = this.encryptionService.decryptMnemonic(
      wallet.encryptedMnemonic,
      userId,
    );

    // 5. Audit log (security event)
    this.logger.warn(
      `⚠️ SEED PHRASE EXPORT: User ${userId} exported seed phrase for wallet ${walletId}`,
    );

    return mnemonic;
  }

  /**
   * Import existing wallet via seed phrase or private key
   * @param params - Import parameters
   * @returns Created wallet info (without private key or mnemonic)
   */
  async importWallet(params: {
    userId: string;
    method: 'SEED_PHRASE' | 'PRIVATE_KEY';
    seedPhrase?: string;
    privateKey?: string;
    blockchain: string;
    network: string;
    name?: string;
  }) {
    const {
      userId,
      method,
      seedPhrase,
      privateKey,
      blockchain,
      network,
      name,
    } = params;

    this.logger.log(
      `Importing wallet for user ${userId} via ${method} on ${blockchain}-${network}`,
    );

    // 1. Validate network
    if (!this.configService.isValidNetwork(blockchain, network)) {
      throw new Error(`Invalid network: ${blockchain}-${network}`);
    }

    // 2. Check for existing wallet
    const existingWallet = await this.prisma.alchemyWallet.findUnique({
      where: {
        userId_blockchain_network: { userId, blockchain, network },
      },
    });

    if (existingWallet) {
      throw new Error(
        `Wallet already exists on ${blockchain}-${network}. Wallet ID: ${existingWallet.id}`,
      );
    }

    let derivedPrivateKey: string;
    let derivedMnemonic: string | undefined;
    let address: string;

    // 3. Derive private key and address based on method
    if (method === 'SEED_PHRASE') {
      if (!seedPhrase) {
        throw new Error('Seed phrase is required');
      }

      // Validate seed phrase format (12 words)
      const words = seedPhrase.trim().split(/\s+/);
      if (words.length !== 12) {
        throw new Error('Seed phrase must be 12 words');
      }

      // Validate mnemonic by attempting to derive account
      // mnemonicToAccount will throw if mnemonic is invalid
      let account;
      try {
        account = mnemonicToAccount(seedPhrase);
      } catch (error) {
        throw new Error(
          'Invalid seed phrase. Please check your words and try again.',
        );
      }
      address = account.address;

      // Extract private key from HD key
      const hdKey = account.getHdKey();
      const privateKeyBuffer = hdKey.privateKey;
      if (!privateKeyBuffer) {
        throw new Error('Failed to derive private key from seed phrase');
      }
      derivedPrivateKey = `0x${Buffer.from(privateKeyBuffer).toString('hex')}`;
      derivedMnemonic = seedPhrase; // Store original mnemonic
    } else {
      // PRIVATE_KEY method
      if (!privateKey) {
        throw new Error('Private key is required');
      }

      // Validate private key format
      if (!privateKey.match(/^0x[a-fA-F0-9]{64}$/)) {
        throw new Error('Invalid private key format');
      }

      const account = privateKeyToAccount(privateKey as `0x${string}`);
      address = account.address;
      derivedPrivateKey = privateKey;
      // No mnemonic for private key imports
    }

    // 4. Check if address already exists (different user)
    const existingAddress = await this.prisma.alchemyWallet.findUnique({
      where: { address: address.toLowerCase() },
    });

    if (existingAddress) {
      throw new Error('Wallet address already exists in system');
    }

    // 5. Encrypt private key and mnemonic
    const encryptedPrivateKey = this.encryptionService.encryptPrivateKey(
      derivedPrivateKey,
      userId,
    );

    const encryptedMnemonic = derivedMnemonic
      ? this.encryptionService.encryptMnemonic(derivedMnemonic, userId)
      : null;

    // 6. Create wallet
    const wallet = await this.prisma.alchemyWallet.create({
      data: {
        userId,
        address: address.toLowerCase(),
        encryptedPrivateKey,
        encryptedMnemonic,
        blockchain,
        network,
        accountType: AlchemyAccountType.EOA,
        state: AlchemyWalletState.ACTIVE,
        name: name || `Imported ${blockchain} ${network} Wallet`,
        isGasSponsored: false,
      },
    });

    this.logger.log(`Imported wallet ${wallet.id} for user ${userId}`);

    return {
      id: wallet.id,
      address: wallet.address,
      blockchain: wallet.blockchain,
      network: wallet.network,
      accountType: wallet.accountType,
      name: wallet.name,
      isGasSponsored: wallet.isGasSponsored,
      hasSeedPhrase: !!wallet.encryptedMnemonic,
      createdAt: wallet.createdAt,
    };
  }

  /**
   * Get decrypted private key for internal use ONLY
   *
   * ⚠️ SECURITY WARNING:
   * - This method should ONLY be called by transaction signing services
   * - NEVER expose the result in API responses
   * - NEVER log the private key
   * - Access is audit logged
   *
   * @param walletId - Wallet ID
   * @param userId - User ID (for ownership verification)
   * @returns Decrypted private key
   * @internal
   */
  async getDecryptedPrivateKey(
    walletId: string,
    userId: string,
  ): Promise<string> {
    // Audit log before decryption
    this.logger.warn(
      `⚠️ PRIVATE KEY ACCESS: User ${userId} decrypting wallet ${walletId}`,
    );

    const wallet = await this.prisma.alchemyWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Verify ownership
    if (wallet.userId !== userId) {
      this.logger.error(
        `🚨 SECURITY ALERT: User ${userId} attempted to decrypt wallet ${walletId} owned by ${wallet.userId}`,
      );
      throw new Error('Access denied: You do not own this wallet');
    }

    // Check wallet state
    if (wallet.state !== AlchemyWalletState.ACTIVE) {
      throw new Error(
        `Wallet is ${wallet.state}. Only ACTIVE wallets can be used.`,
      );
    }

    // Decrypt private key
    const privateKey = this.encryptionService.decryptPrivateKey(
      wallet.encryptedPrivateKey,
      userId,
    );

    this.logger.debug(
      `Successfully decrypted private key for wallet ${walletId}`,
    );

    return privateKey;
  }

  /**
   * Update wallet name
   * @param walletId - Wallet ID
   * @param userId - User ID (for ownership verification)
   * @param name - New wallet name
   * @returns Updated wallet info
   */
  async updateWalletName(walletId: string, userId: string, name: string) {
    // Verify ownership
    const wallet = await this.getWallet(walletId, userId);

    // Update name
    const updated = await this.prisma.alchemyWallet.update({
      where: { id: walletId },
      data: { name },
    });

    this.logger.log(`Updated wallet ${walletId} name to "${name}"`);

    return {
      id: updated.id,
      address: updated.address,
      blockchain: updated.blockchain,
      network: updated.network,
      accountType: updated.accountType,
      state: updated.state,
      name: updated.name,
      isGasSponsored: updated.isGasSponsored,
      hasSeedPhrase: !!updated.encryptedMnemonic, // Boolean flag only
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Deactivate wallet (soft delete)
   * @param walletId - Wallet ID
   * @param userId - User ID (for ownership verification)
   * @returns Updated wallet info
   */
  async deactivateWallet(walletId: string, userId: string) {
    // Verify ownership
    await this.getWallet(walletId, userId);

    // Update state
    const updated = await this.prisma.alchemyWallet.update({
      where: { id: walletId },
      data: { state: AlchemyWalletState.INACTIVE },
    });

    this.logger.log(`Deactivated wallet ${walletId}`);

    return {
      id: updated.id,
      address: updated.address,
      state: updated.state,
    };
  }

  /**
   * Lock wallet (prevents usage, usually for security reasons)
   * @param walletId - Wallet ID
   * @param userId - User ID (for ownership verification)
   * @returns Updated wallet info
   */
  async lockWallet(walletId: string, userId: string) {
    // Verify ownership
    await this.getWallet(walletId, userId);

    // Update state
    const updated = await this.prisma.alchemyWallet.update({
      where: { id: walletId },
      data: { state: AlchemyWalletState.LOCKED },
    });

    this.logger.warn(`🔒 Locked wallet ${walletId}`);

    return {
      id: updated.id,
      address: updated.address,
      state: updated.state,
    };
  }

  /**
   * Mark wallet as compromised (emergency shutdown)
   * @param walletId - Wallet ID
   * @param userId - User ID (for ownership verification)
   * @returns Updated wallet info
   */
  async markWalletCompromised(walletId: string, userId: string) {
    // Verify ownership
    await this.getWallet(walletId, userId);

    // Update state
    const updated = await this.prisma.alchemyWallet.update({
      where: { id: walletId },
      data: { state: AlchemyWalletState.COMPROMISED },
    });

    this.logger.error(
      `🚨 SECURITY ALERT: Wallet ${walletId} marked as COMPROMISED`,
    );

    return {
      id: updated.id,
      address: updated.address,
      state: updated.state,
    };
  }
}
