// app/delete-account.tsx
import { Button, Card, Input, ScreenHeader, Text } from '@/src/components/ui';
import { useAuth } from '@/src/hooks/useAuth';
import { useTheme } from '@/src/hooks/useTheme';
import { apiClient } from '@/src/lib/api/client';
import { API_ENDPOINTS } from '@/src/lib/api/endpoints';
import { useWalletStore } from '@/src/store/wallet.store';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

type DeletionReason =
  | 'privacy_concerns'
  | 'not_useful'
  | 'switching_service'
  | 'too_expensive'
  | 'technical_issues'
  | 'other';

type Step = 'warning' | 'reason' | 'password' | 'confirm';

const DELETION_REASONS: {
  value: DeletionReason;
  label: string;
  icon: string;
}[] = [
  {
    value: 'privacy_concerns',
    label: 'Privacy concerns',
    icon: 'shield-outline',
  },
  {
    value: 'not_useful',
    label: 'Not useful for me',
    icon: 'close-circle-outline',
  },
  {
    value: 'switching_service',
    label: 'Switching to another service',
    icon: 'swap-horizontal-outline',
  },
  {
    value: 'too_expensive',
    label: 'Too expensive',
    icon: 'cash-outline',
  },
  {
    value: 'technical_issues',
    label: 'Technical issues',
    icon: 'bug-outline',
  },
  {
    value: 'other',
    label: 'Other reason',
    icon: 'ellipsis-horizontal-outline',
  },
];

