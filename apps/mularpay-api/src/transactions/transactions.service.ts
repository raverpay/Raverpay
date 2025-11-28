import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from '../payments/paystack.service';
import { UsersService } from '../users/users.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
import { TransactionType, TransactionStatus, KYCTier } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  FeeCalculation,
  TransactionLimits,
  InitializePaymentResponse,
  VerifyPaymentResponse,
  WithdrawalResponse,
  ResolveAccountResponse,
  BankInfo,
  VirtualAccountResponse,
} from './transactions.types';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private prisma: PrismaService,
    private paystackService: PaystackService,
    private usersService: UsersService,
    @Inject(forwardRef(() => WalletService))
    private walletService: WalletService,
    private notificationDispatcher: NotificationDispatcherService,
  ) {}

  /**
   * Generate unique transaction reference
   */
  private generateReference(type: 'deposit' | 'withdrawal'): string {
    const prefix = type === 'deposit' ? 'DEP' : 'WD';
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `TXN_${prefix}_${timestamp}${random}`;
  }

  /**
   * Get withdrawal configuration from database
   * Falls back to default hardcoded config if database config not found
   */
  private async getWithdrawalConfig(kycTier?: KYCTier): Promise<{
    feeType: string;
    feeValue: number;
    minFee: number;
    maxFee: number | null;
    minWithdrawal: number;
    maxWithdrawal: number;
  }> {
    // Try to get tier-specific config first
    if (kycTier) {
      const tierConfig = await this.prisma.withdrawalConfig.findUnique({
        where: { tierLevel: kycTier },
      });
      if (tierConfig && tierConfig.isActive) {
        return {
          feeType: tierConfig.feeType,
          feeValue: Number(tierConfig.feeValue),
          minFee: Number(tierConfig.minFee),
          maxFee: tierConfig.maxFee ? Number(tierConfig.maxFee) : null,
          minWithdrawal: Number(tierConfig.minWithdrawal),
          maxWithdrawal: Number(tierConfig.maxWithdrawal),
        };
      }
    }

    // Fall back to global config (tierLevel = null)
    const globalConfig = await this.prisma.withdrawalConfig.findFirst({
      where: { tierLevel: null, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (globalConfig) {
      return {
        feeType: globalConfig.feeType,
        feeValue: Number(globalConfig.feeValue),
        minFee: Number(globalConfig.minFee),
        maxFee: globalConfig.maxFee ? Number(globalConfig.maxFee) : null,
        minWithdrawal: Number(globalConfig.minWithdrawal),
        maxWithdrawal: Number(globalConfig.maxWithdrawal),
      };
    }

    // If no config in database, use hardcoded defaults
    return {
      feeType: 'PERCENTAGE',
      feeValue: 1.5,
      minFee: 50,
      maxFee: 500,
      minWithdrawal: 100,
      maxWithdrawal: 50000,
    };
  }

  /**
   * Calculate withdrawal fee based on database configuration
   */
  private async calculateWithdrawalFee(
    amount: number,
    kycTier?: KYCTier,
  ): Promise<number> {
    const config = await this.getWithdrawalConfig(kycTier);

    let fee = 0;

    if (config.feeType === 'FLAT') {
      // Fixed fee
      fee = config.feeValue;
    } else {
      // Percentage fee
      fee = (amount * config.feeValue) / 100;
    }

    // Apply minimum fee
    if (fee < config.minFee) {
      fee = config.minFee;
    }

    // Apply maximum fee cap if set
    if (config.maxFee !== null && fee > config.maxFee) {
      fee = config.maxFee;
    }

    return fee;
  }

  /**
   * Calculate transaction fee
   */
  private async calculateFee(
    amount: number,
    type: 'deposit' | 'withdrawal',
    kycTier?: KYCTier,
  ): Promise<FeeCalculation> {
    let fee = 0;

    if (type === 'deposit') {
      // Paystack card funding fees:
      // - Under ₦2,500: Only 1.5% (₦100 flat fee waived)
      // - ₦2,500+: 1.5% + ₦100
      // - All fees capped at ₦2,000
      if (amount < 2500) {
        // ₦100 fee waived, only charge 1.5%
        fee = amount * 0.015;
      } else {
        // Full fee: 1.5% + ₦100
        const paystackFee = amount * 0.015 + 100;
        // Cap at ₦2,000
        fee = Math.min(paystackFee, 2000);
      }
    } else {
      // Withdrawal fees from database configuration
      fee = await this.calculateWithdrawalFee(amount, kycTier);
    }

    // For deposits: user pays (amount + fee), receives (amount)
    // For withdrawals: user receives (amount), we deduct (amount + fee) from wallet
    const netAmount = amount;
    const totalAmount = amount + fee;

    return {
      amount,
      fee,
      netAmount,
      totalAmount,
    };
  }

  /**
   * Get transaction limits based on KYC tier
   */
  private getTransactionLimits(kycTier: KYCTier): TransactionLimits {
    const limits: Record<KYCTier, TransactionLimits> = {
      TIER_0: {
        minDeposit: 100,
        maxDeposit: 10000,
        minWithdrawal: 100,
        maxWithdrawal: 5000,
      },
      TIER_1: {
        minDeposit: 100,
        maxDeposit: 100000,
        minWithdrawal: 100,
        maxWithdrawal: 50000,
      },
      TIER_2: {
        minDeposit: 100,
        maxDeposit: 1000000,
        minWithdrawal: 100,
        maxWithdrawal: 500000,
      },
      TIER_3: {
        minDeposit: 100,
        maxDeposit: Number.MAX_SAFE_INTEGER,
        minWithdrawal: 100,
        maxWithdrawal: Number.MAX_SAFE_INTEGER,
      },
    };

    return limits[kycTier];
  }

  /**
   * Initialize card payment
   */
  async initializeCardPayment(
    userId: string,
    amount: number,
    callbackUrl?: string,
  ): Promise<InitializePaymentResponse> {
    // Get user and wallet
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallets: { where: { type: 'NAIRA' } } },
    });

    const nairaWallet = user?.wallets?.[0];
    if (!user || !nairaWallet) {
      throw new NotFoundException('User or wallet not found');
    }

    // Check if wallet is locked
    if (nairaWallet.isLocked) {
      throw new ForbiddenException('Wallet is locked');
    }

    // Get limits
    const limits = this.getTransactionLimits(user.kycTier);

    // Validate amount
    if (amount < limits.minDeposit || amount > limits.maxDeposit) {
      throw new BadRequestException(
        `Amount must be between ₦${limits.minDeposit.toLocaleString()} and ₦${limits.maxDeposit.toLocaleString()}`,
      );
    }

    // Generate reference
    const reference = this.generateReference('deposit');

    // Calculate fee (Paystack charges us, we pass to customer)
    const feeCalc = await this.calculateFee(amount, 'deposit');

    // Total amount customer will pay = desired amount + fee
    const totalToCharge = amount + feeCalc.fee;

    // Create pending transaction
    await this.prisma.transaction.create({
      data: {
        reference,
        userId: user.id,
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PENDING,
        amount: new Decimal(amount), // Amount user wants in wallet
        fee: new Decimal(feeCalc.fee), // Paystack fee
        totalAmount: new Decimal(totalToCharge), // Total charged to customer
        balanceBefore: nairaWallet.balance,
        balanceAfter: nairaWallet.balance,
        currency: 'NGN',
        description: `Card deposit of ₦${amount.toLocaleString()} (₦${feeCalc.fee.toLocaleString()} fee)`,
        metadata: {
          paymentMethod: 'card',
          provider: 'paystack',
          requestedAmount: amount,
          processingFee: feeCalc.fee,
        },
      },
    });

    // Initialize Paystack payment with TOTAL amount (amount + fee)
    // Customer pays: amount + fee
    // Paystack deducts their fee from this total
    // We receive: amount (which we credit to wallet)
    const payment = await this.paystackService.initializePayment(
      user.email,
      totalToCharge, // Changed from 'amount' to 'totalToCharge'
      reference,
      callbackUrl,
    );

    return {
      reference,
      authorizationUrl: payment.authorization_url,
      accessCode: payment.access_code,
    };
  }

  /**
   * Verify payment and credit wallet
   */
  async verifyPayment(
    userId: string,
    reference: string,
  ): Promise<VerifyPaymentResponse> {
    // Get transaction
    const transaction = await this.prisma.transaction.findUnique({
      where: { reference },
      include: { user: { include: { wallets: { where: { type: 'NAIRA' } } } } },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Verify user owns this transaction
    if (transaction.userId !== userId) {
      throw new ForbiddenException('Unauthorized');
    }

    // If already completed, return status
    if (transaction.status === TransactionStatus.COMPLETED) {
      return {
        status: 'success',
        reference: transaction.reference,
        amount: transaction.amount.toString(),
        fee: transaction.fee.toString(),
        netAmount: transaction.amount.toString(),
        transactionStatus: transaction.status,
        paidAt: transaction.completedAt ?? undefined,
      };
    }

    // Verify with Paystack
    const payment = await this.paystackService.verifyPayment(reference);

    if (payment.status !== 'success') {
      // Update transaction as failed
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          failedAt: new Date(),
          metadata: {
            ...(transaction.metadata as object),
            paystackStatus: payment.status,
          },
        },
      });

      return {
        status: 'failed',
        reference: transaction.reference,
        amount: transaction.amount.toString(),
        fee: transaction.fee.toString(),
        netAmount: transaction.amount.toString(),
        transactionStatus: TransactionStatus.FAILED,
      };
    }

    // Credit wallet and complete transaction atomically
    const wallet = transaction.user.wallets?.[0];
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const newBalance = wallet.balance.plus(transaction.amount);

    await this.prisma.$transaction([
      // Update wallet balance
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: newBalance,
          ledgerBalance: newBalance,
        },
      }),
      // Update transaction
      this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.COMPLETED,
          balanceAfter: newBalance,
          completedAt: new Date(),
          providerStatus: payment.status,
          metadata: {
            ...(transaction.metadata as object),
            paystackResponse: {
              amount: payment.amount,
              fees: payment.fees,
              channel: payment.channel,
              paid_at: payment.paid_at,
            },
          },
        },
      }),
    ]);

    // Invalidate wallet and transaction caches
    await this.walletService.invalidateWalletCache(userId);
    await this.walletService.invalidateTransactionCache(userId);

    return {
      status: 'success',
      reference: transaction.reference,
      amount: transaction.amount.toString(),
      fee: transaction.fee.toString(),
      netAmount: transaction.amount.toString(),
      transactionStatus: TransactionStatus.COMPLETED,
      gateway: 'paystack',
      paidAt: new Date(payment.paid_at),
    };
  }

  /**
   * Get user's virtual account
   */
  async getVirtualAccount(userId: string): Promise<VirtualAccountResponse> {
    const virtualAccount = await this.prisma.virtualAccount.findFirst({
      where: { userId, isActive: true },
    });

    if (!virtualAccount) {
      throw new NotFoundException(
        'Virtual account not found. Please contact support.',
      );
    }

    return {
      accountNumber: virtualAccount.accountNumber,
      accountName: virtualAccount.accountName,
      bankName: virtualAccount.bankName,
      bankCode: virtualAccount.bankCode,
      isPermanent: true,
      provider: virtualAccount.provider,
    };
  }

  /**
   * Process virtual account webhook (called by payment webhook)
   */
  async processVirtualAccountCredit(
    reference: string,
    amount: number,
    accountNumber: string,
  ): Promise<void> {
    console.log(
      `🔍 [processVirtualAccountCredit] START - Reference: ${reference}, Amount: ₦${amount}, Account: ${accountNumber}`,
    );

    // Find virtual account
    const virtualAccount = await this.prisma.virtualAccount.findUnique({
      where: { accountNumber },
      include: { user: { include: { wallets: { where: { type: 'NAIRA' } } } } },
    });

    if (!virtualAccount) {
      console.error(
        `❌ [processVirtualAccountCredit] Virtual account not found: ${accountNumber}`,
      );
      throw new NotFoundException('Virtual account not found');
    }

    console.log(
      `✅ [processVirtualAccountCredit] Virtual account found for user: ${virtualAccount.userId}`,
    );

    const user = virtualAccount.user;
    const wallet = user.wallets?.[0];

    if (!wallet) {
      console.error(
        `❌ [processVirtualAccountCredit] Wallet not found for user: ${virtualAccount.userId}`,
      );
      throw new NotFoundException('Wallet not found');
    }

    console.log(
      `✅ [processVirtualAccountCredit] Wallet found - Current balance: ₦${wallet.balance.toString()}`,
    );

    // Check if transaction already exists
    const existing = await this.prisma.transaction.findUnique({
      where: { reference },
    });

    if (existing) {
      console.log(
        `⚠️ [processVirtualAccountCredit] Transaction already processed: ${reference}`,
      );
      // Already processed
      return;
    }

    // Create transaction and credit wallet atomically
    const newBalance = wallet.balance.plus(amount);
    console.log(
      `💰 [processVirtualAccountCredit] Crediting wallet - Old balance: ₦${wallet.balance.toString()}, New balance: ₦${newBalance.toString()}`,
    );

    await this.prisma.$transaction([
      // Credit wallet
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: newBalance,
          ledgerBalance: newBalance,
        },
      }),
      // Create transaction
      this.prisma.transaction.create({
        data: {
          reference,
          userId: user.id,
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.COMPLETED,
          amount: new Decimal(amount),
          fee: new Decimal(0), // No fee for bank transfer
          totalAmount: new Decimal(amount),
          balanceBefore: wallet.balance,
          balanceAfter: newBalance,
          currency: 'NGN',
          description: `Bank transfer deposit of ₦${amount.toLocaleString()}`,
          completedAt: new Date(),
          metadata: {
            paymentMethod: 'bank_transfer',
            provider: 'paystack',
            accountNumber,
          },
        },
      }),
    ]);

    console.log(
      `✅ [processVirtualAccountCredit] SUCCESS - Wallet credited with ₦${amount}`,
    );
  }

  /**
   * Withdraw funds to bank account
   */
  async withdrawFunds(
    userId: string,
    amount: number,
    accountNumber: string,
    accountName: string,
    bankCode: string,
    pin: string,
    narration?: string,
  ): Promise<WithdrawalResponse> {
    // Verify PIN
    await this.usersService.verifyPin(userId, pin);

    // Get user and wallet
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallets: { where: { type: 'NAIRA' } } },
    });

    const wallet = user?.wallets?.[0];
    if (!user || !wallet) {
      throw new NotFoundException('User or wallet not found');
    }

    // Check if wallet is locked
    if (wallet.isLocked) {
      throw new ForbiddenException('Wallet is locked');
    }

    // Get limits
    const limits = this.getTransactionLimits(user.kycTier);

    // Validate amount
    if (amount < limits.minWithdrawal || amount > limits.maxWithdrawal) {
      throw new BadRequestException(
        `Amount must be between ₦${limits.minWithdrawal.toLocaleString()} and ₦${limits.maxWithdrawal.toLocaleString()}`,
      );
    }

    // Calculate fee with user's KYC tier for tier-specific config
    const feeCalc = await this.calculateFee(amount, 'withdrawal', user.kycTier);

    // Check sufficient balance
    if (wallet.balance.lessThan(feeCalc.totalAmount)) {
      throw new BadRequestException('Insufficient balance');
    }

    // Generate reference
    const reference = this.generateReference('withdrawal');

    // Get bank name from bank code (for metadata)
    const bankName = await this.getBankNameFromCode(bankCode);

    // Debit wallet and create transaction atomically
    const newBalance = wallet.balance.minus(feeCalc.totalAmount);

    const transaction = await this.prisma.$transaction(async (tx) => {
      // Debit wallet
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: newBalance,
          ledgerBalance: newBalance,
        },
      });

      // Create transaction
      return tx.transaction.create({
        data: {
          reference,
          userId: user.id,
          type: TransactionType.WITHDRAWAL,
          status: TransactionStatus.PROCESSING,
          amount: new Decimal(amount),
          fee: new Decimal(feeCalc.fee),
          totalAmount: new Decimal(feeCalc.totalAmount),
          balanceBefore: wallet.balance,
          balanceAfter: newBalance,
          currency: 'NGN',
          description:
            narration ||
            `Withdrawal of ₦${amount.toLocaleString()} to ${accountName}`,
          metadata: {
            accountNumber,
            accountName,
            bankCode,
            bankName,
            provider: 'paystack',
          },
        },
      });
    });

    // Initiate Paystack transfer (async)
    try {
      const transfer = await this.paystackService.processWithdrawal(
        amount,
        accountName,
        accountNumber,
        bankCode,
        narration || `Withdrawal from RaverPay`,
        reference,
      );

      // Update transaction with provider reference (preserve existing metadata including bankName)
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          providerRef: transfer.transfer_code,
          providerStatus: transfer.status,
          metadata: {
            ...(transaction.metadata as object),
            transferCode: transfer.transfer_code,
          },
        },
      });

      // Send notification for withdrawal initiation
      try {
        await this.notificationDispatcher.sendNotification({
          userId: user.id,
          eventType: 'withdrawal_initiated',
          category: 'TRANSACTION',
          channels: ['EMAIL', 'SMS', 'IN_APP', 'PUSH'],
          title: 'Withdrawal Initiated',
          message: `Your withdrawal of ₦${amount.toLocaleString()} to ${accountName} has been initiated. This may take a few minutes to complete.`,
          data: {
            transactionId: transaction.id,
            amount,
            fee: feeCalc.fee,
            totalDebit: feeCalc.totalAmount,
            reference: transaction.reference,
            accountNumber,
            accountName,
            bankCode,
            bankName,
            status: transaction.status,
          },
        });
        this.logger.log(
          `📬 Withdrawal initiation notification sent for user ${user.id}`,
        );
      } catch (notifError) {
        this.logger.error(
          `Failed to send withdrawal initiation notification to user ${user.id}`,
          notifError,
        );
        // Don't fail the withdrawal if notification fails
      }
    } catch (error) {
      // If transfer fails, refund wallet and mark transaction as failed
      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: wallet.balance,
            ledgerBalance: wallet.balance,
          },
        }),
        this.prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.FAILED,
            failedAt: new Date(),
            metadata: {
              ...(transaction.metadata as object),
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          },
        }),
      ]);

      throw new BadRequestException(
        'Withdrawal failed. Amount refunded to wallet.',
      );
    }

    return {
      reference: transaction.reference,
      amount: transaction.amount.toString(),
      fee: transaction.fee.toString(),
      totalDebit: transaction.totalAmount.toString(),
      status: transaction.status,
      estimatedTime: 'Few minutes to 24 hours',
    };
  }

  /**
   * Resolve account number
   */
  async resolveAccount(
    accountNumber: string,
    bankCode: string,
  ): Promise<ResolveAccountResponse> {
    const resolved = await this.paystackService.resolveAccountNumber(
      accountNumber,
      bankCode,
    );

    return {
      accountNumber: resolved.account_number,
      accountName: resolved.account_name,
      bankCode,
    };
  }

  /**
   * Get list of banks
   */
  async getBanks(): Promise<{ banks: BankInfo[] }> {
    const banks = await this.paystackService.getBanks();

    return {
      banks: banks
        .filter((bank) => bank.active && bank.type === 'nuban')
        .map((bank) => ({
          code: bank.code,
          name: bank.name,
          slug: bank.slug,
          active: bank.active,
        })),
    };
  }

  /**
   * Get withdrawal configuration for user (mobile app)
   * Returns fee info and limits based on user's KYC tier
   */
  async getWithdrawalConfigForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { kycTier: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const config = await this.getWithdrawalConfig(user.kycTier);
    const limits = this.getTransactionLimits(user.kycTier);

    return {
      feeType: config.feeType,
      feeValue: config.feeValue,
      minFee: config.minFee,
      maxFee: config.maxFee,
      minWithdrawal: Math.max(config.minWithdrawal, limits.minWithdrawal),
      maxWithdrawal: Math.min(config.maxWithdrawal, limits.maxWithdrawal),
      kycTier: user.kycTier,
    };
  }

  /**
   * Calculate withdrawal fee preview (mobile app)
   */
  async previewWithdrawalFee(userId: string, amount: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { kycTier: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const fee = await this.calculateWithdrawalFee(amount, user.kycTier);

    return {
      amount,
      fee,
      totalDebit: amount + fee,
      amountToReceive: amount,
    };
  }

  /**
   * Get all withdrawal configurations (admin)
   */
  async getAllWithdrawalConfigs() {
    return this.prisma.withdrawalConfig.findMany({
      orderBy: { tierLevel: 'asc' },
    });
  }

  /**
   * Get withdrawal configuration by ID (admin)
   */
  async getWithdrawalConfigById(id: string) {
    const config = await this.prisma.withdrawalConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException('Withdrawal configuration not found');
    }

    return config;
  }

  /**
   * Create withdrawal configuration (admin)
   */
  async createWithdrawalConfig(data: {
    feeType: string;
    feeValue: number;
    minFee: number;
    maxFee?: number;
    tierLevel?: KYCTier;
    minWithdrawal: number;
    maxWithdrawal: number;
    isActive?: boolean;
    description?: string;
  }) {
    return this.prisma.withdrawalConfig.create({
      data: {
        feeType: data.feeType as any,
        feeValue: new Decimal(data.feeValue),
        minFee: new Decimal(data.minFee),
        maxFee: data.maxFee ? new Decimal(data.maxFee) : null,
        tierLevel: data.tierLevel || null,
        minWithdrawal: new Decimal(data.minWithdrawal),
        maxWithdrawal: new Decimal(data.maxWithdrawal),
        isActive: data.isActive ?? true,
        description: data.description,
      },
    });
  }

  /**
   * Update withdrawal configuration (admin)
   */
  async updateWithdrawalConfig(
    id: string,
    data: {
      feeType?: string;
      feeValue?: number;
      minFee?: number;
      maxFee?: number;
      tierLevel?: KYCTier;
      minWithdrawal?: number;
      maxWithdrawal?: number;
      isActive?: boolean;
      description?: string;
    },
  ) {
    const config = await this.prisma.withdrawalConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException('Withdrawal configuration not found');
    }

    return this.prisma.withdrawalConfig.update({
      where: { id },
      data: {
        ...(data.feeType && { feeType: data.feeType as any }),
        ...(data.feeValue !== undefined && {
          feeValue: new Decimal(data.feeValue),
        }),
        ...(data.minFee !== undefined && { minFee: new Decimal(data.minFee) }),
        ...(data.maxFee !== undefined && {
          maxFee: data.maxFee ? new Decimal(data.maxFee) : null,
        }),
        ...(data.tierLevel !== undefined && { tierLevel: data.tierLevel }),
        ...(data.minWithdrawal !== undefined && {
          minWithdrawal: new Decimal(data.minWithdrawal),
        }),
        ...(data.maxWithdrawal !== undefined && {
          maxWithdrawal: new Decimal(data.maxWithdrawal),
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
      },
    });
  }

  /**
   * Delete withdrawal configuration (admin)
   */
  async deleteWithdrawalConfig(id: string) {
    const config = await this.prisma.withdrawalConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException('Withdrawal configuration not found');
    }

    return this.prisma.withdrawalConfig.delete({
      where: { id },
    });
  }

  /**
   * Get bank name from bank code
   * Helper method to lookup bank name
   */
  private async getBankNameFromCode(bankCode: string): Promise<string> {
    try {
      const banks = await this.paystackService.getBanks();
      const bank = banks.find((b) => b.code === bankCode);
      return bank?.name || 'Unknown Bank';
    } catch (error) {
      this.logger.warn(
        `Failed to lookup bank name for code ${bankCode}, using default`,
      );
      return 'Unknown Bank';
    }
  }

  /**
   * Save or update bank account after successful withdrawal
   * Similar to savedRecipients for VTU services
   */
  async upsertBankAccount(
    userId: string,
    bankCode: string,
    accountNumber: string,
    accountName: string,
  ) {
    try {
      // Get bank name from banks list
      const bankName = await this.getBankNameFromCode(bankCode);

      await this.prisma.bankAccount.upsert({
        where: {
          userId_accountNumber: {
            userId,
            accountNumber,
          },
        },
        update: {
          bankName,
          bankCode,
          accountName,
          isVerified: true, // Mark as verified since we successfully sent to it
          updatedAt: new Date(),
        },
        create: {
          userId,
          bankName,
          bankCode,
          accountNumber,
          accountName,
          isVerified: true,
        },
      });

      this.logger.log(
        `[BankAccount] Saved bank account for user ${userId}: ${accountNumber} (${bankName})`,
      );
    } catch (error) {
      // Don't fail the withdrawal if saving bank account fails
      this.logger.error(
        `[BankAccount] Failed to save bank account for user ${userId}:`,
        error,
      );
    }
  }

  /**
   * Get saved bank accounts for a user
   * Returns most recently used accounts first
   */
  async getSavedBankAccounts(userId: string) {
    const accounts = await this.prisma.bankAccount.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 10, // Limit to 10 most recent
    });

    return accounts.map((account) => ({
      id: account.id,
      bankName: account.bankName,
      bankCode: account.bankCode,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      isVerified: account.isVerified,
      isPrimary: account.isPrimary,
      lastUsedAt: account.updatedAt.toISOString(),
      createdAt: account.createdAt.toISOString(),
    }));
  }
}
