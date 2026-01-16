import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { generateIdempotencyKey, requiresIdempotencyKey } from './utils/idempotency';

// Extend Window interface for re-auth token storage
declare global {
  interface Window {
    __reAuthToken?: string;
    __reAuthTokenExpiry?: number;
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor to add auth token and idempotency keys
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add re-authentication token if available and not expired
    if (typeof window !== 'undefined') {
      const reAuthToken = window.__reAuthToken;
      const reAuthTokenExpiry = window.__reAuthTokenExpiry;
      if (reAuthToken && reAuthTokenExpiry && Date.now() < reAuthTokenExpiry) {
        config.headers['X-Recent-Auth-Token'] = reAuthToken;
      } else {
        // Clear expired token
        delete window.__reAuthToken;
        delete window.__reAuthTokenExpiry;
      }
    }

    // Add idempotency key for POST/PUT/PATCH requests to idempotent endpoints
    const endpoint = config.url || '';
    const method = config.method?.toUpperCase() || '';
    if (
      (method === 'POST' || method === 'PUT' || method === 'PATCH') &&
      requiresIdempotencyKey(endpoint) &&
      !config.headers['Idempotency-Key'] &&
      !config.headers['idempotency-key']
    ) {
      try {
        const idempotencyKey = generateIdempotencyKey();
        config.headers['Idempotency-Key'] = idempotencyKey;
      } catch (error) {
        console.warn(`Failed to generate idempotency key for ${endpoint}:`, error);
        // Continue without idempotency key (fail open)
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 428 Precondition Required (Password Change or Re-Auth)
    if (error.response?.status === 428) {
      const errorData = error.response.data as { error?: string; mustChangePassword?: boolean };

      // Password change required - handled by auth provider or login page
      if (errorData.error === 'PasswordChangeRequired' || errorData.mustChangePassword) {
        // Don't reject - let the component handle it
        // The auth provider or login page will show the password change modal
        return Promise.reject(error);
      }

      // Re-authentication required - handled by component using ReAuthModal
      if (errorData.error === 'ReAuthenticationRequired') {
        // Don't reject - let the component handle it
        // Components should use useReAuth hook to show re-auth modal
        return Promise.reject(error);
      }
    }

    // If 401 and we haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');

        // Also clear Zustand persisted state
        if (typeof window !== 'undefined') {
          const { useAuthStore } = await import('@/lib/auth-store');
          useAuthStore.getState().clearAuth();
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
