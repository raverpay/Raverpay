// lib/utils/toast.ts
import Toast from 'react-native-toast-message';

/**
 * Reusable Toast Notification Utility
 *
 * Provides consistent toast notifications throughout the app.
 * Replaces Alert.alert and throw new Error for user-facing messages.
 */

export interface ToastOptions {
  title?: string;
  message: string;
  duration?: number;
  position?: 'top' | 'bottom';
  onPress?: () => void;
}

class ToastService {
  /**
   * Show success toast
   */
  success(options: ToastOptions | string) {
    const config = typeof options === 'string' ? { message: options } : options;

    Toast.show({
      type: 'success',
      text1: config.title || 'Success',
      text2: config.message,
      position: config.position || 'top',
      visibilityTime: config.duration || 4000,
      onPress: config.onPress,
    });
  }

  /**
   * Show error toast
   */
  error(options: ToastOptions | string) {
    const config = typeof options === 'string' ? { message: options } : options;

    Toast.show({
      type: 'error',
      text1: config.title || 'Error',
      text2: config.message,
      position: config.position || 'top',
      visibilityTime: config.duration || 5000,
      onPress: config.onPress,
    });
  }

  /**
   * Show info toast
   */
  info(options: ToastOptions | string) {
    const config = typeof options === 'string' ? { message: options } : options;

    Toast.show({
      type: 'info',
      text1: config.title || 'Info',
      text2: config.message,
      position: config.position || 'top',
      visibilityTime: config.duration || 4000,
      onPress: config.onPress,
    });
  }

  /**
   * Show warning toast
   */
  warning(options: ToastOptions | string) {
    const config = typeof options === 'string' ? { message: options } : options;

    Toast.show({
      type: 'info', // Using info type for warning, can customize later
      text1: config.title || 'Warning',
      text2: config.message,
      position: config.position || 'top',
      visibilityTime: config.duration || 4000,
      onPress: config.onPress,
    });
  }

  /**
   * Hide current toast
   */
  hide() {
    Toast.hide();
  }

  /**
   * Authentication-specific toasts
   */
  auth = {
    loginSuccess: () => {
      this.success({
        title: 'Welcome Back!',
        message: 'You have been logged in successfully',
        duration: 3000,
      });
    },

    logoutSuccess: () => {
      this.success({
        title: 'Logged Out',
        message: 'You have been logged out successfully',
        duration: 3000,
      });
    },

    registrationSuccess: () => {
      this.success({
        title: 'Account Created!',
        message: 'Please verify your email to continue',
        duration: 4000,
      });
    },

    emailVerified: () => {
      this.success({
        title: 'Email Verified!',
        message: 'Your account is now active',
        duration: 3000,
      });
    },

    phoneVerified: () => {
      this.success({
        title: 'Phone Verified!',
        message: 'Your account is now active',
        duration: 3000,
      });
    },

    verificationCodeSent: (type: 'email' | 'phone') => {
      this.success({
        title: 'Code Sent',
        message: `Verification code sent to your ${type}`,
        duration: 3000,
      });
    },

    passwordResetSuccess: () => {
      this.success({
        title: 'Password Reset',
        message: 'Your password has been reset successfully',
        duration: 3000,
      });
    },

    invalidCredentials: () => {
      this.error({
        title: 'Login Failed',
        message: 'Invalid email or password',
        duration: 4000,
      });
    },

    accountSuspended: () => {
      this.error({
        title: 'Account Suspended',
        message: 'Your account has been suspended. Please contact support.',
        duration: 6000,
      });
    },

    accountInactive: () => {
      this.error({
        title: 'Account Inactive',
        message: 'Your account is inactive. Please contact support to reactivate.',
        duration: 6000,
      });
    },

    sessionExpired: () => {
      this.warning({
        title: 'Session Expired',
        message: 'Your session has expired. Please login again.',
        duration: 4000,
      });
    },

    biometricEnabled: () => {
      this.success({
        title: 'Biometric Enabled',
        message: 'You can now use biometric login',
        duration: 3000,
      });
    },

    biometricDisabled: () => {
      this.info({
        title: 'Biometric Disabled',
        message: 'Biometric login has been disabled',
        duration: 3000,
      });
    },

    invalidVerificationCode: () => {
      this.error({
        title: 'Invalid Code',
        message: 'The verification code you entered is incorrect',
        duration: 4000,
      });
    },
  };

  /**
   * Transaction-specific toasts
   */
  transaction = {
    success: (message?: string) => {
      this.success({
        title: 'Transaction Successful',
        message: message || 'Your transaction was completed successfully',
        duration: 4000,
      });
    },

    failed: (message?: string) => {
      this.error({
        title: 'Transaction Failed',
        message: message || 'Your transaction could not be completed',
        duration: 5000,
      });
    },

    pending: () => {
      this.info({
        title: 'Transaction Pending',
        message: 'Your transaction is being processed',
        duration: 4000,
      });
    },
  };

  /**
   * Network-specific toasts
   */
  network = {
    offline: () => {
      this.error({
        title: 'No Internet',
        message: 'Please check your internet connection',
        duration: 5000,
      });
    },

    connectionError: () => {
      this.error({
        title: 'Connection Error',
        message: 'Failed to connect to server. Please try again.',
        duration: 5000,
      });
    },

    timeout: () => {
      this.error({
        title: 'Request Timeout',
        message: 'The request took too long. Please try again.',
        duration: 5000,
      });
    },
  };

  /**
   * Validation toasts
   */
  validation = {
    required: (field: string) => {
      this.error({
        title: 'Required Field',
        message: `${field} is required`,
        duration: 3000,
      });
    },

    invalid: (field: string) => {
      this.error({
        title: 'Invalid Input',
        message: `Please enter a valid ${field}`,
        duration: 3000,
      });
    },
  };

  /**
   * Cashback-specific toasts
   */
  cashback = {
    earned: (amount: number, serviceType: string) => {
      // Format currency with Naira symbol
      const formattedAmount = `₦${amount.toFixed(2)}`;

      this.success({
        title: '🎉 Cashback Earned!',
        message: `You earned ${formattedAmount} cashback on your ${serviceType} purchase`,
        duration: 5000,
      });
    },

    largeEarning: (amount: number, serviceType: string) => {
      // For cashback amounts >= ₦50, show a special notification
      const formattedAmount = `₦${amount.toFixed(2)}`;

      this.success({
        title: '🎊 Big Cashback Earned!',
        message: `Wow! You just earned ${formattedAmount} cashback on your ${serviceType} purchase`,
        duration: 6000,
      });
    },

    redeemed: (amount: number) => {
      const formattedAmount = `₦${amount.toFixed(2)}`;

      this.success({
        title: 'Cashback Redeemed',
        message: `${formattedAmount} cashback applied to your purchase`,
        duration: 4000,
      });
    },

    insufficientBalance: () => {
      this.error({
        title: 'Insufficient Cashback',
        message: "You don't have enough cashback balance for this redemption",
        duration: 4000,
      });
    },

    expired: (amount: number) => {
      const formattedAmount = `₦${amount.toFixed(2)}`;

      this.warning({
        title: 'Cashback Expired',
        message: `${formattedAmount} cashback has expired due to inactivity`,
        duration: 5000,
      });
    },

    reversed: (amount: number, reason: string) => {
      const formattedAmount = `₦${amount.toFixed(2)}`;

      this.info({
        title: 'Cashback Reversed',
        message: `${formattedAmount} cashback was reversed: ${reason}`,
        duration: 5000,
      });
    },
  };
}

// Export singleton instance
export const toast = new ToastService();

// Export default for convenience
export default toast;
