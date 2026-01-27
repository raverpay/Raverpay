# Alchemy Mobile App Implementation Plan

## Overview

This plan implements the complete mobile app for Alchemy EOA wallets, assuming all backend APIs from the backend plan are ready. The implementation follows existing patterns from the Circle wallet integration (service layer, hooks, Zustand store, React Query).

## Architecture Pattern

Following existing `circle` wallet implementation:

- **Service Layer**: `src/services/alchemy.service.ts` (API calls)
- **Hooks**: `src/hooks/useAlchemy.ts` (React Query hooks)
- **Store**: `src/store/alchemy.store.ts` (Zustand state management)
- **Types**: `src/types/alchemy.types.ts` (TypeScript definitions)
- **Screens**: `app/alchemy/` directory (Expo Router)
- **Components**: `src/components/alchemy/` directory

---

## Phase 1: Foundation Setup

### Task 1.1: Add API Endpoints

**File**: `apps/raverpay-mobile/src/lib/api/endpoints.ts`

Add to `API_ENDPOINTS`:

```typescript
ALCHEMY: {
  WALLETS: {
    LIST: '/alchemy/wallets',
    CREATE: '/alchemy/wallets',
    IMPORT: '/alchemy/wallets/import',
    DETAIL: (id: string) => `/alchemy/wallets/${id}`,
    BY_NETWORK: (chain: string, net: string) => `/alchemy/wallets/by-network/${chain}/${net}`,
    UPDATE_NAME: (id: string) => `/alchemy/wallets/${id}/name`,
    DEACTIVATE: (id: string) => `/alchemy/wallets/${id}`,
    LOCK: (id: string) => `/alchemy/wallets/${id}/lock`,
    EXPORT_SEED: (id: string) => `/alchemy/wallets/${id}/export-seed`,
  },
  TRANSACTIONS: {
    SEND: '/alchemy/transactions/send',
    SEND_NATIVE: '/alchemy/transactions/send-native',
    BALANCE: '/alchemy/transactions/balance',
    BALANCE_NATIVE: (walletId: string) => `/alchemy/transactions/balance/native/${walletId}`,
    HISTORY: (walletId: string) => `/alchemy/transactions/history/${walletId}`,
    BY_REFERENCE: (reference: string) => `/alchemy/transactions/reference/${reference}`,
    GAS_PRICE: (chain: string, net: string) => `/alchemy/transactions/gas-price/${chain}/${net}`,
  },
}
```

### Task 1.2: Create TypeScript Types

**File**: `apps/raverpay-mobile/src/types/alchemy.types.ts`

Define all types:

```typescript
export type AlchemyBlockchain = 'POLYGON' | 'ARBITRUM' | 'BASE';
export type AlchemyNetwork = 'mainnet' | 'sepolia' | 'amoy';
export type AlchemyAccountType = 'EOA' | 'SMART_CONTRACT';
export type AlchemyWalletState = 'ACTIVE' | 'INACTIVE' | 'LOCKED' | 'COMPROMISED';
export type AlchemyTransactionType = 'SEND' | 'RECEIVE' | 'INTERNAL';
export type AlchemyTransactionState =
  | 'PENDING'
  | 'SUBMITTED'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'FAILED';
export type TokenType = 'USDC' | 'USDT' | 'NATIVE';

export interface AlchemyWallet {
  id: string;
  address: string;
  blockchain: AlchemyBlockchain;
  network: AlchemyNetwork;
  accountType: AlchemyAccountType;
  state: AlchemyWalletState;
  name: string | null;
  isGasSponsored: boolean;
  hasSeedPhrase: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AlchemyTokenBalance {
  walletId: string;
  address: string;
  tokenType: TokenType;
  tokenAddress: string | null;
  balance: string;
  balanceRaw: string;
  blockchain: AlchemyBlockchain;
  network: AlchemyNetwork;
}

export interface AlchemyTransaction {
  id: string;
  reference: string;
  type: AlchemyTransactionType;
  state: AlchemyTransactionState;
  sourceAddress: string;
  destinationAddress: string | null;
  tokenAddress: string | null;
  amount: string;
  amountFormatted: string;
  transactionHash: string | null;
  blockNumber: string | null;
  gasUsed: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  failedAt: string | null;
}

export interface GasPrice {
  blockchain: AlchemyBlockchain;
  network: AlchemyNetwork;
  gasPrice: string | null;
  maxFeePerGas: string | null;
  maxPriorityFeePerGas: string | null;
  nativeToken: string;
}

export interface CreateWalletRequest {
  blockchain: AlchemyBlockchain;
  network: AlchemyNetwork;
  name?: string;
}

export interface ImportWalletRequest {
  method: 'SEED_PHRASE' | 'PRIVATE_KEY';
  seedPhrase?: string;
  privateKey?: string;
  blockchain: AlchemyBlockchain;
  network: AlchemyNetwork;
  name?: string;
}

export interface SendTokenRequest {
  walletId: string;
  destinationAddress: string;
  amount: string;
  tokenType: 'USDC' | 'USDT';
}

export interface SendNativeTokenRequest {
  walletId: string;
  destinationAddress: string;
  amount: string;
}

export interface ExportSeedPhraseRequest {
  pin: string;
}

export interface ExportSeedPhraseResponse {
  mnemonic: string;
  warning: string;
}
```

