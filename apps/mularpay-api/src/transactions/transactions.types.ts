export interface InitializePaymentDto {
  amount: number;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface InitializePaymentResponse {
  reference: string;
  authorizationUrl: string;
  accessCode: string;
}

export interface VerifyPaymentResponse {
  status: 'success' | 'failed' | 'pending';
  reference: string;
  amount: string;
  fee: string;
  netAmount: string;
  transactionStatus: string;
  gateway?: string;
  paidAt?: Date;
}

export interface VirtualAccountResponse {
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  isPermanent: boolean;
  provider: string;
}

export interface BankInfo {
  code: string;
  name: string;
  slug?: string;
  active?: boolean;
}

export interface ResolveAccountResponse {
  accountNumber: string;
  accountName: string;
  bankCode: string;
  bankName?: string;
}

export interface WithdrawFundsDto {
  amount: number;
  accountNumber: string;
  accountName: string;
  bankCode: string;
  narration?: string;
}

export interface WithdrawalResponse {
  reference: string;
  amount: string;
  fee: string;
  totalDebit: string;
  status: string;
  estimatedTime: string;
}

export interface TransactionStatusResponse {
  reference: string;
  status: string;
  amount: string;
  fee: string;
  completedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
}

// Fee calculation helper
export interface FeeCalculation {
  amount: number;
  fee: number;
  netAmount: number; // For deposits: amount - fee, For withdrawals: amount + fee
  totalAmount: number; // Total to charge/debit
}

// Transaction limits
export interface TransactionLimits {
  minDeposit: number;
  maxDeposit: number;
  minWithdrawal: number;
  maxWithdrawal: number;
}

// P2P Transfer types
export interface P2PTransferResponse {
  reference: string;
  amount: string;
  fee: string;
  recipient: {
    tag: string;
    name: string;
  };
  status: string;
  message?: string;
  createdAt: Date;
}

export interface SetTagResponse {
  tag: string;
  message: string;
}
