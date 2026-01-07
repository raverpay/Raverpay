// store/otp.store.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface OtpState {
  emailOtp: {
    lastSentAt: string | null;
    canResendAt: string | null;
  };
  phoneOtp: {
    lastSentAt: string | null;
    canResendAt: string | null;
  };

  // Actions
  setEmailOtpSent: (canResendAt: string) => void;
  setPhoneOtpSent: (canResendAt: string) => void;

  canSendEmailOtp: () => boolean;
  canSendPhoneOtp: () => boolean;

  clearEmailOtp: () => void;
  clearPhoneOtp: () => void;
  clearAll: () => void;
}

export const useOtpStore = create<OtpState>()(
  persist(
    (set, get) => ({
      emailOtp: {
        lastSentAt: null,
        canResendAt: null,
      },
      phoneOtp: {
        lastSentAt: null,
        canResendAt: null,
      },

      setEmailOtpSent: (canResendAt: string) => {
        set({
          emailOtp: {
            lastSentAt: new Date().toISOString(),
            canResendAt,
          },
        });
      },

      setPhoneOtpSent: (canResendAt: string) => {
        set({
          phoneOtp: {
            lastSentAt: new Date().toISOString(),
            canResendAt,
          },
        });
      },

      canSendEmailOtp: () => {
        const { canResendAt } = get().emailOtp;
        if (!canResendAt) return true;
        return new Date() >= new Date(canResendAt);
      },

      canSendPhoneOtp: () => {
        const { canResendAt } = get().phoneOtp;
        if (!canResendAt) return true;
        return new Date() >= new Date(canResendAt);
      },

      clearEmailOtp: () => {
        set({
          emailOtp: {
            lastSentAt: null,
            canResendAt: null,
          },
        });
      },

      clearPhoneOtp: () => {
        set({
          phoneOtp: {
            lastSentAt: null,
            canResendAt: null,
          },
        });
      },

      clearAll: () => {
        set({
          emailOtp: {
            lastSentAt: null,
            canResendAt: null,
          },
          phoneOtp: {
            lastSentAt: null,
            canResendAt: null,
          },
        });
      },
    }),
    {
      name: 'otp-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