### Task 1.3: Create Alchemy Service

**File**: `apps/raverpay-mobile/src/services/alchemy.service.ts`

Create service class following `circle.service.ts` pattern:

```typescript
import { apiClient, handleApiError } from '../lib/api/client';
import { API_ENDPOINTS } from '../lib/api/endpoints';
import {
  AlchemyWallet,
  AlchemyTokenBalance,
  AlchemyTransaction,
  GasPrice,
  CreateWalletRequest,
  ImportWalletRequest,
  SendTokenRequest,
  SendNativeTokenRequest,
  ExportSeedPhraseRequest,
  ExportSeedPhraseResponse,
} from '../types/alchemy.types';

class AlchemyService {
  // Wallet Management
  async getWallets(): Promise<AlchemyWallet[]> {
    const response = await apiClient.get<{
      success: boolean;
      data: AlchemyWallet[];
    }>(API_ENDPOINTS.ALCHEMY.WALLETS.LIST);
    return response.data.data;
  }

  async getWallet(walletId: string): Promise<AlchemyWallet> {
    const response = await apiClient.get<{
      success: boolean;
      data: AlchemyWallet;
    }>(API_ENDPOINTS.ALCHEMY.WALLETS.DETAIL(walletId));
    return response.data.data;
  }

  async createWallet(data: CreateWalletRequest): Promise<AlchemyWallet> {
    const response = await apiClient.post<{
      success: boolean;
      data: AlchemyWallet;
    }>(API_ENDPOINTS.ALCHEMY.WALLETS.CREATE, data);
    return response.data.data;
  }

  async importWallet(data: ImportWalletRequest): Promise<AlchemyWallet> {
    const response = await apiClient.post<{
      success: boolean;
      data: AlchemyWallet;
    }>(API_ENDPOINTS.ALCHEMY.WALLETS.IMPORT, data);
    return response.data.data;
  }

  async updateWalletName(walletId: string, name: string): Promise<AlchemyWallet> {
    const response = await apiClient.patch<{
      success: boolean;
      data: AlchemyWallet;
    }>(API_ENDPOINTS.ALCHEMY.WALLETS.UPDATE_NAME(walletId), { name });
    return response.data.data;
  }

  async exportSeedPhrase(walletId: string, pin: string): Promise<ExportSeedPhraseResponse> {
    const response = await apiClient.post<{
      success: boolean;
      data: ExportSeedPhraseResponse;
    }>(API_ENDPOINTS.ALCHEMY.WALLETS.EXPORT_SEED(walletId), { pin });
    return response.data.data;
  }

  // Transactions
  async sendToken(data: SendTokenRequest): Promise<AlchemyTransaction> {
    const response = await apiClient.post<{
      success: boolean;
      data: AlchemyTransaction;
    }>(API_ENDPOINTS.ALCHEMY.TRANSACTIONS.SEND, data);
    return response.data.data;
  }

  async sendNativeToken(data: SendNativeTokenRequest): Promise<AlchemyTransaction> {
    const response = await apiClient.post<{
      success: boolean;
      data: AlchemyTransaction;
    }>(API_ENDPOINTS.ALCHEMY.TRANSACTIONS.SEND_NATIVE, data);
    return response.data.data;
  }

  async getTokenBalance(
    walletId: string,
    tokenType: 'USDC' | 'USDT',
  ): Promise<AlchemyTokenBalance> {
    const response = await apiClient.post<{
      success: boolean;
      data: AlchemyTokenBalance;
    }>(API_ENDPOINTS.ALCHEMY.TRANSACTIONS.BALANCE, { walletId, tokenType });
    return response.data.data;
  }

  async getNativeTokenBalance(walletId: string): Promise<AlchemyTokenBalance> {
    const response = await apiClient.get<{
      success: boolean;
      data: AlchemyTokenBalance;
    }>(API_ENDPOINTS.ALCHEMY.TRANSACTIONS.BALANCE_NATIVE(walletId));
    return response.data.data;
  }

  async getTransactionHistory(
    walletId: string,
    limit = 50,
    offset = 0,
  ): Promise<AlchemyTransaction[]> {
    const response = await apiClient.get<{
      success: boolean;
      data: AlchemyTransaction[];
    }>(API_ENDPOINTS.ALCHEMY.TRANSACTIONS.HISTORY(walletId), {
      params: { limit, offset },
    });
    return response.data.data;
  }

  async getTransactionByReference(reference: string): Promise<AlchemyTransaction> {
    const response = await apiClient.get<{
      success: boolean;
      data: AlchemyTransaction;
    }>(API_ENDPOINTS.ALCHEMY.TRANSACTIONS.BY_REFERENCE(reference));
    return response.data.data;
  }

  async getGasPrice(blockchain: AlchemyBlockchain, network: AlchemyNetwork): Promise<GasPrice> {
    const response = await apiClient.get<{ success: boolean; data: GasPrice }>(
      API_ENDPOINTS.ALCHEMY.TRANSACTIONS.GAS_PRICE(blockchain, network),
    );
    return response.data.data;
  }
}

export const alchemyService = new AlchemyService();
```

