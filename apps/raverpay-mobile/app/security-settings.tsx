// app/security-settings.tsx
import { Card, ScreenHeader, Text } from '@/src/components/ui';
import { useBiometricAuth } from '@/src/hooks/useBiometricAuth';
import { useTheme } from '@/src/hooks/useTheme';
import { biometrics } from '@/src/lib/auth/biometrics';
import { toast } from '@/src/lib/utils/toast';
import { useUserStore } from '@/src/store/user.store';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

// Component for transaction biometric toggle
const BiometricTransactionToggle: React.FC = () => {
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [isTransactionBiometricEnabled, setIsTransactionBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('Biometric');

  useEffect(() => {
    const checkBiometric = async () => {
      const available = await biometrics.isAvailable();
      setIsBiometricAvailable(available);

      if (available) {
        const type = await biometrics.getBiometricName();
        setBiometricType(type);
      }

      const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      setIsTransactionBiometricEnabled(enabled === 'true');
    };

    checkBiometric();
  }, []);

  const handleToggle = async () => {
    if (isTransactionBiometricEnabled) {
      // Disable transaction biometrics
      await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
      setIsTransactionBiometricEnabled(false);
      toast.success({
        title: 'Transaction Biometrics',
        message: `${biometricType} for transactions has been disabled`,
      });
    } else {
      // Enable transaction biometrics
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      setIsTransactionBiometricEnabled(true);
      toast.success({
        title: 'Transaction Biometrics',
        message: `${biometricType} for transactions has been enabled`,
      });
    }
  };

  return (
    <View className="p-4">
      <View className="flex-row items-center">
        <View className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 items-center justify-center mr-3">
          <Ionicons name="card" size={20} color="#5B55F6" />
        </View>
        <View className="flex-1">
          <Text variant="bodyMedium">Pay with {biometricType}</Text>
          <Text variant="caption" color="secondary">
            {isBiometricAvailable
              ? 'Use biometrics instead of PIN for transactions'
              : 'Not supported on this device'}
          </Text>
        </View>

        <Switch
          value={isTransactionBiometricEnabled}
          onValueChange={handleToggle}
          disabled={!isBiometricAvailable}
          trackColor={{ false: '#D1D5DB', true: '#5B55F6' }}
          thumbColor={isTransactionBiometricEnabled ? '#FFFFFF' : '#F3F4F6'}
        />
      </View>
    </View>
  );
};

export default function SecuritySettingsScreen() {
  const { isDark } = useTheme();
  const { user } = useUserStore();
  const {
    isBiometricAvailable: isBiometricSupported,
    isBiometricEnabled,
    enableBiometric,
    disableBiometric,
  } = useBiometricAuth();

  // console.log({ user });

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <ScreenHeader title="Security Settings" />

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        {/* Password Section */}
        <View className="mb-6">
          <Text variant="h4" className="mb-2">
            Password
          </Text>
          <Card variant="elevated" className="overflow-hidden">
            <Pressable
              className="flex-row items-center p-4"
              onPress={() => router.push('/change-password')}
            >
              <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                <Ionicons name="lock-closed" size={20} color="#5B55F6" />
              </View>
              <View className="flex-1">
                <Text variant="bodyMedium">Change Password</Text>
                <Text variant="caption" color="secondary">
                  Last changed: {formatDate(user?.lastPasswordChange)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </Pressable>
          </Card>
        </View>

        {/* Transaction PIN Section */}
        <View className="mb-6">
          <Text variant="h4" className="mb-2">
            Transaction PIN
          </Text>
          <Card variant="elevated" className="overflow-hidden">
            <Pressable
              className="flex-row items-center p-4"
              onPress={() => router.push('/change-pin-new')}
            >
              <View className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 items-center justify-center mr-3">
                <Ionicons name="keypad" size={20} color="#5B55F6" />
              </View>
              <View className="flex-1">
                <Text variant="bodyMedium">Change Transaction PIN</Text>
                <Text variant="caption" color="secondary">
                  {user?.pinSetAt ? `Set on ${formatDate(user.pinSetAt)}` : 'Not set'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </Pressable>
          </Card>
        </View>

        {/* Biometric Authentication */}
        <View className="mb-6">
          <Text variant="h4" className="mb-2">
            Biometric Authentication
          </Text>
          <Card variant="elevated" className="overflow-hidden">
            {/* Login Biometrics */}
            <View className="p-4 border-b border-gray-200 dark:border-gray-700">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center mr-3">
                  <Ionicons name="finger-print" size={20} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text variant="bodyMedium">Login with Biometrics</Text>
                  <Text variant="caption" color="secondary">
                    {isBiometricSupported
                      ? 'Quick login with biometrics'
                      : 'Not supported on this device'}
                  </Text>
                </View>

                <Switch
                  value={isBiometricEnabled}
                  onValueChange={async () => {
                    if (isBiometricEnabled) {
                      await disableBiometric();
                      toast.success({
                        title: 'Biometric Authentication',
                        message: 'Biometric login has been disabled',
                      });
                    } else {
                      await enableBiometric(user?.email || '', 'password');
                      toast.success({
                        title: 'Biometric Authentication',
                        message: 'Biometric login has been enabled',
                      });
                    }
                  }}
                  disabled={!isBiometricSupported}
                  trackColor={{ false: '#D1D5DB', true: '#5B55F6' }}
                  thumbColor={isBiometricEnabled ? '#FFFFFF' : '#F3F4F6'}
                />
              </View>
            </View>

            {/* Transaction Biometrics */}
            <BiometricTransactionToggle />
          </Card>
        </View>

        {/* Two-Factor Authentication */}
        {/* <View className="mb-6">
          <Text variant="h3" className="mb-4">
            Two-Factor Authentication
          </Text>
          <Card variant="elevated" className="overflow-hidden">
            <View className="p-4 opacity-50">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center mr-3">
                  <Ionicons name="shield-checkmark" size={20} color="#6B7280" />
                </View>
                <View className="flex-1">
                  <Text variant="bodyMedium">2FA Protection</Text>
                  <Text variant="caption" color="secondary">
                    Coming soon - Additional security layer
                  </Text>
                </View>
                <View className="bg-gray-200 px-3 py-1 rounded-full">
                  <Text
                    variant="caption"
                    className="text-gray-600 font-semibold"
                  >
                    Soon
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        </View> */}

        {/* Login History */}
        {/* <View className="mb-6">
          <Text variant="h3" className="mb-4">
            Login History
          </Text>
          <Card variant="elevated" className="overflow-hidden">
            <View className="p-4 opacity-50">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center mr-3">
                  <Ionicons name="time" size={20} color="#6B7280" />
                </View>
                <View className="flex-1">
                  <Text variant="bodyMedium">Recent Logins</Text>
                  <Text variant="caption" color="secondary">
                    View your login activity
                  </Text>
                </View>
                <View className="bg-gray-200 px-3 py-1 rounded-full">
                  <Text
                    variant="caption"
                    className="text-gray-600 font-semibold"
                  >
                    Soon
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        </View> */}

        {/* DEBUG: Reset Rating Data - Remove this before production */}
        {/* <View className="mb-6">
          <Text variant="h4" className="mb-4 text-red-600">
            🔧 Debug Tools (Remove Later)
          </Text>
          <Card variant="elevated" className="overflow-hidden">
            <Pressable
              className="p-4 active:bg-gray-50 dark:bg-gray-900"
              onPress={async () => {
                try {
                  const { useRatingStore } = await import(
                    "@/src/store/rating.store"
                  );
                  // Reset all local rating data
                  await useRatingStore.getState().updateLocalData({
                    lastPromptDate: null,
                    dismissedPermanently: false,
                    totalPromptsShown: 0,
                    appOpenCount: 0,
                    successfulTransactionCount: 0,
                    manualRatingClicked: false,
                  });
                  toast.success({
                    title: "Debug Reset",
                    message:
                      "Rating data has been cleared. You can test again!",
                  });
                  console.log("🔧 [DEBUG] Rating local data reset");
                } catch (error) {
                  console.error("Failed to reset rating data:", error);
                  toast.error({
                    title: "Reset Failed",
                    message: "Could not reset rating data",
                  });
                }
              }}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center mr-3">
                  <Ionicons name="refresh" size={20} color="#DC2626" />
                </View>
                <View className="flex-1">
                  <Text variant="bodyMedium" className="text-red-600">
                    Reset Rating Data
                  </Text>
                  <Text variant="caption" color="secondary">
                    Clear lastPromptDate and all rating counters
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#DC2626" />
              </View>
            </Pressable>
          </Card>
        </View> */}

        {/* Security Info */}
        <Card variant="outlined" className="p-4 mb-8 border-blue-200 bg-blue-50">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <View className="flex-1 ml-2">
              <Text variant="caption" className="text-blue-800">
                Keep your account secure by using a strong password, enabling biometric
                authentication, and never sharing your PIN with anyone.
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
