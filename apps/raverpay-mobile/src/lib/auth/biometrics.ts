// lib/auth/biometrics.ts
import * as LocalAuthentication from 'expo-local-authentication';

export const biometrics = {
  async isAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch {
      return false;
    }
  },

  async getSupportedTypes(): Promise<string[]> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      return types.map((type) => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return 'fingerprint';
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return 'face';
          case LocalAuthentication.AuthenticationType.IRIS:
            return 'iris';
          default:
            return 'unknown';
        }
      });
    } catch {
      return [];
    }
  },

  async authenticate(reason: string = 'Authenticate to continue'): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch {
      return false;
    }
  },

  async getBiometricName(): Promise<string> {
    try {
      const types = await this.getSupportedTypes();
      if (types.includes('face')) {
        return 'Face ID';
      } else if (types.includes('fingerprint')) {
        return 'Touch ID';
      } else if (types.includes('iris')) {
        return 'Iris';
      }
      return 'Biometric';
    } catch {
      return 'Biometric';
    }
  },
};
