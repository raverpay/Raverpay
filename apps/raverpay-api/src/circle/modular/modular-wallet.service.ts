import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

/**
 * Modular Wallet Service
 * Handles Circle Modular Wallets (Smart Accounts with Passkey authentication)
 * 
 * Note: This service provides backend support for modular wallets.
 * The actual passkey registration/login and transaction signing happens
 * client-side using the Circle SDK in the mobile/web app.
 */
@Injectable()
export class ModularWalletService {
  private readonly logger = new Logger(ModularWalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Save passkey credential to database after successful registration
   */
  async savePasskeyCredential(params: {
    userId: string;
    credentialId: string;
    publicKey: string;
    rpId?: string;
    username?: string;
  }) {
    this.logger.log(`Saving passkey credential for user ${params.userId}`);

    const credential = await this.prisma.passkeyCredential.create({
      data: {
        userId: params.userId,
        credentialId: params.credentialId,
        publicKey: params.publicKey,
        rpId: params.rpId,
        username: params.username,
      },
    });

    return credential;
  }

  /**
   * Get user's passkey credentials
   */
  async getUserPasskeys(userId: string) {
    return this.prisma.passkeyCredential.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update passkey last used timestamp
   */
  async updatePasskeyLastUsed(credentialId: string) {
    return this.prisma.passkeyCredential.update({
      where: { credentialId },
      data: { lastUsedAt: new Date() },
    });
  }

  /**
   * Save modular wallet to database after creation
   */
  async saveModularWallet(params: {
    userId: string;
    circleWalletId: string;
    address: string;
    blockchain: string;
    name?: string;
  }) {
    this.logger.log(
      `Saving modular wallet ${params.address} for user ${params.userId}`,
    );

    const wallet = await this.prisma.circleModularWallet.create({
      data: {
        userId: params.userId,
        circleWalletId: params.circleWalletId,
        address: params.address,
        blockchain: params.blockchain,
        name: params.name,
        state: 'LIVE',
      },
    });

    return wallet;
  }

  /**
   * Get user's modular wallets
   */
  async getUserWallets(userId: string) {
    return this.prisma.circleModularWallet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get modular wallet by ID
   */
  async getWallet(walletId: string, userId: string) {
    const wallet = await this.prisma.circleModularWallet.findFirst({
      where: {
        id: walletId,
        userId,
      },
    });

    if (!wallet) {
      throw new Error('Modular wallet not found');
    }

    return wallet;
  }

  /**
   * Get modular wallet by address
   */
  async getWalletByAddress(address: string) {
    return this.prisma.circleModularWallet.findFirst({
      where: { address },
    });
  }

  /**
   * Update modular wallet
   */
  async updateWallet(
    walletId: string,
    userId: string,
    data: { name?: string; state?: string },
  ) {
    return this.prisma.circleModularWallet.update({
      where: {
        id: walletId,
        userId,
      },
      data,
    });
  }

  /**
   * Delete passkey credential
   */
  async deletePasskey(credentialId: string, userId: string) {
    return this.prisma.passkeyCredential.delete({
      where: {
        credentialId,
        userId,
      },
    });
  }
}