### Task 1.4: Create Zustand Store

**File**: `apps/raverpay-mobile/src/store/alchemy.store.ts`

Create store following `circle.store.ts` pattern:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AlchemyWallet, AlchemyTokenBalance, GasPrice } from '../types/alchemy.types';

interface AlchemyState {
  // Wallets
  wallets: AlchemyWallet[];
  selectedWallet: AlchemyWallet | null;

  // Balances (keyed by walletId_tokenType)
  balances: Record<string, AlchemyTokenBalance>;

  // Gas prices (keyed by blockchain_network)
  gasPrices: Record<string, GasPrice>;

  // Loading states
  isLoadingWallets: boolean;
  isLoadingBalances: boolean;
  isCreatingWallet: boolean;
  isImportingWallet: boolean;
  isSendingTransaction: boolean;

  // Actions
  setWallets: (wallets: AlchemyWallet[]) => void;
  addWallet: (wallet: AlchemyWallet) => void;
  updateWallet: (walletId: string, updates: Partial<AlchemyWallet>) => void;
  setSelectedWallet: (wallet: AlchemyWallet | null) => void;
  setBalance: (walletId: string, tokenType: string, balance: AlchemyTokenBalance) => void;
  setGasPrice: (blockchain: string, network: string, gasPrice: GasPrice) => void;
  setIsLoadingWallets: (loading: boolean) => void;
  setIsLoadingBalances: (loading: boolean) => void;
  setIsCreatingWallet: (creating: boolean) => void;
  setIsImportingWallet: (importing: boolean) => void;
  setIsSendingTransaction: (sending: boolean) => void;

  // Helpers
  getWalletBalance: (walletId: string, tokenType: string) => AlchemyTokenBalance | null;
  getNativeBalance: (walletId: string) => AlchemyTokenBalance | null;
  clearBalances: () => void;
}

