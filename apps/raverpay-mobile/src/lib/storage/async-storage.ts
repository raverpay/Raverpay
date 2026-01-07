// lib/storage/async-storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const asyncStorage = {
  async setItem(key: string, value: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error('Error saving to async storage:', error);
      throw error;
    }
  },

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Error reading from async storage:', error);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from async storage:', error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing async storage:', error);
      throw error;
    }
  },
};

// Async storage keys
export const STORAGE_KEYS = {
  USER: 'user',
  WALLET: 'wallet',
  THEME: 'theme',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  REMEMBER_ME: 'remember_me',
  LAST_EMAIL: 'last_email',
  // Rating prompt
  RATING_CONFIG: 'rating_config',
  RATING_LOCAL_DATA: 'rating_local_data',
  RATING_LAST_PROMPT_DATE: 'rating_last_prompt_date',
  RATING_DISMISSED_PERMANENTLY: 'rating_dismissed_permanently',
  RATING_APP_OPEN_COUNT: 'rating_app_open_count',
  RATING_MANUAL_CLICKED: 'rating_manual_clicked',
  RATING_TOTAL_PROMPTS: 'rating_total_prompts',
} as const;
