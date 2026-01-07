// lib/api/endpoints.ts

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
    FORGOT_PASSWORD: '/auth/forgot-password',
    VERIFY_RESET_CODE: '/auth/verify-reset-code',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_DEVICE: '/auth/verify-device',
  },

  // Users
  USERS: {
    PROFILE: '/users/profile',
    CHANGE_PASSWORD: '/users/change-password',
    VERIFY_BVN: '/users/verify-bvn',
    VERIFY_NIN: '/users/verify-nin',
    SEND_EMAIL_VERIFICATION: '/users/send-email-verification',
    VERIFY_EMAIL: '/users/verify-email',
    SEND_PHONE_VERIFICATION: '/users/send-phone-verification',
    VERIFY_PHONE: '/users/verify-phone',
    SET_PIN: '/users/set-pin',
    VERIFY_PIN: '/users/verify-pin',
    CHANGE_PIN: '/users/change-pin',
    UPLOAD_AVATAR: '/users/upload-avatar',
    DELETE_AVATAR: '/users/avatar',
    REQUEST_ACCOUNT_DELETION: '/users/request-account-deletion',
  },

  // Wallet
  WALLET: {
    GET: '/wallet',
    LIMITS: '/wallet/limits',
    LOCK: '/wallet/lock',
    UNLOCK: '/wallet/unlock',
    TRANSACTIONS: '/wallet/transactions',
    TRANSACTION_DETAIL: (id: string) => `/wallet/transactions/${id}`,
  },

  // Transactions
  TRANSACTIONS: {
    FUND_CARD: '/transactions/fund/card',
    VERIFY: (reference: string) => `/transactions/verify/${reference}`,
    VIRTUAL_ACCOUNT: '/transactions/virtual-account',
    BANKS: '/transactions/banks',
    RESOLVE_ACCOUNT: '/transactions/resolve-account',
    WITHDRAW: '/transactions/withdraw',
    WITHDRAWAL_CONFIG: '/transactions/withdrawal-config',
    WITHDRAWAL_PREVIEW: '/transactions/withdrawal-preview',
    CANCEL: (id: string) => `/transactions/cancel/${id}`,

    // P2P Transfer endpoints
    SET_TAG: '/transactions/set-tag',
    LOOKUP_TAG: (tag: string) => `/transactions/lookup/${tag}`,
    SEND_P2P: '/transactions/send',
    P2P_HISTORY: '/transactions/p2p-history',
  },

  // VTU
  VTU: {
    // Airtime
    AIRTIME_PROVIDERS: '/vtu/airtime/providers',
    AIRTIME_PURCHASE: '/vtu/airtime/purchase',

    // Data
    DATA_PLANS: (network: string) => `/vtu/data/plans/${network}`,
    DATA_SME_PLANS: (network: string) => `/vtu/data/sme-plans/${network}`,
    DATA_PURCHASE: '/vtu/data/purchase',

    // Cable TV
    CABLE_PLANS: (provider: string) => `/vtu/cable-tv/plans/${provider}`,
    CABLE_VERIFY: '/vtu/cable-tv/verify',
    CABLE_PAY: '/vtu/cable-tv/pay',

    // Electricity
    ELECTRICITY_PROVIDERS: '/vtu/electricity/providers',
    ELECTRICITY_VERIFY: '/vtu/electricity/verify',
    ELECTRICITY_PAY: '/vtu/electricity/pay',

    // Showmax
    SHOWMAX_PLANS: '/vtu/showmax/plans', // TODO: Backend needs to implement this endpoint
    SHOWMAX_PAY: '/vtu/showmax/pay',

    // International
    INTERNATIONAL_COUNTRIES: '/vtu/international/countries',
    INTERNATIONAL_PRODUCT_TYPES: (countryCode: string) =>
      `/vtu/international/product-types/${countryCode}`,
    INTERNATIONAL_OPERATORS: (countryCode: string, productTypeId: string) =>
      `/vtu/international/operators/${countryCode}/${productTypeId}`,
    INTERNATIONAL_VARIATIONS: (operatorId: string, productTypeId: string) =>
      `/vtu/international/variations/${operatorId}/${productTypeId}`,
    INTERNATIONAL_PURCHASE: '/vtu/international/purchase',

    // Education Services
    JAMB_VARIATIONS: '/vtu/education/jamb/variations',
    JAMB_VERIFY_PROFILE: '/vtu/education/jamb/verify-profile',
    JAMB_PURCHASE: '/vtu/education/jamb/purchase',
    WAEC_REGISTRATION_VARIATIONS: '/vtu/education/waec-registration/variations',
    WAEC_REGISTRATION_PURCHASE: '/vtu/education/waec-registration/purchase',
    WAEC_RESULT_VARIATIONS: '/vtu/education/waec-result/variations',
    WAEC_RESULT_PURCHASE: '/vtu/education/waec-result/purchase',

    // Orders
    ORDERS: '/vtu/orders',
    ORDER_DETAIL: (orderId: string) => `/vtu/orders/${orderId}`,
    ORDER_BY_REFERENCE: (reference: string) => `/vtu/orders/reference/${reference}`,
    ORDER_RETRY: (orderId: string) => `/vtu/orders/${orderId}/retry`,
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
    DELETE: (id: string) => `/notifications/${id}`,
    PREFERENCES: '/notification-preferences',
    UPDATE_PREFERENCES: '/notification-preferences',
    RESET_PREFERENCES: '/notification-preferences/reset',
    OPT_OUT_CATEGORY: (category: string) => `/notification-preferences/opt-out/${category}`,
    OPT_IN_CATEGORY: (category: string) => `/notification-preferences/opt-out/${category}`,
  },

  // Virtual Accounts (DVA)
  VIRTUAL_ACCOUNTS: {
    REQUEST: '/virtual-accounts/request',
    ME: '/virtual-accounts/me',
    PROVIDERS: '/virtual-accounts/providers',
    REQUERY: '/virtual-accounts/requery',
  },

  // Support System
  SUPPORT: {
    // Conversations
    CONVERSATIONS: '/support/conversations',
    CONVERSATION_DETAIL: (id: string) => `/support/conversations/${id}`,
    CONVERSATION_MESSAGES: (id: string) => `/support/conversations/${id}/messages`,
    CONVERSATION_READ: (id: string) => `/support/conversations/${id}/read`,
    CONVERSATION_RATE: (id: string) => `/support/conversations/${id}/rate`,
    CONVERSATION_CLOSE: (id: string) => `/support/conversations/${id}/close`,

    // Tickets
    TICKETS: '/support/tickets',
    TICKET_DETAIL: (id: string) => `/support/tickets/${id}`,

    // Unread count
    UNREAD_COUNT: '/support/unread-count',
  },

  // Help Center
  HELP: {
    COLLECTIONS: '/help/collections',
    COLLECTION_DETAIL: (id: string) => `/help/collections/${id}`,
    ARTICLES: '/help/articles',
    ARTICLE_DETAIL: (id: string) => `/help/articles/${id}`,
    ARTICLE_BY_SLUG: (slug: string) => `/help/articles/slug/${slug}`,
    SEARCH: '/help/search',
    POPULAR: '/help/popular',
    ARTICLE_HELPFUL: (id: string) => `/help/articles/${id}/helpful`,
    ARTICLE_VIEW: (id: string) => `/help/articles/${id}/view`,
  },

  // Crypto Wallet
  CRYPTO: {
    // Wallet Management
    INITIALIZE: '/v1/crypto/wallet/initialize',
    GET_WALLET: '/v1/crypto/wallet',
    DEPOSIT_INFO: '/v1/crypto/deposit-info',
    SYNC_BALANCES: '/v1/crypto/wallet/sync',

    // Balances
    GET_BALANCE: (token: string) => `/v1/crypto/balance/${token}`,

    // Send
    SEND: '/v1/crypto/send',

    // Transactions
    TRANSACTIONS: '/v1/crypto/transactions',
    TRANSACTION_DETAIL: (id: string) => `/v1/crypto/transactions/${id}`,

    // Conversion
    CONVERT_QUOTE: '/v1/crypto/convert/quote',
    CONVERT: '/v1/crypto/convert',
    CONVERSIONS: '/v1/crypto/conversions',

    // Exchange Rate
    EXCHANGE_RATE: '/v1/crypto/exchange-rate',
  },

  // App Configuration
  APP_CONFIG: {
    RATING_PROMPT: '/app-config/rating-prompt',
  },

  // Circle Wallets (USDC)
  CIRCLE: {
    // Config
    CONFIG: '/circle/config',
    GET_CHAINS: '/circle/chains',

    // Wallets
    CREATE_WALLET: '/circle/wallets',
    GET_WALLETS: '/circle/wallets',
    GET_WALLET: (id: string) => `/circle/wallets/${id}`,
    GET_WALLET_BALANCE: (id: string) => `/circle/wallets/${id}/balance`,
    GET_USDC_BALANCE: (id: string) => `/circle/wallets/${id}/usdc-balance`,
    GET_DEPOSIT_INFO: '/circle/wallets/deposit-info',
    UPDATE_WALLET: (id: string) => `/circle/wallets/${id}`,

    // Transactions
    TRANSFER_USDC: '/circle/transactions/transfer',
    GET_TRANSACTIONS: '/circle/transactions',
    GET_TRANSACTION: (id: string) => `/circle/transactions/${id}`,
    ESTIMATE_FEE: '/circle/transactions/estimate-fee',
    CANCEL_TRANSACTION: (id: string) => `/circle/transactions/${id}/cancel`,
    ACCELERATE_TRANSACTION: (id: string) => `/circle/transactions/${id}/accelerate`,
    VALIDATE_ADDRESS: '/circle/transactions/validate-address',

    // Fees
    GET_FEE_CONFIG: '/circle/fees/config',
    CALCULATE_FEE: '/circle/fees/calculate',
    UPDATE_FEE_CONFIG: '/circle/fees/config',
    GET_FEE_STATS: '/circle/fees/stats',
    GET_FAILED_FEES: '/circle/fees/failed',
    RETRY_FEE: (retryId: string) => `/circle/fees/retry/${retryId}`,

    // CCTP (Cross-Chain)
    CCTP_TRANSFER: '/circle/cctp/transfer',
    GET_CCTP_TRANSFERS: '/circle/cctp/transfers',
    GET_CCTP_TRANSFER: (id: string) => `/circle/cctp/transfers/${id}`,
    CANCEL_CCTP_TRANSFER: (id: string) => `/circle/cctp/transfers/${id}/cancel`,
    ESTIMATE_CCTP_FEE: '/circle/cctp/estimate-fee',
    GET_CCTP_CHAINS: '/circle/cctp/chains',

    USER_CONTROLLED: {
      // User Management
      CREATE_USER: '/circle/user-controlled/users/create',
      CHECK_STATUS: '/circle/user-controlled/users/check-status',

      // Token Management
      GET_USER_TOKEN: (_circleUserId: string) => '/circle/user-controlled/users/token',

      // User Status
      GET_USER_STATUS: (circleUserId: string) =>
        `/circle/user-controlled/users/${circleUserId}/status`,

      // Wallet Management
      INITIALIZE_WALLET: '/circle/user-controlled/wallets/create',
      LIST_WALLETS: '/circle/user-controlled/wallets',
      SYNC_WALLETS: '/circle/user-controlled/wallets/sync',

      // Authentication
      GET_DEVICE_TOKEN: '/circle/user-controlled/auth/email/device-token',

      // Info
      UPDATE_USER_STATUS: (circleUserId: string) =>
        `/circle/user-controlled/users/${circleUserId}/status`,
      GET_USER_BY_USER_ID: (userId: string) => `/circle/user-controlled/users/${userId}`,
      GET_USER_BY_CIRCLE_USER_ID: (circleUserId: string) =>
        `/circle/user-controlled/users/circle/${circleUserId}`,

      // Security Questions
      SAVE_SECURITY_QUESTIONS: (circleUserId: string) =>
        `/circle/user-controlled/users/${circleUserId}/security-questions`,
      GET_SECURITY_QUESTIONS: (circleUserId: string) =>
        `/circle/user-controlled/users/${circleUserId}/security-questions`,

      // Transactions
      CREATE_TRANSACTION: '/circle/user-controlled/transactions/create',
    },
  },
} as const;