export const useAlchemyStore = create<AlchemyState>()(
  persist(
    (set, get) => ({
      // Initial state
      wallets: [],
      selectedWallet: null,
      balances: {},
      gasPrices: {},
      isLoadingWallets: false,
      isLoadingBalances: false,
      isCreatingWallet: false,
      isImportingWallet: false,
      isSendingTransaction: false,

      // Actions
      setWallets: (wallets) => set({ wallets }),
      addWallet: (wallet) => set((state) => ({ wallets: [...state.wallets, wallet] })),
      updateWallet: (walletId, updates) =>
        set((state) => ({
          wallets: state.wallets.map((w) => (w.id === walletId ? { ...w, ...updates } : w)),
        })),
      setSelectedWallet: (wallet) => set({ selectedWallet: wallet }),
      setBalance: (walletId, tokenType, balance) =>
        set((state) => ({
          balances: {
            ...state.balances,
            [`${walletId}_${tokenType}`]: balance,
          },
        })),
      setGasPrice: (blockchain, network, gasPrice) =>
        set((state) => ({
          gasPrices: {
            ...state.gasPrices,
            [`${blockchain}_${network}`]: gasPrice,
          },
        })),
      setIsLoadingWallets: (loading) => set({ isLoadingWallets: loading }),
      setIsLoadingBalances: (loading) => set({ isLoadingBalances: loading }),
      setIsCreatingWallet: (creating) => set({ isCreatingWallet: creating }),
      setIsImportingWallet: (importing) => set({ isImportingWallet: importing }),
      setIsSendingTransaction: (sending) => set({ isSendingTransaction: sending }),

      // Helpers
      getWalletBalance: (walletId, tokenType) => {
        return get().balances[`${walletId}_${tokenType}`] || null;
      },
      getNativeBalance: (walletId) => {
        return get().balances[`${walletId}_NATIVE`] || null;
      },
      clearBalances: () => set({ balances: {} }),
    }),
    {
      name: 'alchemy-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        wallets: state.wallets,
        selectedWallet: state.selectedWallet,
      }),
    },
  ),
);
```

---

## Phase 2: React Query Hooks

### Task 2.1: Create Alchemy Hooks

**File**: `apps/raverpay-mobile/src/hooks/useAlchemy.ts`

Create hooks following `useCircleWallet.ts` pattern:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '../lib/utils/toast';
import { alchemyService } from '../services/alchemy.service';
import { useAuthStore } from '../store/auth.store';
import { useAlchemyStore } from '../store/alchemy.store';
import {
  AlchemyBlockchain,
  AlchemyNetwork,
  CreateWalletRequest,
  ImportWalletRequest,
  SendTokenRequest,
  SendNativeTokenRequest,
  ExportSeedPhraseRequest,
} from '../types/alchemy.types';

// Get all wallets
export const useAlchemyWallets = () => {
  const { setWallets, setIsLoadingWallets } = useAlchemyStore();
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['alchemy-wallets'],
    queryFn: async () => {
      setIsLoadingWallets(true);
      try {
        const wallets = await alchemyService.getWallets();
        setWallets(wallets);
        return wallets;
      } finally {
        setIsLoadingWallets(false);
      }
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60, // 1 minute
  });
};

// Get single wallet
export const useAlchemyWallet = (walletId: string) => {
  return useQuery({
    queryKey: ['alchemy-wallet', walletId],
    queryFn: () => alchemyService.getWallet(walletId),
    enabled: !!walletId,
  });
};

// Create wallet
export const useCreateAlchemyWallet = () => {
  const queryClient = useQueryClient();
  const { setIsCreatingWallet, addWallet } = useAlchemyStore();

  return useMutation({
    mutationFn: (data: CreateWalletRequest) => {
      setIsCreatingWallet(true);
      return alchemyService.createWallet(data);
    },
    onSuccess: (wallet) => {
      addWallet(wallet);
      queryClient.invalidateQueries({ queryKey: ['alchemy-wallets'] });
      setIsCreatingWallet(false);
      toast.success({
        title: 'Wallet Created',
        message: 'Your Alchemy wallet has been created successfully!',
      });
    },
    onError: (error: any) => {
      setIsCreatingWallet(false);
      toast.error({
        title: 'Creation Failed',
        message: error.message || 'Failed to create wallet',
      });
    },
  });
};

// Import wallet
export const useImportAlchemyWallet = () => {
  const queryClient = useQueryClient();
  const { setIsImportingWallet, addWallet } = useAlchemyStore();

  return useMutation({
    mutationFn: (data: ImportWalletRequest) => {
      setIsImportingWallet(true);
      return alchemyService.importWallet(data);
    },
    onSuccess: (wallet) => {
      addWallet(wallet);
      queryClient.invalidateQueries({ queryKey: ['alchemy-wallets'] });
      setIsImportingWallet(false);
      toast.success({
        title: 'Wallet Imported',
        message: 'Your wallet has been imported successfully!',
      });
    },
    onError: (error: any) => {
      setIsImportingWallet(false);
      toast.error({
        title: 'Import Failed',
        message: error.message || 'Failed to import wallet',
      });
    },
  });
};

// Get token balance
export const useAlchemyTokenBalance = (walletId: string, tokenType: 'USDC' | 'USDT') => {
  const { setBalance } = useAlchemyStore();

  return useQuery({
    queryKey: ['alchemy-balance', walletId, tokenType],
    queryFn: async () => {
      const balance = await alchemyService.getTokenBalance(walletId, tokenType);
      setBalance(walletId, tokenType, balance);
      return balance;
    },
    enabled: !!walletId,
    staleTime: 1000 * 30, // 30 seconds
  });
};

// Get native token balance
export const useAlchemyNativeBalance = (walletId: string) => {
  const { setBalance } = useAlchemyStore();

  return useQuery({
    queryKey: ['alchemy-native-balance', walletId],
    queryFn: async () => {
      const balance = await alchemyService.getNativeTokenBalance(walletId);
      setBalance(walletId, 'NATIVE', balance);
      return balance;
    },
    enabled: !!walletId,
    staleTime: 1000 * 30, // 30 seconds
  });
};

// Get transaction history
export const useAlchemyTransactions = (walletId: string, limit = 50, offset = 0) => {
  return useQuery({
    queryKey: ['alchemy-transactions', walletId, limit, offset],
    queryFn: () => alchemyService.getTransactionHistory(walletId, limit, offset),
    enabled: !!walletId,
  });
};

// Send token
export const useSendAlchemyToken = () => {
  const queryClient = useQueryClient();
  const { setIsSendingTransaction } = useAlchemyStore();

  return useMutation({
    mutationFn: (data: SendTokenRequest) => {
      setIsSendingTransaction(true);
      return alchemyService.sendToken(data);
    },
    onSuccess: (transaction) => {
      setIsSendingTransaction(false);
      queryClient.invalidateQueries({ queryKey: ['alchemy-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['alchemy-balance'] });
      queryClient.invalidateQueries({ queryKey: ['alchemy-native-balance'] });
      toast.success({
        title: 'Transaction Sent',
        message: 'Your transaction has been submitted successfully!',
      });
    },
    onError: (error: any) => {
      setIsSendingTransaction(false);
      toast.error({
        title: 'Transaction Failed',
        message: error.message || 'Failed to send transaction',
      });
    },
  });
};

// Send native token
export const useSendAlchemyNativeToken = () => {
  const queryClient = useQueryClient();
  const { setIsSendingTransaction } = useAlchemyStore();

  return useMutation({
    mutationFn: (data: SendNativeTokenRequest) => {
      setIsSendingTransaction(true);
      return alchemyService.sendNativeToken(data);
    },
    onSuccess: (transaction) => {
      setIsSendingTransaction(false);
      queryClient.invalidateQueries({ queryKey: ['alchemy-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['alchemy-balance'] });
      queryClient.invalidateQueries({ queryKey: ['alchemy-native-balance'] });
      toast.success({
        title: 'Transaction Sent',
        message: 'Your transaction has been submitted successfully!',
      });
    },
    onError: (error: any) => {
      setIsSendingTransaction(false);
      toast.error({
        title: 'Transaction Failed',
        message: error.message || 'Failed to send transaction',
      });
    },
  });
};

// Get gas price
export const useAlchemyGasPrice = (blockchain: AlchemyBlockchain, network: AlchemyNetwork) => {
  const { setGasPrice } = useAlchemyStore();

  return useQuery({
    queryKey: ['alchemy-gas-price', blockchain, network],
    queryFn: async () => {
      const gasPrice = await alchemyService.getGasPrice(blockchain, network);
      setGasPrice(blockchain, network, gasPrice);
      return gasPrice;
    },
    enabled: !!blockchain && !!network,
    staleTime: 1000 * 30, // 30 seconds (gas prices change frequently)
    refetchInterval: 1000 * 30, // Auto-refetch every 30 seconds
  });
};

// Export seed phrase
export const useExportAlchemySeedPhrase = () => {
  return useMutation({
    mutationFn: ({ walletId, pin }: { walletId: string; pin: string }) =>
      alchemyService.exportSeedPhrase(walletId, pin),
  });
};
```

