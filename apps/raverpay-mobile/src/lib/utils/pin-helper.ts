// src/lib/utils/pin-helper.ts
import { Alert } from 'react-native';
import { router } from 'expo-router';

/**
 * Check if user has set a PIN and prompt them to set it if not
 * @param hasPinSet - Function that returns true if user has PIN set
 * @returns true if PIN is set, false otherwise
 */
export const checkPinSetOrPrompt = (hasPinSet: () => boolean): boolean => {
  if (!hasPinSet()) {
    Alert.alert(
      'PIN Not Set',
      'You need to set a transaction PIN before making purchases. Would you like to set it now?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Set PIN',
          onPress: () => router.push('/set-pin'),
        },
      ],
    );
    return false;
  }
  return true;
};
