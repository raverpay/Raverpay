import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from '../payments/paystack.service';
import { UsersService } from '../users/users.service';
import { WalletService } from '../wallet/wallet.service';
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
  constructor(
    private prisma: PrismaService,
    private paystackService: PaystackService,
    private usersService: UsersService,
    @Inject(forwardRef(() => WalletService))
    private walletService: WalletService,
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
   * Calculate transaction fee
   */
  private calculateFee(
    amount: number,
    type: 'deposit' | 'withdrawal',
  ): FeeCalculation {
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
      // Withdrawal fees (customize based on your business model)
      if (amount < 5000) {
        fee = 10;
      } else if (amount <= 50000) {
        fee = 25;
      } else {
        fee = 50;
      }
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
      include: { wallet: true },
    });

    if (!user || !user.wallet) {
      throw new NotFoundException('User or wallet not found');
    }

    // Check if wallet is locked
    if (user.wallet.isLocked) {
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
    const feeCalc = this.calculateFee(amount, 'deposit');

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
        balanceBefore: user.wallet.balance,
        balanceAfter: user.wallet.balance,
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
      include: { user: { include: { wallet: true } } },
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
    const wallet = transaction.user.wallet;
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
      include: { user: { include: { wallet: true } } },
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
    const wallet = user.wallet;

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
      include: { wallet: true },
    });

    if (!user || !user.wallet) {
      throw new NotFoundException('User or wallet not found');
    }

    const wallet = user.wallet;

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

    // Calculate fee
    const feeCalc = this.calculateFee(amount, 'withdrawal');

    // Check sufficient balance
    if (wallet.balance.lessThan(feeCalc.totalAmount)) {
      throw new BadRequestException('Insufficient balance');
    }

    // Generate reference
    const reference = this.generateReference('withdrawal');

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
        narration || `Withdrawal from MularPay`,
        reference,
      );

      // Update transaction with provider reference
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
}
