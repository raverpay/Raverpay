import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface OnboardingState {
  hasSeenWelcome: boolean;
  setHasSeenWelcome: (seen: boolean) => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasSeenWelcome: false,
      setHasSeenWelcome: (seen) => set({ hasSeenWelcome: seen }),
    }),
    {
      name: 'onboarding-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
