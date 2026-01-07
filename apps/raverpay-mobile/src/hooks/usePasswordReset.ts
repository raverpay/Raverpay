// hooks/usePasswordReset.ts
import { useMutation } from '@tanstack/react-query';
import { apiClient, handleApiError } from '@/src/lib/api/client';
import { API_ENDPOINTS } from '@/src/lib/api/endpoints';
import { toast } from '@/src/lib/utils/toast';
import { errorLogger } from '@/src/lib/utils/error-logger';

interface ForgotPasswordRequest {
  email: string;
}

interface VerifyResetCodeRequest {
  email: string;
  code: string;
}

interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
}

export const usePasswordReset = () => {
  // Request password reset
  const forgotPassword = useMutation({
    mutationFn: async ({ email }: ForgotPasswordRequest) => {
      const { data } = await apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
      return data;
    },
    onSuccess: () => {
      toast.success({
        title: 'Reset Code Sent',
        message: 'Please check your email for the reset code',
        duration: 4000,
      });
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      errorLogger.logAuthError(apiError, 'forgot_password');
      toast.error({
        title: 'Failed to Send Code',
        message: apiError.message || 'Could not send reset code. Please try again.',
      });
      throw apiError;
    },
  });

  // Verify reset code
  const verifyResetCode = useMutation({
    mutationFn: async ({ email, code }: VerifyResetCodeRequest) => {
      const { data } = await apiClient.post(API_ENDPOINTS.AUTH.VERIFY_RESET_CODE, { email, code });
      return data;
    },
    onSuccess: () => {
      toast.success({
        title: 'Code Verified',
        message: 'Please enter your new password',
        duration: 3000,
      });
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      errorLogger.logAuthError(apiError, 'verify_reset_code');
      toast.error({
        title: 'Invalid Code',
        message: 'The reset code you entered is incorrect',
      });
      throw apiError;
    },
  });

  // Reset password
  const resetPassword = useMutation({
    mutationFn: async ({ resetToken, newPassword }: ResetPasswordRequest) => {
      const { data } = await apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
        resetToken,
        newPassword,
      });
      return data;
    },
    onSuccess: () => {
      toast.auth.passwordResetSuccess();
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      errorLogger.logAuthError(apiError, 'reset_password');
      toast.error({
        title: 'Password Reset Failed',
        message: apiError.message || 'Could not reset password. Please try again.',
      });
      throw apiError;
    },
  });

  return {
    forgotPassword: forgotPassword.mutateAsync,
    verifyResetCode: verifyResetCode.mutateAsync,
    resetPassword: resetPassword.mutateAsync,

    isRequestingReset: forgotPassword.isPending,
    isVerifyingCode: verifyResetCode.isPending,
    isResettingPassword: resetPassword.isPending,
  };
};