---

## Phase 3: Core Components

### Task 3.1: Wallet Card Component

**File**: `apps/raverpay-mobile/src/components/alchemy/AlchemyWalletCard.tsx`

Create wallet card component showing:

- Wallet name and address (truncated)
- Network badge (Base/Polygon/Arbitrum)
- Token balances (USDC, USDT, Native)
- Quick actions (Send, Receive, View Details)

### Task 3.2: Network Selector Component

**File**: `apps/raverpay-mobile/src/components/alchemy/NetworkSelector.tsx`

Create network selector with:

- Blockchain selection (Base, Polygon, Arbitrum)
- Network selection (mainnet/testnet)
- Visual indicators for selected network

### Task 3.3: Seed Phrase Display Component

**File**: `apps/raverpay-mobile/src/components/alchemy/SeedPhraseDisplay.tsx`

Create secure seed phrase display:

- Word-by-word reveal (requires PIN/biometric)
- Copy to clipboard functionality
- Warning messages
- Verification quiz component

### Task 3.4: Transaction Item Component

**File**: `apps/raverpay-mobile/src/components/alchemy/TransactionItem.tsx`

Create transaction list item:

- Transaction type icon
- Amount and token type
- Status indicator (pending/confirmed/failed)
- Timestamp (relative + absolute)
- Tap to view details