export default function DeleteAccountScreen() {
  const { isDark } = useTheme();
  const { logout } = useAuth();
  const { balance } = useWalletStore();
  const [step, setStep] = useState<Step>('warning');
  const [reason, setReason] = useState<DeletionReason | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const walletBalance = balance || 0;
  const hasBalance = walletBalance > 0;

  const handleContinueFromWarning = () => {
    if (hasBalance) {
      Alert.alert(
        'Wallet Not Empty',
        `Please withdraw all funds (₦${walletBalance.toLocaleString()}) before requesting account deletion.`,
        [
          {
            text: 'OK',
          },
        ],
      );
      return;
    }
    setStep('reason');
  };

  const handleContinueFromReason = () => {
    if (!reason) {
      Alert.alert('Select Reason', 'Please select a reason for deleting your account');
      return;
    }

    if (reason === 'other' && !customReason.trim()) {
      Alert.alert('Provide Reason', 'Please tell us why you want to delete your account');
      return;
    }

    setStep('password');
  };

  const handleContinueFromPassword = () => {
    if (!password.trim()) {
      Alert.alert('Enter Password', 'Please enter your password to continue');
      return;
    }

    setStep('confirm');
  };

  const handleDeleteAccount = async () => {
    try {
      setLoading(true);

      await apiClient.post(API_ENDPOINTS.USERS.REQUEST_ACCOUNT_DELETION, {
        password,
        reason,
        customReason: reason === 'other' ? customReason : undefined,
      });

      // Logout user
      await logout();

      // Alert.alert(
      //   "Request Submitted",
      //   "Your account deletion request has been submitted successfully. An admin will review your request.\n\nYou have been logged out and can no longer access your account.",
      //   [
      //     {
      //       text: "OK",
      //       onPress: () => {
      //         router.replace("/(auth)/welcome");
      //       },
      //     },
      //   ],
      //   { cancelable: false }
      // );
    } catch (error: any) {
      Alert.alert(
        'Request Failed',
        error?.response?.data?.message || 'Failed to submit deletion request. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'reason') {
      setStep('warning');
    } else if (step === 'password') {
      setStep('reason');
    } else if (step === 'confirm') {
      setStep('password');
    } else {
      router.back();
    }
  };

  const renderStepIndicator = () => {
    const steps: Step[] = ['warning', 'reason', 'password', 'confirm'];
    const currentIndex = steps.indexOf(step);

    return (
      <View className="flex-row items-center justify-center mb-6">
        {steps.map((s, index) => (
          <React.Fragment key={s}>
            <View
              className={`w-8 h-8 rounded-full items-center justify-center ${
                index <= currentIndex ? 'bg-red-600' : 'bg-gray-300'
              }`}
            >
              <Text
                variant="caption"
                className={`font-semibold ${index <= currentIndex ? 'text-white' : 'text-gray-500'}`}
              >
                {index + 1}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View
                className={`w-8 h-0.5 ${index < currentIndex ? 'bg-red-600' : 'bg-gray-300'}`}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <ScreenHeader title="Delete Account" onBack={handleBack} />

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        {renderStepIndicator()}

        {/* Step 1: Warning */}
        {step === 'warning' && (
          <>
            <Card variant="elevated" className="p-5 mb-6 border-2 border-red-200">
              <View className="items-center mb-4">
                <View className="w-20 h-20 rounded-full bg-red-100 items-center justify-center mb-3">
                  <Ionicons name="warning" size={40} color="#EF4444" />
                </View>
                <Text variant="h3" align="center" className="text-red-600 mb-2">
                  Are you sure?
                </Text>
                <Text variant="body" color="secondary" align="center">
                  Deleting your account is a serious action. Please read the consequences below.
                </Text>
              </View>

              <View className="space-y-3">
                {[
                  'Your account will be deactivated immediately',
                  "You won't be able to login after submission",
                  'An admin will review your request',
                  'Your wallet must be empty (₦0 balance)',
                  'Data will be retained for 30 days (compliance)',
                  'This action cannot be undone',
                ].map((consequence, index) => (
                  <View key={index} className="flex-row items-start">
                    <Ionicons name="alert-circle" size={16} color="#EF4444" className="mt-0.5" />
                    <Text variant="caption" className="text-red-800 ml-2 flex-1">
                      {consequence}
                    </Text>
                  </View>
                ))}
              </View>

              {hasBalance && (
                <View className="mt-4 bg-red-50 border border-red-300 p-3 rounded-lg">
                  <Text variant="caption" className="text-red-800 font-semibold text-center">
                    ⚠️ Wallet Balance: ₦{walletBalance.toLocaleString()}
                  </Text>
                  <Text variant="caption" className="text-red-700 text-center mt-1">
                    Please withdraw all funds first
                  </Text>
                </View>
              )}
            </Card>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleContinueFromWarning}
              className="mb-4 bg-red-600"
            >
              I Understand, Continue
            </Button>

            <Button variant="outline" size="lg" fullWidth onPress={() => router.back()}>
              Cancel
            </Button>
          </>
        )}

        {/* Step 2: Reason Selection */}
        {step === 'reason' && (
          <>
            <Card variant="elevated" className="p-5 mb-6">
              <Text variant="h3" className="mb-2">
                Why are you leaving?
              </Text>
              <Text variant="body" color="secondary" className="mb-4">
                Your feedback helps us improve. Please select a reason:
              </Text>

              <View className="space-y-2">
                {DELETION_REASONS.map((r) => (
                  <Pressable
                    key={r.value}
                    onPress={() => setReason(r.value)}
                    className={`flex-row items-center p-3 rounded-lg border mb-4 ${
                      reason === r.value ? 'bg-red-50 border-red-600' : 'bg-white border-gray-300'
                    }`}
                  >
                    <View
                      className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-3 ${
                        reason === r.value ? 'border-red-600' : 'border-gray-300'
                      }`}
                    >
                      {reason === r.value && <View className="w-3 h-3 rounded-full bg-red-600" />}
                    </View>
                    <Ionicons
                      name={r.icon as any}
                      size={20}
                      color={reason === r.value ? '#EF4444' : '#6B7280'}
                      className="mr-2"
                    />
                    <Text variant="bodyMedium" className={reason === r.value ? 'text-red-600' : ''}>
                      {r.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {reason === 'other' && (
                <View className="mt-4">
                  <Input
                    label="Please tell us more"
                    value={customReason}
                    onChangeText={setCustomReason}
                    placeholder="Enter your reason..."
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}
            </Card>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleContinueFromReason}
              className="mb-4 bg-red-600"
              disabled={!reason || (reason === 'other' && !customReason.trim())}
            >
              Next
            </Button>

            <Button variant="outline" size="lg" fullWidth onPress={() => setStep('warning')}>
              Back
            </Button>
          </>
        )}

        {/* Step 3: Password Confirmation */}
        {step === 'password' && (
          <>
            <Card variant="elevated" className="p-5 mb-6">
              <View className="items-center mb-4">
                <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-3">
                  <Ionicons name="lock-closed" size={30} color="#EF4444" />
                </View>
                <Text variant="h3" align="center" className="mb-2">
                  Confirm it&apos;s you
                </Text>
                <Text variant="body" color="secondary" align="center">
                  Enter your password to verify your identity
                </Text>
              </View>

              <View className="relative">
                <Input
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  leftIcon="lock-closed-outline"
                />
              </View>
            </Card>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleContinueFromPassword}
              className="mb-4 bg-red-600"
              disabled={!password.trim()}
            >
              Next
            </Button>

            <Button variant="outline" size="lg" fullWidth onPress={() => setStep('reason')}>
              Back
            </Button>
          </>
        )}

        {/* Step 4: Final Confirmation */}
        {step === 'confirm' && (
          <>
            <Card variant="elevated" className="p-5 mb-6 border-2 border-red-600">
              <View className="items-center mb-4">
                <View className="w-20 h-20 rounded-full bg-red-600 items-center justify-center mb-3">
                  <Ionicons name="trash" size={40} color="white" />
                </View>
                <Text variant="h3" align="center" className="text-red-600 mb-2">
                  Final Confirmation
                </Text>
                <Text variant="body" color="secondary" align="center">
                  This is your last chance. Are you absolutely sure you want to delete your account?
                </Text>
              </View>

              <View className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg mb-4">
                <Text variant="caption" className="font-semibold mb-2">
                  What happens next:
                </Text>
                <View className="space-y-2">
                  {[
                    'You will be logged out immediately',
                    'Your account will be locked',
                    'Admin will review within 24-48 hours',
                    "You'll receive an email notification",
                  ].map((item, index) => (
                    <View key={index} className="flex-row items-start">
                      <Text variant="caption" color="secondary" className="mr-2">
                        {index + 1}.
                      </Text>
                      <Text variant="caption" color="secondary" className="flex-1">
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className="bg-red-50 border border-red-200 p-3 rounded-lg">
                <Text variant="caption" className="text-red-800 text-center font-semibold">
                  ⚠️ This action cannot be undone!
                </Text>
              </View>
            </Card>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleDeleteAccount}
              loading={loading}
              className="mb-4 bg-red-600"
            >
              Yes, Delete My Account
            </Button>

            <Button
              variant="outline"
              size="lg"
              fullWidth
              onPress={() => setStep('password')}
              disabled={loading}
              className="mb-4"
            >
              Back
            </Button>

            <Button
              variant="ghost"
              size="lg"
              fullWidth
              onPress={() => router.back()}
              disabled={loading}
            >
              Cancel, Keep My Account
            </Button>
          </>
        )}

        <View className="h-8" />
      </ScrollView>
    </View>
  );
}
