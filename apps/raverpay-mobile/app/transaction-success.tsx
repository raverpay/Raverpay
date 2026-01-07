// app/transaction-success.tsx
import { Button, Text } from '@/src/components/ui';
import { useTheme } from '@/src/hooks/useTheme';
import { formatCurrency } from '@/src/lib/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface TransactionDetail {
  label: string;
  value: string;
  highlight?: boolean;
}

export default function TransactionSuccessScreen() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  //   console.log("[TransactionSuccess] Screen rendered with params:", params);

  // Parse the data from route params
  const serviceType = params.serviceType as string;
  const amount = parseFloat(params.amount as string) || 0;
  const reference = params.reference as string;
  const cashbackEarned = parseFloat(params.cashbackEarned as string) || 0;
  const cashbackRedeemed = parseFloat(params.cashbackRedeemed as string) || 0;
  const meterToken = params.meterToken as string;
  const voucherCode = params.voucherCode as string;
  const jambPin = params.jambPin as string;
  const waecToken = params.waecToken as string;
  const waecCards = params.waecCards ? JSON.parse(params.waecCards as string) : null;

  // Parse details JSON string
  const details: TransactionDetail[] = params.details ? JSON.parse(params.details as string) : [];

  const handleDone = () => {
    // console.log(
    //   "[TransactionSuccess] Done button pressed, navigating to home..."
    // );
    router.replace('/(tabs)' as any);
  };

  const handleCopyToken = async () => {
    if (meterToken) {
      await Clipboard.setStringAsync(meterToken);
      Alert.alert('Token Copied', 'Meter token copied to clipboard!');
    }
  };

  const handleCopyVoucher = async () => {
    if (voucherCode) {
      await Clipboard.setStringAsync(voucherCode);
      Alert.alert('Voucher Copied', 'Voucher code copied to clipboard!');
    }
  };

  const handleCopyJambPin = async () => {
    if (jambPin) {
      await Clipboard.setStringAsync(jambPin);
      Alert.alert('PIN Copied', 'JAMB PIN copied to clipboard!');
    }
  };

  const handleCopyWaecToken = async () => {
    if (waecToken) {
      await Clipboard.setStringAsync(waecToken);
      Alert.alert('Token Copied', 'WAEC token copied to clipboard!');
    }
  };

  const handleCopyWaecCard = async (serial: string, pin: string) => {
    await Clipboard.setStringAsync(`Serial: ${serial}\nPIN: ${pin}`);
    Alert.alert('Copied!', 'Card details copied to clipboard!');
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: false, // Disable swipe back gesture
        }}
      />
      <View className="flex-1 bg-white dark:bg-gray-800" style={{ paddingTop: insets.top }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />

        {/* Header */}
        <View className="px-5 py-4 border-b border-gray-100">
          <Text variant="h3">Transaction Complete</Text>
        </View>

        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          {/* Success Icon */}
          <View className="items-center my-8">
            <View className="w-12 h-12 rounded-full bg-green-100 items-center justify-center mb-4">
              <Ionicons name="checkmark-circle" size={28} color="#22C55E" />
            </View>
            <Text variant="h3" align="center" className="mb-2">
              Transaction Successful!
            </Text>
            <Text variant="body" color="secondary" align="center">
              Your {serviceType?.toLowerCase() || 'transaction'} was completed successfully
            </Text>
          </View>

          {/* Transaction Amount */}
          <View className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700 items-center">
            <Text variant="caption" className="text-gray-400 mb-1">
              Amount
            </Text>
            <Text variant="h1" className="text-[#5B55F6]">
              {formatCurrency(amount)}
            </Text>
          </View>

          {/* Service Type */}
          <View className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 mb-4">
            <Text variant="caption" color="secondary" className="mb-1">
              Service Type
            </Text>
            <Text variant="bodyMedium" weight="semibold">
              {serviceType}
            </Text>
          </View>

          {/* Transaction Details */}
          {details.length > 0 && (
            <View className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-4">
              {details.map((detail, index) => (
                <View
                  key={index}
                  className={`flex-row items-center justify-between ${
                    index !== details.length - 1 ? 'mb-3 pb-3 border-b border-gray-200' : ''
                  }`}
                >
                  <Text variant="body" color="secondary">
                    {detail.label}
                  </Text>
                  <Text
                    variant={detail.highlight ? 'bodyMedium' : 'body'}
                    weight={detail.highlight ? 'semibold' : 'regular'}
                    className={detail.highlight ? 'text-[#5B55F6]' : ''}
                    style={{ maxWidth: '60%', textAlign: 'right' }}
                  >
                    {detail.value}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Meter Token (Electricity) */}
          {meterToken && (
            <View className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text variant="caption" className="text-yellow-800 dark:text-yellow-400">
                  Meter Token
                </Text>
                <TouchableOpacity
                  onPress={handleCopyToken}
                  className="flex-row items-center bg-yellow-100 dark:bg-yellow-900/40 px-3 py-1 rounded-full"
                >
                  <Ionicons name="copy-outline" size={16} color="#92400E" />
                  <Text
                    variant="caption"
                    weight="semibold"
                    className="text-yellow-900 dark:text-yellow-300 ml-1"
                  >
                    Copy
                  </Text>
                </TouchableOpacity>
              </View>
              <Text
                variant="h4"
                weight="bold"
                className="text-yellow-900 dark:text-yellow-200 tracking-wider"
              >
                {meterToken}
              </Text>
            </View>
          )}

          {/* JAMB PIN */}
          {jambPin && (
            <View className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text variant="caption" className="text-blue-800 dark:text-blue-400">
                  JAMB PIN
                </Text>
                <TouchableOpacity
                  onPress={handleCopyJambPin}
                  className="flex-row items-center bg-blue-100 dark:bg-blue-900/40 px-3 py-1 rounded-full"
                >
                  <Ionicons name="copy-outline" size={16} color={isDark ? '#A78BFA' : '#6B21A8'} />
                  <Text
                    variant="caption"
                    weight="semibold"
                    className="text-blue-900 dark:text-blue-300 ml-1"
                  >
                    Copy
                  </Text>
                </TouchableOpacity>
              </View>
              <Text
                variant="h4"
                weight="bold"
                className="text-blue-900 dark:text-blue-200 tracking-wider"
              >
                {jambPin}
              </Text>
            </View>
          )}

          {/* WAEC Registration Token */}
          {waecToken && (
            <View className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text variant="caption" className="text-green-800 dark:text-green-400">
                  WAEC Registration Token
                </Text>
                <TouchableOpacity
                  onPress={handleCopyWaecToken}
                  className="flex-row items-center bg-green-100 dark:bg-green-900/40 px-3 py-1 rounded-full"
                >
                  <Ionicons name="copy-outline" size={16} color={isDark ? '#A78BFA' : '#6B21A8'} />
                  <Text
                    variant="caption"
                    weight="semibold"
                    className="text-green-900 dark:text-green-300 ml-1"
                  >
                    Copy
                  </Text>
                </TouchableOpacity>
              </View>
              <Text
                variant="h4"
                weight="bold"
                className="text-green-900 dark:text-green-200 tracking-wider"
              >
                {waecToken}
              </Text>
            </View>
          )}

          {/* WAEC Result Checker Cards */}
          {waecCards && Array.isArray(waecCards) && waecCards.length > 0 && (
            <View className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-4">
              <View className="flex-row items-center mb-3">
                <Ionicons name="card" size={20} color="#16A34A" />
                <Text
                  variant="bodyMedium"
                  weight="semibold"
                  className="text-green-800 dark:text-green-400 ml-2"
                >
                  Result Checker Card{waecCards.length > 1 ? 's' : ''}
                </Text>
              </View>
              {waecCards.map((card: any, index: number) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleCopyWaecCard(card.Serial, card.Pin)}
                  className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-dashed border-green-300 dark:border-green-700 mb-2"
                >
                  <View className="flex-row justify-between mb-1">
                    <Text variant="caption" color="secondary">
                      Serial:
                    </Text>
                    <Text variant="body" weight="medium" className="font-mono">
                      {card.Serial}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text variant="caption" color="secondary">
                      PIN:
                    </Text>
                    <Text
                      variant="body"
                      weight="semibold"
                      className="text-green-600 dark:text-green-400 font-mono"
                    >
                      {card.Pin}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-center pt-2 border-t border-green-200 dark:border-green-800">
                    <Ionicons
                      name="copy-outline"
                      size={14}
                      color={isDark ? '#A78BFA' : '#6B21A8'}
                    />
                    <Text variant="caption" className="text-green-600 dark:text-green-400 ml-1">
                      Tap to copy
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Voucher Code (Showmax, etc.) */}
          {voucherCode && (
            <View className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 rounded-xl p-4 mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text variant="caption" className="text-purple-800">
                  Voucher Code
                </Text>
                <TouchableOpacity
                  onPress={handleCopyVoucher}
                  className="flex-row items-center bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-full"
                >
                  <Ionicons name="copy-outline" size={16} color={isDark ? '#A78BFA' : '#6B21A8'} />
                  <Text variant="caption" weight="semibold" className="text-purple-900 ml-1">
                    Copy
                  </Text>
                </TouchableOpacity>
              </View>
              <Text variant="h4" weight="bold" className="text-purple-900 tracking-wider">
                {voucherCode}
              </Text>
            </View>
          )}

          {/* Reference Number */}
          {reference && (
            <View className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-4">
              <Text variant="caption" color="secondary" className="mb-1">
                Transaction Reference
              </Text>
              <Text variant="body" weight="medium" className="text-gray-700">
                {reference}
              </Text>
            </View>
          )}

          {/* Cashback Info */}
          {(cashbackEarned > 0 || cashbackRedeemed > 0) && (
            <View className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
              {cashbackRedeemed > 0 && (
                <View className="mb-3 pb-3 border-b border-green-200 dark:border-green-800">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <Ionicons name="gift-outline" size={20} color="#22C55E" />
                      <Text
                        variant="body"
                        className="text-green-700 dark:text-green-400 ml-2 flex-1"
                      >
                        Cashback Redeemed
                      </Text>
                    </View>
                    <Text
                      variant="bodyMedium"
                      weight="semibold"
                      className="text-green-600 dark:text-green-400"
                    >
                      {formatCurrency(cashbackRedeemed)}
                    </Text>
                  </View>
                </View>
              )}
              {cashbackEarned > 0 && (
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <Ionicons name="sparkles-outline" size={20} color="#22C55E" />
                    <Text variant="body" className="text-green-700 dark:text-green-400 ml-2 flex-1">
                      Cashback Earned
                    </Text>
                  </View>
                  <Text
                    variant="bodyMedium"
                    weight="semibold"
                    className="text-green-600 dark:text-green-400"
                  >
                    +{formatCurrency(cashbackEarned)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Fixed Bottom Button */}
        <View
          className="px-5 py-4 bg-white dark:bg-gray-800 border-t border-gray-100"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <Button variant="primary" size="lg" fullWidth onPress={handleDone}>
            Done
          </Button>
        </View>
      </View>
    </>
  );
}
