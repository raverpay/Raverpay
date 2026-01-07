// hooks/useVerification.ts
import { apiClient, handleApiError } from '@/src/lib/api/client';
import { API_ENDPOINTS } from '@/src/lib/api/endpoints';
import { errorLogger } from '@/src/lib/utils/error-logger';
import { toast } from '@/src/lib/utils/toast';
import { useUserStore } from '@/src/store/user.store';
import { useMutation } from '@tanstack/react-query';

interface VerifyCodeRequest {
  code: string;
}

export const useVerification = () => {
  const { updateUser } = useUserStore();

  // Send email verification
  const sendEmailVerification = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post(API_ENDPOINTS.USERS.SEND_EMAIL_VERIFICATION);
      return data;
    },
    onSuccess: () => {
      toast.auth.verificationCodeSent('email');
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      errorLogger.logAuthError(apiError, 'send_email_verification');
      toast.error({
        title: 'Failed to Send Code',
        message: 'Could not send verification code to your email',
      });
      throw apiError;
    },
  });

  // Verify email
  const verifyEmail = useMutation({
    mutationFn: async ({ code }: VerifyCodeRequest) => {
      const { data } = await apiClient.post(API_ENDPOINTS.USERS.VERIFY_EMAIL, {
        code,
      });
      return data;
    },
    onSuccess: (data) => {
      updateUser({
        emailVerified: true,
        kycTier: data.kycTier,
      });
      toast.auth.emailVerified();
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      errorLogger.logAuthError(apiError, 'verify_email');
      toast.auth.invalidVerificationCode();
      throw apiError;
    },
  });

  // Send phone verification
  const sendPhoneVerification = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post(API_ENDPOINTS.USERS.SEND_PHONE_VERIFICATION);
      return data;
    },
    onSuccess: () => {
      toast.auth.verificationCodeSent('phone');
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      errorLogger.logAuthError(apiError, 'send_phone_verification');
      toast.error({
        title: 'Failed to Send SMS',
        message: 'Could not send verification code to your phone',
      });
      throw apiError;
    },
  });

  // Verify phone
  const verifyPhone = useMutation({
    mutationFn: async ({ code }: VerifyCodeRequest) => {
      const { data } = await apiClient.post(API_ENDPOINTS.USERS.VERIFY_PHONE, {
        code,
      });
      return data;
    },
    onSuccess: (data) => {
      updateUser({
        phoneVerified: true,
        kycTier: data.kycTier,
      });
      toast.auth.phoneVerified();
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      errorLogger.logAuthError(apiError, 'verify_phone');
      toast.auth.invalidVerificationCode();
      throw apiError;
    },
  });

  return {
    // Email verification
    sendEmailVerification: sendEmailVerification.mutateAsync,
    verifyEmail: verifyEmail.mutateAsync,
    isSendingEmail: sendEmailVerification.isPending,
    isVerifyingEmail: verifyEmail.isPending,

    // Phone verification
    sendPhoneVerification: sendPhoneVerification.mutateAsync,
    verifyPhone: verifyPhone.mutateAsync,
    isSendingPhone: sendPhoneVerification.isPending,
    isVerifyingPhone: verifyPhone.isPending,
  };
};
