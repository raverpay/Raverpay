// hooks/useAuth.ts
import {
  apiClient,
  handleApiError,
  resetSessionExpiredFlag,
} from "@/src/lib/api/client";
import { API_ENDPOINTS } from "@/src/lib/api/endpoints";
import { SECURE_KEYS, secureStorage } from "@/src/lib/storage/secure-store";
import { errorLogger } from "@/src/lib/utils/error-logger";
import { toast } from "@/src/lib/utils/toast";
import { useAuthStore } from "@/src/store/auth.store";
import { useOnboardingStore } from "@/src/store/onboarding.store";
import { useUserStore } from "@/src/store/user.store";
import { useWalletStore } from "@/src/store/wallet.store";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from "@/src/types/api.types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useAuth = () => {
  const queryClient = useQueryClient();
  const { setTokens, clearTokens, isAuthenticated } = useAuthStore();
  const { setUser, clearUser } = useUserStore();
  const { clearWallet } = useWalletStore();
  const { setHasSeenWelcome } = useOnboardingStore();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest & { deviceInfo?: any }) => {
      // console.log(
      //   "[useAuth] Login mutation started with identifier:",
      //   credentials.identifier
      // );
      const { data } = await apiClient.post<AuthResponse>(
        API_ENDPOINTS.AUTH.LOGIN,
        credentials
      );
      // console.log('[useAuth] Login API call successful, received tokens');
      return data;
    },
    onSuccess: async (data) => {
      // console.log('[useAuth] Login onSuccess, user status:', data.user.status);

      // Check if device verification is required
      if (data.requiresDeviceVerification) {
        // Don't set tokens or navigate - return data for device verification
        return data;
      }

      // Check user status before allowing login
      if (data.user.status === "SUSPENDED") {
        // console.log('[useAuth] User is SUSPENDED, rejecting login');
        toast.auth.accountSuspended();
        errorLogger.logAuthError(new Error("Account suspended"), "login");
        throw new Error("ACCOUNT_SUSPENDED");
      }

      if (data.user.status === "INACTIVE") {
        // console.log('[useAuth] User is INACTIVE, rejecting login');
        toast.auth.accountInactive();
        errorLogger.logAuthError(new Error("Account inactive"), "login");
        throw new Error("ACCOUNT_INACTIVE");
      }

      console.log("[useAuth] 🔑 Setting tokens in store");
      if (data.accessToken && data.refreshToken) {
        await setTokens(data.accessToken, data.refreshToken);
        setUser(data.user);
        console.log("[useAuth] 👤 User set:", {
          email: data.user.email,
          emailVerified: data.user.emailVerified,
        });
        queryClient.invalidateQueries({ queryKey: ["user"] });

        // Mark onboarding as complete on successful login
        console.log(
          "[useAuth] ✅ Marking onboarding as seen (user has logged in)"
        );
        setHasSeenWelcome(true);

        // Reset session expired flag on successful login
        console.log("[useAuth] 🔄 Resetting session expired flag");
        resetSessionExpiredFlag();

        // Show success toast
        toast.auth.loginSuccess();
        console.log(
          "[useAuth] ✅ Login completed successfully - returning user data for navigation"
        );
      }
    },
    onError: (error) => {
      // console.log('[useAuth] Login onError triggered, error:', error);
      const apiError = handleApiError(error);
      console.log("[useAuth] Handled API error:", apiError);
      errorLogger.logAuthError(new Error(apiError.message), "login");

      // Handle validation errors (400 Bad Request with errors array or object)
      if (apiError.errors) {
        let errorMessage: string;

        if (Array.isArray(apiError.errors)) {
          // If it's already an array of strings
          errorMessage = apiError.errors.join("\n");
        } else if (typeof apiError.errors === "object") {
          // If it's Record<string, string[]>, flatten all error arrays
          errorMessage = Object.values(apiError.errors).flat().join("\n");
        } else {
          // Fallback for unexpected types
          errorMessage = String(apiError.errors);
        }

        toast.error({
          title: "Validation Error",
          message: errorMessage,
        });
        throw apiError;
      }

      // Handle authentication/session errors (401)
      if (apiError.statusCode === 401) {
        if (
          apiError.error === "AUTHENTICATION_REQUIRED" ||
          apiError.error === "SESSION_EXPIRED"
        ) {
          toast.error({
            title: "Authentication Required",
            message: apiError.message || "Please log in to continue.",
          });
        } else {
          // Check if there's a specific error message (like account deletion, etc.)
          // Only show generic invalid credentials if message is generic or missing
          const isGenericCredentialsError =
            !apiError.message ||
            apiError.message.toLowerCase().includes("invalid") ||
            apiError.message.toLowerCase().includes("credentials") ||
            apiError.message.toLowerCase().includes("email or password") ||
            apiError.message.toLowerCase().includes("incorrect");

          if (isGenericCredentialsError) {
            toast.auth.invalidCredentials();
          } else {
            // Show the specific error message from the API
            toast.error({
              title: "Login Failed",
              message: apiError.message,
            });
          }
        }
        throw apiError;
      }

      // Show user-friendly error toast for other errors
      // Check if it's a credentials-related error
      const isCredentialsError =
        apiError.message?.toLowerCase().includes("credentials") ||
        apiError.message?.toLowerCase().includes("password") ||
        apiError.message?.toLowerCase().includes("invalid email") ||
        apiError.message?.toLowerCase().includes("incorrect password");

      if (isCredentialsError) {
        toast.auth.invalidCredentials();
      } else {
        // Show the specific error message
        toast.error({
          title: "Login Failed",
          message: apiError.message || "An error occurred during login",
        });
      }

      throw apiError;
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterRequest) => {
      const { data } = await apiClient.post<AuthResponse>(
        API_ENDPOINTS.AUTH.REGISTER,
        userData
      );
      return data;
    },
    onSuccess: async (data) => {
      if (data.accessToken && data.refreshToken) {
        await setTokens(data.accessToken, data.refreshToken);
      }
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ["user"] });

      // Reset session expired flag on successful registration
      resetSessionExpiredFlag();

      // Show success toast
      toast.auth.registrationSuccess();
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      errorLogger.logAuthError(new Error(apiError.message), "register");

      // Show user-friendly error toast
      toast.error({
        title: "Registration Failed",
        message: apiError.message || "An error occurred during registration",
      });

      throw apiError;
    },
  });

  // Get current user
  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data } = await apiClient.get<User>(API_ENDPOINTS.AUTH.ME);
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Helper to clear all biometric data
  const clearBiometricData = async () => {
    try {
      // Clear biometric credentials from SecureStore
      await secureStorage.removeItem(SECURE_KEYS.BIOMETRIC_EMAIL);
      await secureStorage.removeItem(SECURE_KEYS.BIOMETRIC_PASSWORD);

      // Clear biometric preferences from AsyncStorage
      await AsyncStorage.removeItem("biometric_enabled");
      await AsyncStorage.removeItem("biometric_email");
    } catch {
      // console.error("[useAuth] Error clearing biometric data:", error);
      // Don't throw - we want logout to succeed even if this fails
    }
  };

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      // console.log('[useAuth] Logout mutation started');
      // Get refresh token from secure storage
      const refreshToken = await secureStorage.getItem(
        SECURE_KEYS.REFRESH_TOKEN
      );

      // Try to logout from server (optional - don't fail if it errors)
      try {
        if (refreshToken) {
          // console.log('[useAuth] Calling logout API endpoint');
          await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT, {
            refreshToken,
          });
          // console.log('[useAuth] Logout API call successful');
        } else {
          // console.log('[useAuth] No refresh token found, skipping API call');
        }
      } catch {
        // console.log('[useAuth] Logout API call failed (ignoring):', error);
        // Ignore server errors - we'll logout locally anyway
      }
    },
    onSuccess: async () => {
      // console.log('[useAuth] Logout success - clearing all data');
      // Clear all local data
      await clearTokens();
      await clearBiometricData();
      clearUser();
      clearWallet();
      queryClient.clear();

      // console.log('[useAuth] All data cleared, isAuthenticated should be false now');
      // Show success toast
      toast.auth.logoutSuccess();
    },
    onError: async () => {
      // console.log('[useAuth] Logout error - clearing all data locally');
      // Logout locally even if API call fails
      await clearTokens();
      await clearBiometricData();
      clearUser();
      clearWallet();
      queryClient.clear();

      // console.log("[useAuth] All data cleared after error");
      // Still show success since local logout worked
      toast.auth.logoutSuccess();
    },
  });

  return {
    // Mutations
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,

    // States
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isAuthenticated,
    user,
    isLoadingUser,

    // Errors
    loginError: loginMutation.error,
    registerError: registerMutation.error,
  };
};
