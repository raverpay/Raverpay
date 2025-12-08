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
import { LimitsService, TransactionLimitType } from '../limits/limits.service';
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
  P2PTransferResponse,
  SetTagResponse,
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
    private limitsService: LimitsService,
  ) {}

  /**
   * Generate unique transaction reference
   */
  private generateReference(type: 'deposit' | 'withdrawal' | 'p2p'): string {
    const prefix =
      type === 'deposit' ? 'DEP' : type === 'withdrawal' ? 'WD' : 'P2P';
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
      include: {
        user: {
          select: {
            id: true,
            kycTier: true,
            firstName: true,
            email: true,
            wallets: {
              where: { type: 'NAIRA' },
            },
          },
        },
      },
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

    // 🚨 NEW: Check deposit limits before processing (Option 2: Allow Deposit, Lock Wallet)
    const depositAmount = Number(transaction.amount);
    let shouldLockWallet = false;
    let lockReason = '';

    try {
      // Check both per-transaction and daily deposit limits
      const limitInfo = await this.limitsService.checkDailyLimit(
        userId,
        depositAmount,
        TransactionLimitType.DEPOSIT,
      );

      if (!limitInfo.canProceed) {
        shouldLockWallet = true;
        lockReason = `Deposit of ₦${depositAmount.toLocaleString()} exceeds your ${transaction.user.kycTier} daily limit of ₦${limitInfo.limit.toLocaleString()}. Please upgrade your KYC tier to unlock your wallet.`;

        console.log(
          `⚠️ [verifyPayment] LIMIT EXCEEDED - Will lock wallet after deposit. User: ${userId}, Amount: ₦${depositAmount}, Limit: ₦${limitInfo.limit}, Spent: ₦${limitInfo.spent}`,
        );
      }
    } catch (error) {
      console.error(
        `❌ [verifyPayment] Error checking deposit limits: ${error.message}`,
      );
      // Continue with deposit even if limit check fails (fail-open for deposits)
    }

    const newBalance = wallet.balance.plus(transaction.amount);

    await this.prisma.$transaction([
      // Update wallet balance (and lock if needed)
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: newBalance,
          ledgerBalance: newBalance,
          // Lock wallet if limit exceeded
          ...(shouldLockWallet && {
            isLocked: true,
            lockedReason: lockReason,
          }),
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
            limitExceeded: shouldLockWallet,
            lockedWallet: shouldLockWallet,
          },
        },
      }),
    ]);

    // Increment daily deposit spending
    await this.limitsService.incrementDailySpend(
      userId,
      depositAmount,
      TransactionLimitType.DEPOSIT,
    );

    console.log(
      `✅ [verifyPayment] SUCCESS - Wallet credited with ₦${depositAmount}${shouldLockWallet ? ' - WALLET LOCKED' : ''}`,
    );

    // Send notifications if wallet was locked
    if (shouldLockWallet) {
      try {
        await this.notificationDispatcher.sendNotification({
          userId,
          eventType: 'wallet_locked_deposit_limit',
          category: 'SECURITY',
          channels: ['EMAIL', 'PUSH', 'SMS'],
          title: 'Wallet Locked - Deposit Limit Exceeded',
          message: lockReason,
          data: {
            depositAmount,
            kycTier: transaction.user.kycTier,
            upgradeUrl: '/kyc/upgrade',
          },
        });

        console.log(
          `📧 [verifyPayment] Wallet lock notification sent to user: ${userId}`,
        );
      } catch (notifError) {
        console.error(
          `❌ [verifyPayment] Failed to send wallet lock notification: ${notifError.message}`,
        );
        // Don't fail the deposit if notification fails
      }

      // Create audit log for wallet lock
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'WALLET_LOCKED',
          resource: 'WALLET',
          resourceId: wallet.id,
          ipAddress: '0.0.0.0',
          userAgent: 'SYSTEM',
          metadata: {
            reason: lockReason,
            depositAmount,
            reference: transaction.reference,
            automatedLock: true,
            paymentMethod: 'card',
          },
        },
      });
    }

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
   * Cancel pending transaction (when user closes webview or cancels payment)
   */
  async cancelPendingTransaction(
    userId: string,
    reference: string,
  ): Promise<{ message: string }> {
    console.log(
      `🔍 [cancelPendingTransaction] START - User: ${userId}, Reference: ${reference}`,
    );

    const transaction = await this.prisma.transaction.findUnique({
      where: { reference },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.userId !== userId) {
      throw new BadRequestException('Unauthorized transaction access');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      console.log(
        `⚠️ [cancelPendingTransaction] Transaction already ${transaction.status}`,
      );
      return {
        message: `Transaction is already ${transaction.status.toLowerCase()}`,
      };
    }

    // Update transaction to CANCELLED
    await this.prisma.transaction.update({
      where: { reference },
      data: {
        status: TransactionStatus.CANCELLED,
        failedAt: new Date(),
        metadata: {
          ...(transaction.metadata as object),
          cancelledBy: 'user',
          cancelledAt: new Date().toISOString(),
          reason: 'User closed payment page',
        },
      },
    });

    console.log(
      `✅ [cancelPendingTransaction] Transaction cancelled: ${reference}`,
    );

    return { message: 'Transaction cancelled successfully' };
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
    paystackFee: number = 0,
  ): Promise<void> {
    const netAmount = amount - paystackFee;
    console.log(
      `🔍 [processVirtualAccountCredit] START - Reference: ${reference}, Amount: ₦${amount}, Fee: ₦${paystackFee}, Net: ₦${netAmount}, Account: ${accountNumber}`,
    );

    // Find virtual account
    const virtualAccount = await this.prisma.virtualAccount.findUnique({
      where: { accountNumber },
      include: {
        user: {
          select: {
            id: true,
            kycTier: true,
            firstName: true,
            email: true,
            wallets: {
              where: { type: 'NAIRA' },
            },
          },
        },
      },
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
      `✅ [processVirtualAccountCredit] Wallet found - Current balance: ₦${wallet.balance.toString()}, KYC Tier: ${user.kycTier}`,
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

    // 🚨 NEW: Check deposit limits before processing (Option 2: Allow Deposit, Lock Wallet)
    let shouldLockWallet = false;
    let lockReason = '';

    try {
      // Check both per-transaction and daily deposit limits
      const limitInfo = await this.limitsService.checkDailyLimit(
        user.id,
        amount,
        TransactionLimitType.DEPOSIT,
      );

      if (!limitInfo.canProceed) {
        shouldLockWallet = true;
        lockReason = `Deposit of ₦${amount.toLocaleString()} exceeds your ${user.kycTier} daily limit of ₦${limitInfo.limit.toLocaleString()}. Please upgrade your KYC tier to unlock your wallet.`;

        console.log(
          `⚠️ [processVirtualAccountCredit] LIMIT EXCEEDED - Will lock wallet after deposit. User: ${user.id}, Amount: ₦${amount}, Limit: ₦${limitInfo.limit}, Spent: ₦${limitInfo.spent}`,
        );
      }
    } catch (error) {
      console.error(
        `❌ [processVirtualAccountCredit] Error checking deposit limits: ${error.message}`,
      );
      // Continue with deposit even if limit check fails (fail-open for deposits)
    }

    // Create transaction and credit wallet atomically
    const newBalance = wallet.balance.plus(netAmount);
    console.log(
      `💰 [processVirtualAccountCredit] Crediting wallet - Old balance: ₦${wallet.balance.toString()}, Net amount: ₦${netAmount}, New balance: ₦${newBalance.toString()}`,
    );

    await this.prisma.$transaction([
      // Credit wallet
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: newBalance,
          ledgerBalance: newBalance,
          // Lock wallet if limit exceeded
          ...(shouldLockWallet && {
            isLocked: true,
            lockedReason: lockReason,
          }),
        },
      }),
      // Create transaction
      this.prisma.transaction.create({
        data: {
          reference,
          userId: user.id,
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.COMPLETED,
          amount: new Decimal(amount), // Original amount sent
          fee: new Decimal(paystackFee), // Paystack DVA fee (1% capped at ₦300)
          totalAmount: new Decimal(netAmount), // Net amount after fee
          balanceBefore: wallet.balance,
          balanceAfter: newBalance,
          currency: 'NGN',
          description: `Bank transfer deposit of ₦${amount.toLocaleString()}${paystackFee > 0 ? ` (Fee: ₦${paystackFee.toFixed(2)})` : ''}${shouldLockWallet ? ' (Wallet locked - limit exceeded)' : ''}`,
          completedAt: new Date(),
          metadata: {
            paymentMethod: 'bank_transfer',
            provider: 'paystack',
            accountNumber,
            grossAmount: amount,
            paystackFee: paystackFee,
            netAmount: netAmount,
            limitExceeded: shouldLockWallet,
            lockedWallet: shouldLockWallet,
          },
        },
      }),
    ]);

    // Increment daily deposit spending
    await this.limitsService.incrementDailySpend(
      user.id,
      amount,
      TransactionLimitType.DEPOSIT,
    );

    console.log(
      `✅ [processVirtualAccountCredit] SUCCESS - Wallet credited with ₦${netAmount} (Gross: ₦${amount}, Fee: ₦${paystackFee})${shouldLockWallet ? ' - WALLET LOCKED' : ''}`,
    );

    // Send notifications if wallet was locked
    if (shouldLockWallet) {
      try {
        await this.notificationDispatcher.sendNotification({
          userId: user.id,
          eventType: 'wallet_locked_deposit_limit',
          category: 'SECURITY',
          channels: ['EMAIL', 'PUSH', 'SMS'],
          title: 'Wallet Locked - Deposit Limit Exceeded',
          message: lockReason,
          data: {
            depositAmount: amount,
            kycTier: user.kycTier,
            upgradeUrl: '/kyc/upgrade',
          },
        });

        console.log(
          `📧 [processVirtualAccountCredit] Wallet lock notification sent to user: ${user.id}`,
        );
      } catch (notifError) {
        console.error(
          `❌ [processVirtualAccountCredit] Failed to send wallet lock notification: ${notifError.message}`,
        );
        // Don't fail the deposit if notification fails
      }

      // Create audit log for wallet lock
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'WALLET_LOCKED',
          resource: 'WALLET',
          resourceId: wallet.id,
          ipAddress: '0.0.0.0',
          userAgent: 'SYSTEM',
          metadata: {
            reason: lockReason,
            depositAmount: amount,
            reference,
            automatedLock: true,
          },
        },
      });
    }
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

    // Check daily transaction limit
    await this.limitsService.enforceLimit(
      userId,
      amount,
      TransactionLimitType.WITHDRAWAL,
    );

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

      // Increment daily spending limit asynchronously
      this.limitsService
        .incrementDailySpend(userId, amount, TransactionLimitType.WITHDRAWAL)
        .catch((error) =>
          this.logger.error(
            'Failed to increment daily limit (non-critical)',
            error,
          ),
        );

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

  // ============================================
  // P2P TRANSFER METHODS
  // ============================================

  /**
   * Send money to another user by tag
   */
  async sendToUser(
    senderId: string,
    recipientTag: string,
    amount: number,
    message?: string,
  ): Promise<P2PTransferResponse> {
    const { validateTag, isReservedTag } = await import(
      './constants/reserved-tags.js'
    );

    // 1. Validate sender exists
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        tag: true,
        kycTier: true,
        status: true,
      },
    });

    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    if (sender.status !== 'ACTIVE') {
      throw new ForbiddenException('Your account is not active');
    }

    // P2P Transfer tier restrictions
    // TIER_0 can receive but needs TIER_1+ to send
    // TIER_1: ₦100K per transaction, ₦300K daily
    // TIER_2: ₦1M per transaction, ₦5M daily
    // TIER_3: Unlimited
    if (sender.kycTier === 'TIER_0') {
      throw new ForbiddenException(
        'Please complete email and phone verification to send money to other users',
      );
    }

    // Per-transaction limits based on tier
    const tierLimits = {
      TIER_1: 100000, // ₦100K
      TIER_2: 1000000, // ₦1M
      TIER_3: Infinity, // Unlimited
    };

    const maxPerTransaction = tierLimits[sender.kycTier] || tierLimits.TIER_1;
    if (amount > maxPerTransaction) {
      throw new BadRequestException(
        `Maximum ${sender.kycTier} transaction limit is ₦${maxPerTransaction.toLocaleString()}`,
      );
    }

    // 2. Find receiver by tag (case-insensitive)
    const normalizedTag = recipientTag.toLowerCase().trim();
    const receiver = await this.prisma.user.findUnique({
      where: { tag: normalizedTag },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        tag: true,
        status: true,
        kycTier: true, // 🚨 ADDED: Need this for deposit limit checking
      },
    });

    if (!receiver) {
      throw new NotFoundException(`User @${recipientTag} not found`);
    }

    if (receiver.status !== 'ACTIVE') {
      throw new BadRequestException('Recipient account is not active');
    }

    // 3. Prevent self-transfer
    if (sender.id === receiver.id) {
      throw new BadRequestException('You cannot send money to yourself');
    }

    // 4. Validate amount
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than ₦0');
    }

    // 5. Check sender's wallet
    const senderWallet = await this.prisma.wallet.findUnique({
      where: {
        userId_type: {
          userId: senderId,
          type: 'NAIRA',
        },
      },
    });

    if (!senderWallet) {
      throw new NotFoundException('Sender wallet not found');
    }

    if (senderWallet.isLocked) {
      throw new ForbiddenException('Your wallet is locked');
    }

    // 6. Check receiver's wallet exists
    const receiverWallet = await this.prisma.wallet.findUnique({
      where: {
        userId_type: {
          userId: receiver.id,
          type: 'NAIRA',
        },
      },
    });

    if (!receiverWallet) {
      throw new NotFoundException('Recipient wallet not found');
    }

    // Note: We do NOT prevent transfers to locked wallets
    // Money is always accepted, receiver just can't withdraw until they unlock
    // This is consistent with DVA deposit behavior

    // 7. Calculate fee (free for P2P transfers)
    const fee = 0;
    const totalDebit = amount + fee;

    // 8. Check balance
    if (senderWallet.balance.lt(totalDebit)) {
      throw new BadRequestException(
        `Insufficient balance. You have ₦${senderWallet.balance.toString()} but need ₦${totalDebit.toLocaleString()}`,
      );
    }

    // 9. Check sender's daily P2P transfer limit
    const limitCheck = await this.limitsService.checkDailyLimit(
      senderId,
      amount,
      TransactionLimitType.P2P_TRANSFER,
    );

    if (!limitCheck.canProceed) {
      throw new BadRequestException(
        `Daily transfer limit exceeded. Limit: ₦${limitCheck.limit.toLocaleString()}, Spent: ₦${limitCheck.spent.toLocaleString()}, Remaining: ₦${limitCheck.remaining.toLocaleString()}`,
      );
    }

    // 🚨 NEW: Check receiver's daily DEPOSIT limit (P2P is a deposit for receiver)
    let shouldLockReceiverWallet = false;
    let receiverLockReason = '';

    try {
      const receiverLimitCheck = await this.limitsService.checkDailyLimit(
        receiver.id,
        amount,
        TransactionLimitType.DEPOSIT,
      );

      if (!receiverLimitCheck.canProceed) {
        shouldLockReceiverWallet = true;
        receiverLockReason = `Received ₦${amount.toLocaleString()} from @${sender.tag || sender.firstName} which exceeds your ${receiver.kycTier} daily deposit limit of ₦${receiverLimitCheck.limit.toLocaleString()}. Please upgrade your KYC tier to unlock your wallet.`;

        this.logger.warn(
          `[P2P] Receiver @${receiver.tag} will exceed deposit limit. Amount: ₦${amount}, Limit: ₦${receiverLimitCheck.limit}, Spent: ₦${receiverLimitCheck.spent}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `[P2P] Error checking receiver deposit limits: ${error.message}`,
      );
      // Continue with transfer even if limit check fails (fail-open)
    }

    // 10. Generate reference
    const reference = this.generateReference('p2p');

    // 11. Execute transfer atomically
    const result = await this.prisma.$transaction(async (tx) => {
      // Debit sender
      const newSenderBalance = senderWallet.balance.minus(totalDebit);
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: {
          balance: newSenderBalance,
          ledgerBalance: newSenderBalance,
        },
      });

      // Credit receiver (and lock if deposit limit exceeded)
      const newReceiverBalance = receiverWallet.balance.plus(amount);
      await tx.wallet.update({
        where: { id: receiverWallet.id },
        data: {
          balance: newReceiverBalance,
          ledgerBalance: newReceiverBalance,
          // Lock receiver's wallet if deposit limit exceeded
          ...(shouldLockReceiverWallet && {
            isLocked: true,
            lockedReason: receiverLockReason,
          }),
        },
      });

      // Create sender transaction (debit)
      const senderTxn = await tx.transaction.create({
        data: {
          reference: `${reference}_DEBIT`,
          userId: senderId,
          type: TransactionType.TRANSFER,
          status: TransactionStatus.COMPLETED,
          amount: new Decimal(amount),
          fee: new Decimal(fee),
          totalAmount: new Decimal(totalDebit),
          balanceBefore: senderWallet.balance,
          balanceAfter: newSenderBalance,
          currency: 'NGN',
          description: `Sent ₦${amount.toLocaleString()} to @${receiver.tag}`,
          metadata: {
            recipientTag: receiver.tag,
            recipientId: receiver.id,
            recipientName: `${receiver.firstName} ${receiver.lastName}`,
            message,
            transferType: 'p2p',
          },
        },
      });

      // Create receiver transaction (credit)
      const receiverTxn = await tx.transaction.create({
        data: {
          reference: `${reference}_CREDIT`,
          userId: receiver.id,
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.COMPLETED,
          amount: new Decimal(amount),
          fee: new Decimal(0),
          totalAmount: new Decimal(amount),
          balanceBefore: receiverWallet.balance,
          balanceAfter: newReceiverBalance,
          currency: 'NGN',
          description: `Received ₦${amount.toLocaleString()} from @${sender.tag || sender.firstName}${shouldLockReceiverWallet ? ' (Wallet locked - limit exceeded)' : ''}`,
          metadata: {
            senderTag: sender.tag,
            senderId: sender.id,
            senderName: `${sender.firstName} ${sender.lastName}`,
            message,
            transferType: 'p2p',
            limitExceeded: shouldLockReceiverWallet,
            lockedWallet: shouldLockReceiverWallet,
          },
        },
      });

      // Create P2P transfer record
      const p2pTransfer = await tx.p2PTransfer.create({
        data: {
          reference,
          senderId: sender.id,
          receiverId: receiver.id,
          amount: new Decimal(amount),
          fee: new Decimal(fee),
          status: TransactionStatus.COMPLETED,
          message,
          senderTransactionId: senderTxn.id,
          receiverTransactionId: receiverTxn.id,
        },
      });

      return { senderTxn, receiverTxn, p2pTransfer };
    });

    // 12. Update daily limits (async, non-blocking)
    // Increment sender's P2P transfer spending
    this.limitsService
      .incrementDailySpend(senderId, amount, TransactionLimitType.P2P_TRANSFER)
      .catch((error) =>
        this.logger.error('Failed to increment P2P daily limit', error),
      );

    // 🚨 NEW: Increment receiver's DEPOSIT spending (P2P is a deposit for receiver)
    this.limitsService
      .incrementDailySpend(receiver.id, amount, TransactionLimitType.DEPOSIT)
      .catch((error) =>
        this.logger.error('Failed to increment receiver deposit limit', error),
      );

    // 13. Send notifications
    this.sendP2PNotifications(
      sender,
      receiver,
      amount,
      message,
      reference,
    ).catch((error) =>
      this.logger.error('Failed to send P2P notifications', error),
    );

    // 🚨 NEW: Send wallet lock notification to receiver if limit exceeded
    if (shouldLockReceiverWallet) {
      try {
        await this.notificationDispatcher.sendNotification({
          userId: receiver.id,
          eventType: 'wallet_locked_deposit_limit',
          category: 'SECURITY',
          channels: ['EMAIL', 'PUSH', 'SMS'],
          title: 'Wallet Locked - Deposit Limit Exceeded',
          message: receiverLockReason,
          data: {
            depositAmount: amount,
            kycTier: receiver.kycTier,
            // Don't include these in email data - they're internal
            // source: 'p2p_transfer',
            // senderTag: sender.tag,
            // upgradeUrl: '/kyc/upgrade',
          },
        });

        // Create audit log for wallet lock
        await this.prisma.auditLog.create({
          data: {
            userId: receiver.id,
            action: 'WALLET_LOCKED',
            resource: 'WALLET',
            resourceId: receiverWallet.id,
            ipAddress: '0.0.0.0',
            userAgent: 'SYSTEM',
            metadata: {
              reason: receiverLockReason,
              depositAmount: amount,
              reference: result.p2pTransfer.reference,
              automatedLock: true,
              paymentMethod: 'p2p_transfer',
              senderId: sender.id,
              senderTag: sender.tag,
            },
          },
        });

        this.logger.log(
          `[P2P] Receiver @${receiver.tag} wallet locked due to deposit limit exceeded`,
        );
      } catch (notifError) {
        this.logger.error(
          `[P2P] Failed to send wallet lock notification to receiver: ${notifError.message}`,
        );
        // Don't fail the transfer if notification fails
      }
    }

    this.logger.log(
      `[P2P] Transfer completed: @${sender.tag} → @${receiver.tag} | ₦${amount} | Ref: ${reference}${shouldLockReceiverWallet ? ' | RECEIVER WALLET LOCKED' : ''}`,
    );

    return {
      reference: result.p2pTransfer.reference,
      amount: amount.toString(),
      fee: fee.toString(),
      recipient: {
        tag: receiver.tag!,
        name: `${receiver.firstName} ${receiver.lastName}`,
      },
      status: 'COMPLETED',
      message,
      createdAt: result.p2pTransfer.createdAt,
    };
  }

  /**
   * Send P2P transfer notifications to both parties
   */
  private async sendP2PNotifications(
    sender: {
      id: string;
      firstName: string;
      lastName: string;
      tag: string | null;
    },
    receiver: {
      id: string;
      firstName: string;
      lastName: string;
      tag: string | null;
    },
    amount: number,
    message?: string,
    reference?: string,
  ) {
    try {
      // Notify sender
      await this.notificationDispatcher.sendNotification({
        userId: sender.id,
        eventType: 'p2p_transfer_sent',
        category: 'TRANSACTION',
        channels: ['IN_APP', 'PUSH', 'EMAIL'],
        title: 'Money Sent',
        message: `You sent ₦${amount.toLocaleString()} to @${receiver.tag}`,
        data: {
          amount,
          recipientTag: receiver.tag,
          recipientName: `${receiver.firstName} ${receiver.lastName}`,
          message,
          reference,
        },
      });

      // Notify receiver
      await this.notificationDispatcher.sendNotification({
        userId: receiver.id,
        eventType: 'p2p_transfer_received',
        category: 'TRANSACTION',
        channels: ['IN_APP', 'PUSH', 'EMAIL'],
        title: 'Money Received',
        message: `You received ₦${amount.toLocaleString()} from @${sender.tag || sender.firstName}`,
        data: {
          amount,
          senderTag: sender.tag,
          senderName: `${sender.firstName} ${sender.lastName}`,
          message,
          reference,
        },
      });

      this.logger.log(
        `[P2P] Notifications sent for transfer: @${sender.tag} → @${receiver.tag}`,
      );
    } catch (error) {
      this.logger.error('[P2P] Failed to send notifications', error);
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Lookup user by tag for autocomplete
   */
  async lookupUserByTag(tag: string) {
    const normalizedTag = tag.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { tag: normalizedTag },
      select: {
        tag: true,
        firstName: true,
        lastName: true,
        avatar: true,
        status: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User @${tag} not found`);
    }

    if (user.status !== 'ACTIVE') {
      throw new BadRequestException('This user account is not active');
    }

    return {
      tag: user.tag!,
      name: `${user.firstName} ${user.lastName}`,
      avatar: user.avatar,
    };
  }

  /**
   * Set or update user's tag
   */
  async setUserTag(userId: string, newTag: string): Promise<SetTagResponse> {
    const { validateTag, isReservedTag } = await import(
      './constants/reserved-tags.js'
    );

    const normalizedTag = newTag.toLowerCase().trim();

    // 1. Validate tag format
    const validation = validateTag(normalizedTag);
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    // 2. Check if tag is already taken
    const existing = await this.prisma.user.findUnique({
      where: { tag: normalizedTag },
    });

    if (existing && existing.id !== userId) {
      throw new BadRequestException('This tag is already taken');
    }

    // 3. Get current user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tag: true,
        tagChangedCount: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 4. Check if user is setting tag for first time or updating
    const isFirstTime = !user.tag;
    const MAX_TAG_CHANGES = 3; // Allow up to 3 tag changes

    if (!isFirstTime && user.tagChangedCount >= MAX_TAG_CHANGES) {
      throw new ForbiddenException(
        `You have reached the maximum number of tag changes (${MAX_TAG_CHANGES})`,
      );
    }

    // 5. Update tag
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tag: normalizedTag,
        tagSetAt: isFirstTime ? new Date() : undefined,
        tagChangedCount: isFirstTime ? 0 : user.tagChangedCount + 1,
      },
    });

    this.logger.log(
      `[P2P] User ${userId} ${isFirstTime ? 'set' : 'changed'} tag to @${normalizedTag}`,
    );

    return {
      tag: normalizedTag,
      message: isFirstTime
        ? `Your tag @${normalizedTag} has been set successfully`
        : `Your tag has been updated to @${normalizedTag}`,
    };
  }

  /**
   * Get P2P transfer history for a user
   */
  async getP2PHistory(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [transfers, total] = await Promise.all([
      this.prisma.p2PTransfer.findMany({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
        include: {
          sender: {
            select: {
              tag: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          receiver: {
            select: {
              tag: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.p2PTransfer.count({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
      }),
    ]);

    return {
      transfers: transfers.map((transfer) => ({
        id: transfer.id,
        reference: transfer.reference,
        amount: transfer.amount.toString(),
        fee: transfer.fee.toString(),
        status: transfer.status,
        message: transfer.message,
        isSent: transfer.senderId === userId,
        counterparty:
          transfer.senderId === userId
            ? {
                tag: transfer.receiver.tag,
                name: `${transfer.receiver.firstName} ${transfer.receiver.lastName}`,
                avatar: transfer.receiver.avatar,
              }
            : {
                tag: transfer.sender.tag,
                name: `${transfer.sender.firstName} ${transfer.sender.lastName}`,
                avatar: transfer.sender.avatar,
              },
        createdAt: transfer.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
