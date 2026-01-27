import apiClient from '../api-client';

export interface AlchemyWallet {
  id: string;
  userId: string;
  address: string;
  blockchain: string;
  network: string;
  accountType: 'EOA' | 'SMART_CONTRACT';
  state: 'ACTIVE' | 'COMPROMISED' | 'FROZEN';
  name: string | null;
  isGasSponsored: boolean;
  gasPolicyId: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  alchemyTransactions?: AlchemyTransaction[];
}

export interface AlchemyTransaction {
  id: string;
  reference: string;
  userId: string;
  walletId: string;
  type: 'SEND' | 'RECEIVE';
  state: 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'COMPLETED' | 'FAILED';
  sourceAddress: string | null;
  destinationAddress: string | null;
  tokenAddress: string | null;
  amount: string | null;
  tokenSymbol: string | null;
  transactionHash: string | null;
  blockchain: string;
  network: string;
  blockNumber: string | null;
  confirmations: number;
  gasUsed: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  wallet?: {
    id: string;
    address: string;
    blockchain: string;
    network: string;
  };
}

export interface GasSpending {
  id: string;
  userId: string;
  walletAddress: string;
  blockchain: string;
  network: string;
  gasPolicyId: string;
  date: string;
  totalGasUsed: string;
  totalGasUsd: string;
  transactionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AlchemyStats {
  totalWallets: number;
  totalTransactions: number;
  totalGasSpent: string;
  activeWallets: number;
  pendingTransactions: number;
  completedTransactions: number;
  failedTransactions: number;
  walletsByBlockchain: Array<{ blockchain: string; count: number }>;
  walletsByNetwork: Array<{ network: string; count: number }>;
  transactionsByState: Array<{ state: string; count: number }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface GasSpendingResponse extends PaginatedResponse<GasSpending> {
  summary: {
    totalGasUsed: string;
    totalTransactions: number;
  };
}

export const alchemyApi = {
  /**
   * Get Alchemy statistics
   */
  getStats: async (): Promise<AlchemyStats> => {
    const response = await apiClient.get('/admin/alchemy/stats');
    return response.data.data;
  },

  /**
   * Get paginated wallets with filters
   */
  getWallets: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    blockchain?: string;
    network?: string;
    accountType?: string;
    state?: string;
    userId?: string;
  }): Promise<PaginatedResponse<AlchemyWallet>> => {
    const response = await apiClient.get('/admin/alchemy/wallets', { params });
    return response.data;
  },

  /**
   * Get wallet by ID
   */
  getWalletById: async (id: string): Promise<AlchemyWallet> => {
    const response = await apiClient.get(`/admin/alchemy/wallets/${id}`);
    return response.data.data;
  },

  /**
   * Get wallets by user ID
   */
  getWalletsByUser: async (userId: string): Promise<AlchemyWallet[]> => {
    const response = await apiClient.get(`/admin/alchemy/wallets/user/${userId}`);
    return response.data.data;
  },

  /**
   * Get paginated transactions with filters
   */
  getTransactions: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    state?: string;
    type?: string;
    blockchain?: string;
    network?: string;
    userId?: string;
    walletId?: string;
  }): Promise<PaginatedResponse<AlchemyTransaction>> => {
    const response = await apiClient.get('/admin/alchemy/transactions', { params });
    return response.data;
  },

  /**
   * Get transaction by ID
   */
  getTransactionById: async (id: string): Promise<AlchemyTransaction> => {
    const response = await apiClient.get(`/admin/alchemy/transactions/${id}`);
    return response.data.data;
  },

  /**
   * Get gas spending analytics
   */
  getGasSpending: async (params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    userId?: string;
    blockchain?: string;
    network?: string;
  }): Promise<GasSpendingResponse> => {
    const response = await apiClient.get('/admin/alchemy/gas-spending', { params });
    return response.data;
  },

  /**
   * Get gas spending by user ID
   */
  getGasSpendingByUser: async (userId: string): Promise<GasSpending[]> => {
    const response = await apiClient.get(`/admin/alchemy/gas-spending/user/${userId}`);
    return response.data.data;
  },
};
