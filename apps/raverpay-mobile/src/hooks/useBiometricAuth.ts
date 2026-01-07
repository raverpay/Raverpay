// hooks/useBiometricAuth.ts
import { biometrics } from '@/src/lib/auth/biometrics';
import { SECURE_KEYS, secureStorage } from '@/src/lib/storage/secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_EMAIL_KEY = 'biometric_email';

export const useBiometricAuth = () => {
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('Biometric');
  const [savedEmail, setSavedEmail] = useState<string | null>(null);

  // Check if biometric is available on device
  useEffect(() => {
    const checkBiometric = async () => {
      const available = await biometrics.isAvailable();
      setIsBiometricAvailable(available);

      if (available) {
        const type = await biometrics.getBiometricName();
        setBiometricType(type);
      }

      // Check if user has enabled biometric login
      const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      setIsBiometricEnabled(enabled === 'true');

      // Get saved email for biometric login
      const email = await AsyncStorage.getItem(BIOMETRIC_EMAIL_KEY);
      setSavedEmail(email);
    };

    checkBiometric();
  }, []);

  // Enable biometric login
  const enableBiometric = async (email: string, password: string) => {
    try {
      // Store credentials securely
      await secureStorage.setItem(SECURE_KEYS.BIOMETRIC_EMAIL, email);
      await secureStorage.setItem(SECURE_KEYS.BIOMETRIC_PASSWORD, password);

      // Store preference
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      await AsyncStorage.setItem(BIOMETRIC_EMAIL_KEY, email);

      setIsBiometricEnabled(true);
      setSavedEmail(email);

      return true;
    } catch (error) {
      console.error('Error enabling biometric:', error);
      return false;
    }
  };

  // Disable biometric login
  const disableBiometric = async () => {
    try {
      // Remove stored credentials
      await secureStorage.removeItem(SECURE_KEYS.BIOMETRIC_EMAIL);
      await secureStorage.removeItem(SECURE_KEYS.BIOMETRIC_PASSWORD);

      // Remove preference
      await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
      await AsyncStorage.removeItem(BIOMETRIC_EMAIL_KEY);

      setIsBiometricEnabled(false);
      setSavedEmail(null);

      return true;
    } catch (error) {
      console.error('Error disabling biometric:', error);
      return false;
    }
  };

  // Authenticate with biometric
  const authenticateWithBiometric = async (): Promise<{
    success: boolean;
    email?: string;
    password?: string;
    error?: string;
  }> => {
    try {
      if (!isBiometricAvailable) {
        return { success: false, error: 'Biometric not available' };
      }

      if (!isBiometricEnabled) {
        return { success: false, error: 'Biometric login not enabled' };
      }

      // Prompt for biometric authentication
      const authenticated = await biometrics.authenticate(
        `Sign in to Raverpay with ${biometricType}`,
      );

      if (!authenticated) {
        return { success: false, error: 'Authentication failed' };
      }

      // Retrieve stored credentials
      const email = await secureStorage.getItem(SECURE_KEYS.BIOMETRIC_EMAIL);
      const password = await secureStorage.getItem(SECURE_KEYS.BIOMETRIC_PASSWORD);

      if (!email || !password) {
        return { success: false, error: 'No saved credentials found' };
      }

      return {
        success: true,
        email,
        password,
      };
    } catch (error) {
      console.error('Error authenticating with biometric:', error);
      return { success: false, error: 'Authentication error' };
    }
  };

  return {
    isBiometricAvailable,
    isBiometricEnabled,
    biometricType,
    savedEmail,
    enableBiometric,
    disableBiometric,
    authenticateWithBiometric,
  };
};
