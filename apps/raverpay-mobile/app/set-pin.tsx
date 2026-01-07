// app/set-pin.tsx
import { Button, Card, Input, Text } from '@/src/components/ui';
import { useSetPin } from '@/src/hooks/usePin';
import { useTheme } from '@/src/hooks/useTheme';
import { useUserStore } from '@/src/store/user.store';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';

const WEAK_PINS = [
  '0000',
  '1111',
  '2222',
  '3333',
  '4444',
  '5555',
  '6666',
  '7777',
  '8888',
  '9999',
  '1234',
  '4321',
];

export default function SetPinScreen() {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const { updateUser } = useUserStore();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  const { mutate: setPinMutation, isPending } = useSetPin();

  const validatePin = (): string | null => {
    if (!pin || pin.length !== 4) {
      return 'PIN must be exactly 4 digits';
    }

    if (!/^\d{4}$/.test(pin)) {
      return 'PIN must contain only digits';
    }

    if (WEAK_PINS.includes(pin)) {
      return 'PIN is too weak. Please choose a more secure PIN';
    }

    if (!confirmPin || confirmPin.length !== 4) {
      return 'Please confirm your PIN';
    }

    if (pin !== confirmPin) {
      return 'PINs do not match';
    }

    return null;
  };

  const handleSetPin = () => {
    const error = validatePin();
    if (error) {
      Alert.alert('Invalid PIN', error);
      return;
    }

    setPinMutation(
      { pin, confirmPin },
      {
        onSuccess: (data) => {
          // Update user store with pinSetAt timestamp
          updateUser({
            pinSetAt: data.pinSetAt || new Date().toISOString(),
          });

          // Invalidate pin-status and profile queries
          queryClient.invalidateQueries({ queryKey: ['pin-status'] });
          queryClient.invalidateQueries({ queryKey: ['user-profile'] });

          // Navigate back or to home
          Alert.alert('Success!', 'Your transaction PIN has been set successfully', [
            {
              text: 'OK',
              onPress: () => {
                // Check if we can go back, otherwise go to home
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)');
                }
              },
            },
          ]);
        },
      },
    );
  };

  const isPinValid = pin.length === 4 && confirmPin.length === 4 && pin === confirmPin;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View className="bg-white dark:bg-gray-800 pt-12 pb-6 px-5 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center">
          {router.canGoBack() && (
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
          )}
          <View className="flex-1">
            <Text variant="h3">Set Transaction PIN</Text>
            <Text variant="caption" color="secondary" className="mt-1">
              Create a 4-digit PIN for secure transactions
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 400 }}
      >
        {/* Info Card */}
        <Card variant="elevated" className="p-4 mb-6 bg-purple-50 dark:bg-purple-900/20">
          <View className="flex-row items-start">
            <Ionicons name="lock-closed" size={20} color="#5B55F6" />
            <View className="ml-3 flex-1">
              <Text variant="body" weight="semibold" className="mb-2">
                Why do I need a PIN?
              </Text>
              <Text variant="caption" color="secondary">
                Your transaction PIN is required to authorize all payments and VTU purchases. This
                keeps your wallet secure.
              </Text>
            </View>
          </View>
        </Card>

        {/* PIN Input */}
        <View className="mb-4">
          <Input
            label="Enter PIN"
            placeholder="Enter 4-digit PIN"
            value={pin}
            onChangeText={setPin}
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry={!showPin}
            leftIcon="lock-closed-outline"
            rightIcon={showPin ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShowPin(!showPin)}
          />
        </View>

        {/* Confirm PIN Input */}
        <View className="mb-6">
          <Input
            label="Confirm PIN"
            placeholder="Re-enter 4-digit PIN"
            value={confirmPin}
            onChangeText={setConfirmPin}
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry={!showConfirmPin}
            leftIcon="lock-closed-outline"
            rightIcon={showConfirmPin ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShowConfirmPin(!showConfirmPin)}
          />
        </View>

        {/* PIN Requirements */}
        <Card variant="elevated" className="p-4 mb-6">
          <Text variant="body" weight="semibold" className="mb-3">
            PIN Requirements:
          </Text>
          <View className="space-y-2">
            <View className="flex-row items-center mb-2">
              <Ionicons
                name={pin.length === 4 ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={pin.length === 4 ? '#10B981' : '#9CA3AF'}
              />
              <Text variant="caption" color="secondary" className="ml-2">
                Must be exactly 4 digits
              </Text>
            </View>
            <View className="flex-row items-center mb-2">
              <Ionicons
                name={pin && /^\d+$/.test(pin) ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={pin && /^\d+$/.test(pin) ? '#10B981' : '#9CA3AF'}
              />
              <Text variant="caption" color="secondary" className="ml-2">
                Only numbers allowed
              </Text>
            </View>
            <View className="flex-row items-center mb-2">
              <Ionicons
                name={pin && !WEAK_PINS.includes(pin) ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={pin && !WEAK_PINS.includes(pin) ? '#10B981' : '#9CA3AF'}
              />
              <Text variant="caption" color="secondary" className="ml-2">
                Avoid weak PINs (0000, 1234, etc.)
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons
                name={
                  pin && confirmPin && pin === confirmPin ? 'checkmark-circle' : 'ellipse-outline'
                }
                size={16}
                color={pin && confirmPin && pin === confirmPin ? '#10B981' : '#9CA3AF'}
              />
              <Text variant="caption" color="secondary" className="ml-2">
                PINs must match
              </Text>
            </View>
          </View>
        </Card>

        {/* Set PIN Button */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleSetPin}
          disabled={!isPinValid || isPending}
          loading={isPending}
          className="mb-8"
        >
          Set PIN
        </Button>
      </ScrollView>
    </View>
  );
}
