import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CashbackWallet {
  availableBalance: number;
  totalEarned: number;
  totalRedeemed: number;
}

interface CashbackState extends CashbackWallet {
  // Actions
  setCashbackWallet: (wallet: CashbackWallet) => void;
  clearCashbackWallet: () => void;

  // UI state
  isCashbackVisible: boolean;
  toggleCashbackVisibility: () => void;
}

export const useCashbackStore = create<CashbackState>()(
  persist(
    (set) => ({
      // Initial state
      availableBalance: 0,
      totalEarned: 0,
      totalRedeemed: 0,
      isCashbackVisible: true,

      // Actions
      setCashbackWallet: (wallet) =>
        set({
          availableBalance: wallet.availableBalance,
          totalEarned: wallet.totalEarned,
          totalRedeemed: wallet.totalRedeemed,
        }),

      clearCashbackWallet: () =>
        set({
          availableBalance: 0,
          totalEarned: 0,
          totalRedeemed: 0,
        }),

      toggleCashbackVisibility: () =>
        set((state) => ({
          isCashbackVisible: !state.isCashbackVisible,
        })),
    }),
    {
      name: 'cashback-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isCashbackVisible: state.isCashbackVisible,
      }),
    },
  ),
);
