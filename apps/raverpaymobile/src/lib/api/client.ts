// lib/api/client.ts
import axios, { AxiosError, InternalAxiosRequestConfig, isAxiosError } from 'axios';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { config } from '../../constants/config';
import { SECURE_KEYS, secureStorage } from '../../lib/storage/secure-store';
import { ApiError } from '../../types/api.types';
import { generateIdempotencyKey, requiresIdempotencyKey } from '../../lib/utils/idempotency';

// Session expiration flag to prevent multiple alerts
let isSessionExpiredAlertShowing = false;

// Helper function to show session expired alert only once
const showSessionExpiredAlert = async () => {
  //console.log('[SessionExpired] showSessionExpiredAlert called, flag:', isSessionExpiredAlertShowing);

  // If alert is already showing, don't show another one
  if (isSessionExpiredAlertShowing) {
    // console.log('[SessionExpired] Alert already showing, returning early');
    return;
  }

  // Set flag to prevent multiple alerts
  isSessionExpiredAlertShowing = true;
  //console.log('[SessionExpired] Flag set to true, clearing tokens');

  // Clear all auth data
  await secureStorage.removeItem(SECURE_KEYS.ACCESS_TOKEN);
  await secureStorage.removeItem(SECURE_KEYS.REFRESH_TOKEN);

  // Clear stores
  import('../../store/auth.store').then(({ useAuthStore }) => {
    const { clearTokens } = useAuthStore.getState();
    clearTokens().then(() => {
      // Clear sensitive user data but retain display info (name, email, avatar)
      import('../../store/user.store').then(({ useUserStore }) => {
        useUserStore.getState().clearSensitiveUserData();
      });
      // Clear wallet data (sensitive financial information)
      import('../../store/wallet.store').then(({ useWalletStore }) => {
        useWalletStore.getState().clearWallet();
      });
    });
  });

  // Show alert to user (only once)
  Alert.alert(
    'Session Expired',
    'Your session has expired. Please log in again.',
    [
      {
        text: 'OK',
        onPress: () => {
          // Reset flag after user dismisses alert
          isSessionExpiredAlertShowing = false;
          // Navigate to welcome screen
          router.replace('/(auth)/welcome');
        },
      },
    ],
    { cancelable: false },
  );
};

// Export function to reset the flag (called on successful login)
export const resetSessionExpiredFlag = () => {
  console.log('[SessionExpired] Resetting flag from', isSessionExpiredAlertShowing, 'to false');
  isSessionExpiredAlertShowing = false;
};

// Create axios instance
export const apiClient = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: 60000, // Increased to 60 seconds for VTU operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token and idempotency keys
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const endpoint = config.url || '';
    const method = config.method?.toUpperCase() || '';
    //console.log(`[API Request] ${method} ${endpoint}`);

    const token = await secureStorage.getItem(SECURE_KEYS.ACCESS_TOKEN);

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      //console.log(`[API Request] Added Authorization header to ${endpoint}`);
    } else {
      //console.log(`[API Request] No token found for ${endpoint}`);
    }

    // Add idempotency key for POST/PUT/PATCH requests to idempotent endpoints
    if (
      config.headers &&
      (method === 'POST' || method === 'PUT' || method === 'PATCH') &&
      requiresIdempotencyKey(endpoint)
    ) {
      // Check if idempotency key already exists (for retries)
      if (!config.headers['Idempotency-Key'] && !config.headers['idempotency-key']) {
        try {
          const idempotencyKey = await generateIdempotencyKey();
          config.headers['Idempotency-Key'] = idempotencyKey;
          //console.log(`[API Request] Added Idempotency-Key header to ${endpoint}`);
        } catch (error) {
          console.warn(`[API Request] Failed to generate idempotency key for ${endpoint}:`, error);
          // Continue without idempotency key (fail open)
        }
      }
    }

    return config;
  },
  (error) => {
    //console.error('[API Request] Interceptor error:', error);
    return Promise.reject(error);
  },
);

// Response interceptor - Handle errors and refresh token
apiClient.interceptors.response.use(
  (response) => {
    //console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const endpoint = originalRequest?.url || 'unknown';
    // console.log(`[API Response] Error on ${endpoint}:`, error.response?.status, error.message);

    // Handle 401 (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't try to refresh tokens for public auth endpoints
      // These endpoints handle their own authentication errors
      const publicAuthEndpoints = [
        '/auth/login',
        '/auth/register',
        '/auth/refresh',
        '/auth/logout',
        '/auth/me',
      ];
      const isPublicAuthEndpoint = publicAuthEndpoints.some((path) => endpoint.includes(path));

      // console.log(`[API Response] Checking if ${endpoint} is public auth endpoint:`, isPublicAuthEndpoint);

      if (isPublicAuthEndpoint) {
        // console.log(`[API Response] 401 on public auth endpoint ${endpoint}, skipping token refresh`);
        // Just return the error - let the calling code handle it
        return Promise.reject(error);
      }

      //console.log(`[API Response] 401 detected on ${endpoint}, attempting token refresh`);
      originalRequest._retry = true;

      try {
        const refreshToken = await secureStorage.getItem(SECURE_KEYS.REFRESH_TOKEN);

        if (!refreshToken) {
          // Show session expired alert (only once)
          await showSessionExpiredAlert();

          // Return a user-friendly error
          const authError: ApiError = {
            statusCode: 401,
            message: 'Your session has expired. Please log in again.',
            error: 'AUTHENTICATION_REQUIRED',
          };
          return Promise.reject(authError);
        }

        // Refresh access token
        const { data } = await axios.post(`${config.API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        // Update tokens
        await secureStorage.setItem(SECURE_KEYS.ACCESS_TOKEN, data.accessToken);
        await secureStorage.setItem(SECURE_KEYS.REFRESH_TOKEN, data.refreshToken);

        // Retry original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        //  console.error('Token refresh failed:', refreshError);

        // Show session expired alert (only once)
        await showSessionExpiredAlert();

        // Create user-friendly error message
        const authError: ApiError = {
          statusCode: 401,
          message: 'Your session has expired. Please log in again.',
          error: 'SESSION_EXPIRED',
        };

        return Promise.reject(authError);
      }
    }

    // Handle other errors
    return Promise.reject(error);
  },
);

// API Error handler
export const handleApiError = (error: any): ApiError => {
  // Handle errors returned from interceptor (already formatted as ApiError)
  if (error && error.statusCode && error.message && !isAxiosError(error)) {
    return error;
  }

  if (isAxiosError(error) && error.response) {
    const { status, data } = error.response;
    return {
      statusCode: status,
      message: data.message || 'An error occurred',
      error: data.error,
      errors: data.errors,
    };
  }

  if (isAxiosError(error) && error.request) {
    return {
      statusCode: 0,
      message: 'Network error. Please check your connection.',
    };
  }

  return {
    statusCode: 0,
    message: error.message || 'Unknown error',
  };
};
