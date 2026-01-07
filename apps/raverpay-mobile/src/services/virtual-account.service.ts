// services/virtual-account.service.ts
import { apiClient } from '@/src/lib/api/client';
import { API_ENDPOINTS } from '@/src/lib/api/endpoints';
import type {
  Bank,
  DVAProvider,
  DVARequestPayload,
  DVARequestResponse,
  ResolveAccountResponse,
  VirtualAccount,
} from '@/src/types/virtual-account';

/**
 * Request creation of a dedicated virtual account
 * Requires BVN validation for Financial Services businesses
 */
export const requestVirtualAccount = async (
  payload: DVARequestPayload,
): Promise<DVARequestResponse> => {
  const response = await apiClient.post<DVARequestResponse>(
    API_ENDPOINTS.VIRTUAL_ACCOUNTS.REQUEST,
    payload,
  );
  return response.data;
};

/**
 * Get current user's virtual account
 */
export const getMyVirtualAccount = async (): Promise<VirtualAccount | null> => {
  const response = await apiClient.get<VirtualAccount>(API_ENDPOINTS.VIRTUAL_ACCOUNTS.ME);
  return response.data;
};

/**
 * Get available DVA providers (banks)
 */
export const getDVAProviders = async (): Promise<DVAProvider[]> => {
  const response = await apiClient.get<DVAProvider[]>(API_ENDPOINTS.VIRTUAL_ACCOUNTS.PROVIDERS);
  return response.data;
};

/**
 * Requery virtual account for pending transactions
 * Rate limit: Once every 10 minutes
 */
export const requeryVirtualAccount = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    API_ENDPOINTS.VIRTUAL_ACCOUNTS.REQUERY,
  );
  return response.data;
};

/**
 * Get list of Nigerian banks
 */
export const getBanks = async (): Promise<Bank[]> => {
  const response = await apiClient.get<{
    banks: { code: string; name: string; slug?: string; active?: boolean }[];
  }>(API_ENDPOINTS.TRANSACTIONS.BANKS);
  // Backend returns { banks: BankInfo[] }, extract and map to Bank format
  const bankInfos = response.data.banks || [];

  // Filter out duplicates by code to ensure uniqueness
  const uniqueBanks = bankInfos.filter(
    (bank, index, self) => index === self.findIndex((b) => b.code === bank.code),
  );

  return uniqueBanks.map((bank, index) => ({
    name: bank.name,
    code: bank.code,
    id: index + 1, // Use index + 1 for unique numeric ID
    slug: bank.slug || bank.code.toLowerCase().replace(/\s+/g, '-'), // Use slug or generate from code
    active: bank.active ?? true, // Default to true if not provided
    longcode: bank.code,
    gateway: null,
    pay_with_bank: false,
    is_deleted: false,
    country: 'Nigeria',
    currency: 'NGN',
    type: 'nuban',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
};

/**
 * Resolve bank account number to get account name
 */
export const resolveAccountNumber = async (
  accountNumber: string,
  bankCode: string,
): Promise<ResolveAccountResponse> => {
  const response = await apiClient.post<ResolveAccountResponse>(
    API_ENDPOINTS.TRANSACTIONS.RESOLVE_ACCOUNT,
    {
      accountNumber, // Backend expects camelCase
      bankCode, // Backend expects camelCase
    },
  );
  return response.data;
};
