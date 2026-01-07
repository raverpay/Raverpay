// src/store/crypto.store.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CryptoBalance, CryptoWallet, DepositInfo } from '../types/crypto.types';

interface CryptoState {
  // Wallet State
  wallet: CryptoWallet | null;
  balances: CryptoBalance[];
  depositInfo: DepositInfo | null;

  // Loading States
  isLoadingWallet: boolean;
  isLoadingBalances: boolean;
  isSyncing: boolean;

  // Actions
  setWallet: (wallet: CryptoWallet | null) => void;
  setBalances: (balances: CryptoBalance[]) => void;
  setDepositInfo: (info: DepositInfo | null) => void;
  setIsLoadingWallet: (loading: boolean) => void;
  setIsLoadingBalances: (loading: boolean) => void;
  setIsSyncing: (syncing: boolean) => void;

  // Clear all crypto data
  clearCrypto: () => void;
}

export const useCryptoStore = create<CryptoState>()(
  persist(
    (set) => ({
      // Initial State
      wallet: null,
      balances: [],
      depositInfo: null,
      isLoadingWallet: false,
      isLoadingBalances: false,
      isSyncing: false,

      // Actions
      setWallet: (wallet) => set({ wallet }),
      setBalances: (balances) => set({ balances }),
      setDepositInfo: (info) => set({ depositInfo: info }),
      setIsLoadingWallet: (loading) => set({ isLoadingWallet: loading }),
      setIsLoadingBalances: (loading) => set({ isLoadingBalances: loading }),
      setIsSyncing: (syncing) => set({ isSyncing: syncing }),

      clearCrypto: () =>
        set({
          wallet: null,
          balances: [],
          depositInfo: null,
          isLoadingWallet: false,
          isLoadingBalances: false,
          isSyncing: false,
        }),
    }),
    {
      name: 'crypto-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        wallet: state.wallet,
        balances: state.balances,
        depositInfo: state.depositInfo,
      }),
    },
  ),
);
