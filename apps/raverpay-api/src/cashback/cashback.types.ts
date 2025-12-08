import { CashbackTransactionType, VTUServiceType } from '@prisma/client';

export interface CashbackCalculation {
  percentage: number;
  cashbackAmount: number;
  isEligible: boolean;
}

export interface CashbackWalletBalance {
  availableBalance: number;
  totalEarned: number;
  totalRedeemed: number;
}

export interface CashbackTransactionData {
  type: CashbackTransactionType;
  amount: number;
  description: string;
  balanceBefore: number;
  balanceAfter: number;
  sourceReference?: string;
  metadata?: Record<string, any>;
}

export interface CashbackConfigData {
  serviceType: VTUServiceType;
  percentage: number;
  isActive: boolean;
  provider?: string;
  minAmount?: number;
  maxCashback?: number;
  description?: string;
}