### Task 3.5: Gas Price Display Component

**File**: `apps/raverpay-mobile/src/components/alchemy/GasPriceDisplay.tsx`

Create gas price display:

- Current gas price in Gwei
- USD equivalent
- Estimated transaction cost
- Gas price options (Standard/Fast)

---

## Phase 4: Screen Implementation

### Task 4.1: Main Dashboard Screen

**File**: `apps/raverpay-mobile/app/alchemy/index.tsx`

Create main dashboard:

- List of all wallets (using `AlchemyWalletCard`)
- Network selector
- Quick actions (Create Wallet, Import Wallet)
- Recent transactions preview
- Pull-to-refresh functionality

**Features**:

- Auto-load wallets on mount
- Show loading states
- Handle empty state (no wallets)
- Navigate to wallet details, create, import screens

### Task 4.2: Onboarding Screen

**File**: `apps/raverpay-mobile/app/alchemy/onboarding.tsx`

Create onboarding carousel:

- Slide 1: What is a crypto wallet?
- Slide 2: How to backup your wallet (seed phrase)
- Slide 3: Security best practices
- Skip/Next buttons
- Progress indicator

### Task 4.3: Create Wallet Screen

**File**: `apps/raverpay-mobile/app/alchemy/create.tsx`

Create wallet creation flow:

1. Network selection (blockchain + network)
2. Wallet name input (optional)
3. Create wallet (show loading)
4. Seed phrase backup (critical step)
5. Verification quiz
6. Success screen

**Flow**:

- Use `useCreateAlchemyWallet` hook
- After creation, show seed phrase backup screen
- Require PIN/biometric to reveal seed phrase
- Verify user has backed up phrase (quiz)
- Navigate to dashboard on success

### Task 4.4: Import Wallet Screen

**File**: `apps/raverpay-mobile/app/alchemy/import.tsx`

Create import wallet flow:

1. Choose import method (Seed Phrase / Private Key)
2. Input method:

   - Seed phrase: 12-word input with autocomplete
   - Private key: Text input or QR scanner

3. Network selection
4. Wallet name (optional)
5. Import wallet (show loading)
6. Success screen

**Features**:

- Validate seed phrase format (12 words)
- Validate private key format (0x + 64 hex chars)
- Show error messages for invalid input
- Use `useImportAlchemyWallet` hook

### Task 4.5: Seed Phrase Backup Screen

**File**: `apps/raverpay-mobile/app/alchemy/seed-phrase-backup.tsx`

Create seed phrase backup flow:

1. PIN/biometric verification
2. Display seed phrase (word-by-word reveal)
3. Copy to clipboard option
4. Verification quiz (select words in order)
5. Success confirmation

