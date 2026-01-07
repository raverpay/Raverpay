// store/wallet.store.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface WalletState {
  balance: number;
  ledgerBalance: number;
  dailySpent: number;
  monthlySpent: number;
  dailyLimit: number;
  monthlyLimit: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  singleTransactionLimit: number;
  kycTier: string;
  isBalanceVisible: boolean;
  isLocked: boolean;
  lockedReason: string | null;
  dailyDepositLimit: number;
  dailyDepositSpent: number;

  // Actions
  setWallet: (data: Partial<WalletState>) => void;
  toggleBalanceVisibility: () => void;
  clearWallet: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      balance: 0,
      ledgerBalance: 0,
      dailySpent: 0,
      monthlySpent: 0,
      dailyLimit: 0,
      monthlyLimit: 0,
      dailyRemaining: 0,
      monthlyRemaining: 0,
      singleTransactionLimit: 10000, // Default for TIER_0
      kycTier: 'TIER_0',
      isBalanceVisible: true,
      isLocked: false,
      lockedReason: null,
      dailyDepositLimit: 0,
      dailyDepositSpent: 0,

      setWallet: (data: Partial<WalletState>) => {
        set((state) => ({ ...state, ...data }));
      },

      toggleBalanceVisibility: () => {
        set((state) => ({ isBalanceVisible: !state.isBalanceVisible }));
      },

      clearWallet: () => {
        set({
          balance: 0,
          ledgerBalance: 0,
          dailySpent: 0,
          monthlySpent: 0,
          dailyLimit: 0,
          monthlyLimit: 0,
          dailyRemaining: 0,
          monthlyRemaining: 0,
          singleTransactionLimit: 10000,
          kycTier: 'TIER_0',
          isLocked: false,
          lockedReason: null,
          dailyDepositLimit: 0,
          dailyDepositSpent: 0,
        });
      },
    }),
    {
      name: 'wallet-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isBalanceVisible: state.isBalanceVisible,
      }),
    },
  ),
);
