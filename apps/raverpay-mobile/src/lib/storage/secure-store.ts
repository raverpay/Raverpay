// lib/storage/secure-store.ts
import * as SecureStore from "expo-secure-store";

export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      // Always log biometric transaction PIN operations
      if (key === SECURE_KEYS.BIOMETRIC_TRANSACTION_PIN) {
        //  console.log(`[SecureStore] 🔐 Setting biometric transaction PIN`);
      }
      await SecureStore.setItemAsync(key, value);
      if (key === SECURE_KEYS.BIOMETRIC_TRANSACTION_PIN) {
        // console.log(
        //   `[SecureStore] ✅ Successfully saved biometric transaction PIN`
        // );
      }
    } catch (error) {
      if (key === SECURE_KEYS.BIOMETRIC_TRANSACTION_PIN) {
        console.error(
          `[SecureStore] ❌ Error saving biometric transaction PIN:`,
          error
        );
      }
      throw error;
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      if (key === SECURE_KEYS.BIOMETRIC_TRANSACTION_PIN) {
        //  console.log(`[SecureStore] 🔍 Getting biometric transaction PIN...`);
      }
      const value = await SecureStore.getItemAsync(key);
      if (key === SECURE_KEYS.BIOMETRIC_TRANSACTION_PIN) {
        if (value) {
          // console.log(
          //   `[SecureStore] ✅ Biometric transaction PIN found (length: ${value.length})`
          // );
        } else {
          //  console.log(`[SecureStore] ⚠️ No biometric transaction PIN found`);
        }
      }
      return value;
    } catch {
      if (key === SECURE_KEYS.BIOMETRIC_TRANSACTION_PIN) {
        // console.error(
        //   `[SecureStore] ❌ Error reading biometric transaction PIN:`,
        //   error
        // );
      }
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      //console.log(`[SecureStore] Removing item: ${key}`);
      await SecureStore.deleteItemAsync(key);
      //console.log(`[SecureStore] Successfully removed item: ${key}`);
    } catch (error) {
      //console.error(`[SecureStore] Error removing ${key} from secure store:`, error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      // Clear all secure store items
      await Promise.all([
        this.removeItem(SECURE_KEYS.ACCESS_TOKEN),
        this.removeItem(SECURE_KEYS.REFRESH_TOKEN),
        this.removeItem(SECURE_KEYS.PIN),
        this.removeItem(SECURE_KEYS.BIOMETRIC_PUBLIC_KEY),
        this.removeItem(SECURE_KEYS.BIOMETRIC_EMAIL),
        this.removeItem(SECURE_KEYS.BIOMETRIC_PASSWORD),
        this.removeItem(SECURE_KEYS.BIOMETRIC_TRANSACTION_PIN),
      ]);
    } catch (error) {
      //console.error('Error clearing secure store:', error);
      throw error;
    }
  },
};

// Secure storage keys
export const SECURE_KEYS = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  PIN: "transaction_pin",
  BIOMETRIC_PUBLIC_KEY: "biometric_key",
  BIOMETRIC_EMAIL: "biometric_email",
  BIOMETRIC_PASSWORD: "biometric_password",
  BIOMETRIC_TRANSACTION_PIN: "biometric_transaction_pin",
} as const;
