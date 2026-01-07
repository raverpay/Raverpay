// store/rating.store.ts
import { asyncStorage, STORAGE_KEYS } from '@/src/lib/storage/async-storage';
import { RatingConfig, RatingLocalData } from '@/src/types/rating.types';
import { create } from 'zustand';

interface RatingState {
  // Configuration from backend
  config: RatingConfig | null;
  isConfigLoaded: boolean;

  // Local tracking data
  localData: RatingLocalData;

  // Actions
  setConfig: (config: RatingConfig) => void;
  updateLocalData: (data: Partial<RatingLocalData>) => Promise<void>;
  incrementAppOpenCount: () => Promise<void>;
  incrementTransactionCount: () => Promise<void>;
  recordPromptShown: () => Promise<void>;
  recordPromptDismissed: (permanently: boolean) => Promise<void>;
  recordRatingClicked: () => Promise<void>;
  loadLocalData: () => Promise<void>;
  reset: () => Promise<void>;
}

const DEFAULT_LOCAL_DATA: RatingLocalData = {
  lastPromptDate: null,
  dismissedPermanently: false,
  appOpenCount: 0,
  manualRatingClicked: false,
  totalPromptsShown: 0,
  successfulTransactionCount: 0,
};

export const useRatingStore = create<RatingState>((set, get) => ({
  config: null,
  isConfigLoaded: false,
  localData: DEFAULT_LOCAL_DATA,

  setConfig: (config) => {
    set({ config, isConfigLoaded: true });
    // Cache config in AsyncStorage
    asyncStorage.setItem(STORAGE_KEYS.RATING_CONFIG, config);
  },

  updateLocalData: async (data) => {
    const newLocalData = { ...get().localData, ...data };
    set({ localData: newLocalData });
    await asyncStorage.setItem(STORAGE_KEYS.RATING_LOCAL_DATA, newLocalData);
  },

  incrementAppOpenCount: async () => {
    const currentCount = get().localData.appOpenCount;
    await get().updateLocalData({ appOpenCount: currentCount + 1 });
  },

  incrementTransactionCount: async () => {
    const currentCount = get().localData.successfulTransactionCount || 0;
    await get().updateLocalData({
      successfulTransactionCount: currentCount + 1,
    });
  },

  recordPromptShown: async () => {
    const currentTotal = get().localData.totalPromptsShown;
    await get().updateLocalData({
      lastPromptDate: new Date().toISOString(),
      totalPromptsShown: currentTotal + 1,
    });
  },

  recordPromptDismissed: async (permanently) => {
    if (permanently) {
      await get().updateLocalData({
        dismissedPermanently: true,
        lastPromptDate: new Date().toISOString(),
      });
    } else {
      await get().updateLocalData({
        lastPromptDate: new Date().toISOString(),
      });
    }
  },

  recordRatingClicked: async () => {
    await get().updateLocalData({
      manualRatingClicked: true,
      lastPromptDate: new Date().toISOString(),
    });
  },

  loadLocalData: async () => {
    try {
      const savedData = await asyncStorage.getItem<RatingLocalData>(STORAGE_KEYS.RATING_LOCAL_DATA);
      const savedConfig = await asyncStorage.getItem<RatingConfig>(STORAGE_KEYS.RATING_CONFIG);

      if (savedData) {
        set({ localData: savedData });
      }

      if (savedConfig) {
        set({ config: savedConfig, isConfigLoaded: true });
      }
    } catch (error) {
      console.error('[RatingStore] Failed to load local data:', error);
    }
  },

  reset: async () => {
    set({ localData: DEFAULT_LOCAL_DATA });
    await asyncStorage.removeItem(STORAGE_KEYS.RATING_LOCAL_DATA);
  },
}));
