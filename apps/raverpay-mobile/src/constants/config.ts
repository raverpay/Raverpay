import Constants from "expo-constants";

// constants/config.ts
export const config = {
  // API Configuration
  API_BASE_URL: __DEV__
    ? process.env.EXPO_PUBLIC_API_URL
    : Constants.expoConfig?.extra?.apiUrl,
  // App Configuration
  APP_NAME: "Raverpay",
  APP_VERSION: "1.0.0",

  // Token Configuration
  ACCESS_TOKEN_EXPIRY: 15 * 60 * 1000, // 15 minutes
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days

  // Query Cache Configuration
  STALE_TIME: {
    DEFAULT: 5 * 60 * 1000, // 5 minutes
    WALLET: 1 * 60 * 1000, // 1 minute
    TRANSACTIONS: 2 * 60 * 1000, // 2 minutes
    PLANS: 60 * 60 * 1000, // 1 hour
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
  },

  // Validation
  VALIDATION: {
    MIN_PASSWORD_LENGTH: 8,
    MIN_AMOUNT: 100, // NGN
    MAX_UPLOAD_SIZE: 5 * 1024 * 1024, // 5MB
  },
};
