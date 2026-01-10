// src/store/circle.store.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  CircleBalance,
  CircleBlockchain,
  CircleConfig,
  CircleDepositInfo,
  CircleWallet,
} from '../types/circle.types';

interface CircleState {
  // Config
  config: CircleConfig | null;

  // Wallet State
  wallets: CircleWallet[];
  selectedWallet: CircleWallet | null;
  balances: Record<string, CircleBalance[]>; // walletId -> balances
  depositInfo: CircleDepositInfo[];

  // Selected blockchain for operations
  selectedBlockchain: CircleBlockchain | null;

  // Loading States
  isLoadingConfig: boolean;
  isLoadingWallets: boolean;
  isLoadingBalances: boolean;
  isCreatingWallet: boolean;
  isTransferring: boolean;

  // Actions
  setConfig: (config: CircleConfig | null) => void;
  setWallets: (wallets: CircleWallet[]) => void;
  addWallet: (wallet: CircleWallet) => void;
  setSelectedWallet: (wallet: CircleWallet | null) => void;
  setBalances: (walletId: string, balances: CircleBalance[]) => void;
  setDepositInfo: (info: CircleDepositInfo[]) => void;
  setSelectedBlockchain: (blockchain: CircleBlockchain | null) => void;
  setIsLoadingConfig: (loading: boolean) => void;
  setIsLoadingWallets: (loading: boolean) => void;
  setIsLoadingBalances: (loading: boolean) => void;
  setIsCreatingWallet: (creating: boolean) => void;
  setIsTransferring: (transferring: boolean) => void;

  // Helpers
  getWalletBalance: (walletId: string) => CircleBalance[];
  getUsdcBalance: (walletId: string) => string;
  getNativeBalance: (walletId: string) => { symbol: string; amount: string } | null;
  getAllBalances: (walletId: string) => { usdc: string; native: { symbol: string; amount: string } | null; others: CircleBalance[] };
  getTotalUsdcBalance: () => string;

  // Clear all Circle data
  clearCircle: () => void;

  // Clean up balances for wallets that no longer exist
  cleanupBalances: (currentWalletIds: string[]) => void;
}

export const useCircleStore = create<CircleState>()(
  persist(
    (set, get) => ({
      // Initial State
      config: null,
      wallets: [],
      selectedWallet: null,
      balances: {},
      depositInfo: [],
      selectedBlockchain: null,
      isLoadingConfig: false,
      isLoadingWallets: false,
      isLoadingBalances: false,
      isCreatingWallet: false,
      isTransferring: false,

      // Actions
      setConfig: (config) => set({ config }),
      setWallets: (wallets) =>
        set((state) => ({
          wallets,
          // Only set selectedWallet to first if there's no current selection
          // or if current selection is no longer in the wallet list
          selectedWallet:
            state.selectedWallet && wallets.some((w) => w.id === state.selectedWallet?.id)
              ? state.selectedWallet
              : wallets.length > 0
                ? wallets[0]
                : null,
        })),
      addWallet: (wallet) =>
        set((state) => ({
          wallets: [...state.wallets, wallet],
          selectedWallet: state.selectedWallet || wallet,
        })),
      setSelectedWallet: (wallet) => set({ selectedWallet: wallet }),
      setBalances: (walletId, balances) =>
        set((state) => ({
          balances: { ...state.balances, [walletId]: balances },
        })),
      setDepositInfo: (info) => set({ depositInfo: info }),
      setSelectedBlockchain: (blockchain) => set({ selectedBlockchain: blockchain }),
      setIsLoadingConfig: (loading) => set({ isLoadingConfig: loading }),
      setIsLoadingWallets: (loading) => set({ isLoadingWallets: loading }),
      setIsLoadingBalances: (loading) => set({ isLoadingBalances: loading }),
      setIsCreatingWallet: (creating) => set({ isCreatingWallet: creating }),
      setIsTransferring: (transferring) => set({ isTransferring: transferring }),

      // Helpers
      getWalletBalance: (walletId) => {
        return get().balances[walletId] || [];
      },
      getUsdcBalance: (walletId) => {
        const walletBalances = get().balances[walletId] || [];
        const usdcBalance = walletBalances.find((b) => b.token?.symbol === 'USDC');
        return usdcBalance?.amount || '0';
      },
      getNativeBalance: (walletId) => {
        const walletBalances = get().balances[walletId] || [];
        const nativeBalance = walletBalances.find((b) => b.token?.isNative === true);
        return nativeBalance ? { symbol: nativeBalance.token!.symbol, amount: nativeBalance.amount } : null;
      },
      getAllBalances: (walletId) => {
        const walletBalances = get().balances[walletId] || [];
        const usdcBalance = walletBalances.find((b) => b.token?.symbol === 'USDC');
        const nativeBalance = walletBalances.find((b) => b.token?.isNative === true);
        const others = walletBalances.filter((b) => b.token?.symbol !== 'USDC' && !b.token?.isNative);
        
        return {
          usdc: usdcBalance?.amount || '0',
          native: nativeBalance ? { symbol: nativeBalance.token!.symbol, amount: nativeBalance.amount } : null,
          others,
        };
      },
      getTotalUsdcBalance: () => {
        const { balances } = get();
        let total = 0;
        Object.values(balances).forEach((walletBalances) => {
          const usdcBalance = walletBalances.find((b) => b.token?.symbol === 'USDC');
          if (usdcBalance) {
            total += parseFloat(usdcBalance.amount);
          }
        });
        return total.toFixed(2);
      },

      clearCircle: () =>
        set({
          config: null,
          wallets: [],
          selectedWallet: null,
          balances: {},
          depositInfo: [],
          selectedBlockchain: null,
          isLoadingConfig: false,
          isLoadingWallets: false,
          isLoadingBalances: false,
          isCreatingWallet: false,
          isTransferring: false,
        }),

      cleanupBalances: (currentWalletIds) =>
        set((state) => {
          const cleanedBalances: Record<string, CircleBalance[]> = {};
          currentWalletIds.forEach((id) => {
            if (state.balances[id]) {
              cleanedBalances[id] = state.balances[id];
            }
          });
          return { balances: cleanedBalances };
        }),
    }),
    {
      name: 'circle-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        wallets: state.wallets,
        selectedWallet: state.selectedWallet,
        balances: state.balances,
        depositInfo: state.depositInfo,
        selectedBlockchain: state.selectedBlockchain,
      }),
    },
  ),
);