**Security**:

- Require PIN/biometric before showing phrase
- Never store seed phrase in app state
- Clear clipboard after 60 seconds
- Show warning messages

### Task 4.6: Wallet Detail Screen

**File**: `apps/raverpay-mobile/app/alchemy/wallet/[id].tsx`

Create wallet detail screen:

- Wallet address (with copy button)
- Token balances (USDC, USDT, Native)
- Quick actions (Send, Receive)
- Transaction history (recent)
- Settings button

**Features**:

- Load wallet details
- Load all token balances
- Load recent transactions
- Navigate to send/receive/settings screens

### Task 4.7: Send Token Screen

**File**: `apps/raverpay-mobile/app/alchemy/send.tsx`

Create send token flow:

1. Token selector (USDC/USDT/Native)
2. Recipient address input (with QR scanner)
3. Amount input (with max button)
4. Gas price display (for native tokens)
5. Transaction review
6. PIN/biometric confirmation
7. Transaction submission
8. Success screen

**Features**:

- Validate recipient address
- Check sufficient balance
- Show gas estimation (for native tokens)
- Require PIN/biometric for confirmation
- Use `useSendAlchemyToken` or `useSendAlchemyNativeToken`
- Show transaction hash and explorer link

### Task 4.8: Receive Screen

**File**: `apps/raverpay-mobile/app/alchemy/receive.tsx`

Create receive screen:

- Large QR code
- Wallet address (with copy button)
- Network badge
- Share options

**Features**:

- Generate QR code from wallet address
- Copy address to clipboard
- Share address via native share sheet

### Task 4.9: Transaction Details Screen

**File**: `apps/raverpay-mobile/app/alchemy/transaction/[id].tsx`

Create transaction details screen:

- Transaction hash (with copy + explorer link)
- Status indicator
- Amount and token type
- From/To addresses
- Gas used
- Block number
- Timestamps
- Error message (if failed)

**Features**:

- Load transaction by reference
- Show real-time status updates
- Link to block explorer
- Copy transaction hash

### Task 4.10: Transaction History Screen

**File**: `apps/raverpay-mobile/app/alchemy/transactions.tsx`

Create transaction history screen:

- List of all transactions (using `TransactionItem`)
- Filter by type (Send/Receive)
- Filter by status
- Pagination (infinite scroll)
- Pull-to-refresh

**Features**:

- Load transactions with pagination
- Show loading states
- Handle empty state
- Navigate to transaction details

### Task 4.11: Wallet Settings Screen

**File**: `apps/raverpay-mobile/app/alchemy/settings/[id].tsx`

Create wallet settings screen:

- Wallet name (editable)
- View address
- Export seed phrase (with PIN verification)
- Export private key (with PIN verification)
- Lock wallet
- Deactivate wallet

**Features**:

- Update wallet name
- Export seed phrase (navigate to backup screen)
- Show security warnings
- Confirm destructive actions

---

## Phase 5: QR Code Scanner

### Task 5.1: Install QR Scanner Library

**File**: `apps/raverpay-mobile/package.json`

Add dependency:

```json
{
  "dependencies": {
    "expo-camera": "~15.0.0",
    "expo-barcode-scanner": "~13.0.0"
  }
}
```

### Task 5.2: Create QR Scanner Component

**File**: `apps/raverpay-mobile/src/components/alchemy/QRCodeScanner.tsx`

Create QR scanner component:

- Camera view
- Address validation
- Error handling
- Permission requests

**Usage**: Integrate into send screen for recipient address input

---

## Phase 6: PIN/Biometric Integration

### Task 6.1: Use Existing PIN Verification

**File**: `apps/raverpay-mobile/src/hooks/useBiometricAuth.ts`

Check existing biometric auth hook and integrate:

- PIN verification for sensitive operations
- Biometric fallback
- Session management

### Task 6.2: Add PIN Verification to Sensitive Operations

Integrate PIN/biometric verification for:

- Seed phrase export
- Private key export
- Transaction sending
- Wallet deletion

---

## Phase 7: Navigation Integration

### Task 7.1: Add Alchemy Tab/Route

**File**: `apps/raverpay-mobile/app/(tabs)/_layout.tsx`

Add Alchemy tab to main navigation (if needed):

