// app/crypto/receive.tsx
import { QRCodeDisplay } from '@/src/components/crypto/QRCodeDisplay';
import { Card, ScreenHeader, Text } from '@/src/components/ui';
import { useDepositInfo } from '@/src/hooks/useCryptoWallet';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

import { useTheme } from '@/src/hooks/useTheme';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
export default function ReceiveCryptoScreen() {
  const { isDark } = useTheme();
  const { data: depositInfo } = useDepositInfo();

  // console.log({ depositInfo });
  const insets = useSafeAreaInsets();

  if (!depositInfo) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View className="flex-1 bg-gray-50 dark:bg-gray-900 justify-center items-center">
          <ActivityIndicator size="large" color="#5B55F6" />
          <Text variant="body" color="secondary" className="mt-4">
            Loading...
          </Text>
        </View>
      </>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <ScreenHeader title="Receive Crypto" />

      <ScrollView
        className=""
        contentContainerStyle={{
          paddingBottom: insets.bottom + 400,
          paddingVertical: 16,
        }}
      >
        <View className="px-4">
          {/* QR Code */}
          <Card variant="elevated" className="p-6 items-center mb-6">
            <Text variant="h6" weight="semibold" className="mb-4">
              Scan QR Code
            </Text>
            <QRCodeDisplay address={depositInfo.walletAddress} />
          </Card>

          {/* Supported Tokens */}
          <Card variant="elevated" className="p-6 mb-6">
            <Text variant="h5" weight="semibold" className="mb-3">
              Supported Tokens
            </Text>
            {depositInfo.supportedTokens.map((token) => (
              <View key={token} className="flex-row items-center py-2">
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text variant="body" color="secondary" className="ml-2">
                  {token}
                </Text>
              </View>
            ))}
          </Card>

          {/* Network Info */}
          <Card variant="filled" className="p-4 mb-6">
            <Text variant="h4" weight="semibold" className="mb-2">
              Network
            </Text>
            <Text variant="h5" color="secondary">
              {depositInfo.network}
            </Text>
          </Card>

          {/* Instructions */}
          <Card variant="filled" className="p-4 bg-yellow-50">
            <View className="flex-row items-start mb-2">
              <Ionicons name="warning-outline" size={20} color="#F59E0B" />
              <Text variant="h6" weight="semibold" className="ml-2">
                Important
              </Text>
            </View>
            <Text variant="h7" color="secondary">
              {depositInfo.warning || ''}
            </Text>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
