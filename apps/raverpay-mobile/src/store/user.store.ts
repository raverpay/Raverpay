// store/user.store.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { KYCTier, User, UserStatus } from "../types/api.types";
import { clearUserContext, setUserContext } from "../utils/sentryConfig";

interface UserState {
  user: User | null;
  setUser: (user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  clearUser: () => void;
  clearSensitiveUserData: () => void; // Clears sensitive data but retains display info (name, email, avatar)
  hasPinSet: () => boolean;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,

      setUser: (user: User) => {
        set({ user });

        // Set Sentry user context (with scrubbed data)
        setUserContext({
          id: user.id,
          email: user.email,
          phone: user.phone,
          kycTier: user.kycTier,
          accountStatus: user.status,
        });
      },

      updateUser: (updates: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
      },

      clearUser: () => {
        set({ user: null });

        // Clear Sentry user context on logout
        clearUserContext();
      },

      clearSensitiveUserData: () => {
        const currentUser = get().user;
        if (!currentUser) return;

        // Retain only non-sensitive display data (name, email, avatar)
        // Clear all sensitive information while keeping minimal display data
        set({
          user: {
            id: "", // Clear ID (required field, but empty string is acceptable for display-only)
            email: currentUser.email, // Keep for display
            phone: "", // Clear phone (required field, but empty string is acceptable)
            firstName: currentUser.firstName, // Keep for display
            lastName: currentUser.lastName, // Keep for display
            dateOfBirth: undefined, // Clear
            gender: undefined, // Clear
            address: undefined, // Clear
            city: undefined, // Clear
            state: undefined, // Clear
            avatar: currentUser.avatar, // Keep for display (optional)
            emailVerified: false, // Clear verification status
            phoneVerified: false, // Clear verification status
            bvnVerified: false, // Clear verification status
            ninVerified: false, // Clear verification status
            status: UserStatus.INACTIVE, // Clear status
            kycTier: KYCTier.TIER_0, // Clear KYC tier
            pinSetAt: undefined, // Clear PIN info
            profileEditedOnce: undefined, // Clear
            profileEditedAt: undefined, // Clear
            createdAt: new Date().toISOString(), // Required field, use current date
            updatedAt: new Date().toISOString(), // Required field, use current date
            biometricEnabled: undefined, // Clear
            lastPasswordChange: undefined, // Clear
            passwordResetAt: undefined, // Clear
          },
        });

        // Clear Sentry user context when clearing sensitive data
        clearUserContext();
      },

      hasPinSet: () => {
        const { user } = get();

        // console.log({ user });
        // console.log({ pinSetAt: user?.pinSetAt });
        return !!user?.pinSetAt;
      },
    }),
    {
      name: "user-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
