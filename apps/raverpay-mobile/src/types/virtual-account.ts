// types/virtual-account.ts

export interface VirtualAccount {
  id: string;
  userId: string;
  provider: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  providerRef?: string;
  isActive: boolean;
  creationStatus?: 'PENDING' | 'PROCESSING' | 'ACTIVE' | 'FAILED';
  retryCount?: number;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DVAProvider {
  provider_slug: string;
  bank_id: number;
  bank_name: string;
  id: number;
}

export interface Bank {
  name: string;
  slug: string;
  code: string;
  longcode: string;
  gateway: string | null;
  pay_with_bank: boolean;
  active: boolean;
  is_deleted: boolean;
  country: string;
  currency: string;
  type: string;
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface DVARequestPayload {
  preferred_bank?: string;
  bvn?: string;
  nin?: string;
  date_of_birth?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  account_number?: string;
  bank_code?: string;
}

export interface DVARequestResponse {
  success: boolean;
  message: string;
  data?: {
    accountNumber?: string;
    accountName?: string;
    bankName?: string;
    status?: string;
    creationStatus?: 'PENDING' | 'PROCESSING' | 'ACTIVE' | 'FAILED';
  };
}

export interface ResolveAccountResponse {
  accountName: any;
  account_number: string;
  account_name: string;
  bank_id: number;
}

export type DVAStatus = 'none' | 'pending' | 'processing' | 'active' | 'failed';

export interface DVAState {
  status: DVAStatus;
  virtualAccount?: VirtualAccount;
  errorMessage?: string;
}