- Tab icon
- Tab label
- Route configuration

### Task 7.2: Update App Navigation

Ensure all Alchemy screens are accessible:

- Dashboard from main navigation
- Create/Import from dashboard
- Send/Receive from wallet details
- Settings from wallet details

---

## Phase 8: Error Handling & Loading States

### Task 8.1: Error Handling

Implement comprehensive error handling:

- Network errors
- Validation errors
- API errors
- User-friendly error messages
- Retry mechanisms

### Task 8.2: Loading States

Add loading indicators for:

- Wallet creation
- Wallet import
- Balance fetching
- Transaction sending
- Seed phrase export

---

## Phase 9: Testing & Polish

### Task 9.1: Component Testing

Test all components:

- Wallet card rendering
- Network selector
- Seed phrase display
- Transaction items
- Gas price display

### Task 9.2: Flow Testing

Test complete user flows:

- Create wallet → Backup seed phrase → Verify
- Import wallet → View details → Send token
- Receive → Copy address → Share
- Transaction history → View details → Explorer link

### Task 9.3: Edge Cases

Handle edge cases:

- No wallets state
- No transactions state
- Insufficient balance
- Invalid addresses
- Network errors
- Failed transactions

### Task 9.4: UI/UX Polish

Polish UI/UX:

- Consistent styling with app theme
- Smooth animations
- Loading skeletons
- Empty states
- Error states
- Success confirmations

---

## File Structure Summary

```
apps/raverpay-mobile/
├── app/
│   └── alchemy/
│       ├── index.tsx                    # Main dashboard
│       ├── onboarding.tsx               # Onboarding carousel
│       ├── create.tsx                   # Create wallet
│       ├── import.tsx                   # Import wallet
│       ├── seed-phrase-backup.tsx       # Seed phrase backup
│       ├── send.tsx                     # Send tokens
│       ├── receive.tsx                  # Receive (QR code)
│       ├── transactions.tsx             # Transaction history
│       ├── wallet/
│       │   └── [id].tsx                 # Wallet details
│       ├── transaction/
│       │   └── [id].tsx                 # Transaction details
│       └── settings/
│           └── [id].tsx                 # Wallet settings
├── src/
│   ├── components/
│   │   └── alchemy/
│   │       ├── AlchemyWalletCard.tsx
│   │       ├── NetworkSelector.tsx
│   │       ├── SeedPhraseDisplay.tsx
│   │       ├── TransactionItem.tsx
│   │       ├── GasPriceDisplay.tsx
│   │       └── QRCodeScanner.tsx
│   ├── hooks/
│   │   └── useAlchemy.ts                # All React Query hooks
│   ├── services/
│   │   └── alchemy.service.ts           # API service
│   ├── store/
│   │   └── alchemy.store.ts             # Zustand store
│   └── types/
│       └── alchemy.types.ts             # TypeScript types
```

---

## Dependencies to Install

```json
{
  "dependencies": {
    "expo-camera": "~15.0.0",
    "expo-barcode-scanner": "~13.0.0",
    "react-native-qrcode-svg": "^6.2.0"
  }
}
```

---

## Success Criteria

- [ ] All API endpoints integrated
- [ ] All screens implemented and functional
- [ ] Seed phrase backup flow works securely
- [ ] Wallet import works (seed phrase + private key)
- [ ] Token sending works (USDC/USDT/Native)
- [ ] Native token balances display correctly
- [ ] Gas price estimation works
- [ ] Transaction history loads and displays
- [ ] PIN/biometric verification works for sensitive operations
- [ ] QR code scanner works for recipient addresses
- [ ] Error handling covers all edge cases
- [ ] Loading states show appropriately
- [ ] UI matches app design system
- [ ] All user flows tested end-to-end

---

## Estimated Time

- Phase 1 (Foundation): 4 hours
- Phase 2 (Hooks): 3 hours
- Phase 3 (Components): 6 hours
- Phase 4 (Screens): 12 hours
- Phase 5 (QR Scanner): 2 hours
- Phase 6 (PIN/Biometric): 2 hours
- Phase 7 (Navigation): 1 hour
- Phase 8 (Error Handling): 3 hours
- Phase 9 (Testing & Polish): 4 hours

**Total**: ~37 hours