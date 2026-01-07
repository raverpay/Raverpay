// app/crypto/transaction-details.tsx
import { Button, Card, ScreenHeader, Text } from '@/src/components/ui';
import { useCryptoTransactionDetails } from '@/src/hooks/useCryptoWallet';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

import { useTheme } from '@/src/hooks/useTheme';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CryptoTransactionDetailsScreen() {
  const { isDark } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const {
    data: transaction,
    isPending: isLoading,
    isError,
  } = useCryptoTransactionDetails(id || '');

  if (isLoading) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View className="flex-1 bg-gray-50 dark:bg-gray-900 justify-center items-center">
          <ActivityIndicator size="large" color="#5B55F6" />
          <Text variant="body" color="secondary" className="mt-4">
            Loading transaction...
          </Text>
        </View>
      </>
    );
  }

  if (isError || !transaction) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View className="flex-1 bg-gray-50 dark:bg-gray-900 justify-center items-center px-5">
          <View className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center mb-4">
            <Ionicons name="alert-circle-outline" size={40} color="#9CA3AF" />
          </View>
          <Text variant="h3" className="mb-2">
            Transaction not found
          </Text>
          <Button variant="primary" size="md" onPress={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </View>
      </>
    );
  }

  const isIncoming = transaction.direction === 'INCOMING';
  const statusColor =
    transaction.status === 'COMPLETED'
      ? '#10B981'
      : transaction.status === 'PENDING'
        ? '#F59E0B'
        : '#EF4444';

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900 ">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <ScreenHeader title="Transaction Details" subtitleText={transaction.tokenSymbol} />

      <ScrollView
        className="px-4"
        contentContainerStyle={{
          paddingBottom: insets.bottom + 400,
          paddingVertical: 16,
        }}
      >
        <View className="">
          {/* Status Card */}
          <Card variant="elevated" className="p-6 mb-6 items-center">
            <View
              className="w-16 h-16 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: `${statusColor}20` }}
            >
              <Ionicons
                name={
                  transaction.status === 'COMPLETED'
                    ? 'checkmark-circle'
                    : transaction.status === 'PENDING'
                      ? 'time-outline'
                      : 'close-circle'
                }
                size={32}
                color={statusColor}
              />
            </View>
            <Text variant="h4" weight="bold" className="mb-2">
              {transaction.status}
            </Text>
            <Text variant="h3" weight="bold" style={{ color: isIncoming ? '#10B981' : '#EF4444' }}>
              {isIncoming ? '+' : '-'}
              {parseFloat(transaction.amount).toFixed(4)} {transaction.tokenSymbol}
            </Text>
            <Text variant="body" color="secondary">
              ${parseFloat(transaction.usdValue).toFixed(2)}
            </Text>
          </Card>

          {/* Transaction Details */}
          <Card variant="elevated" className="p-6 mb-6">
            <Text variant="h6" weight="bold" className="mb-4">
              Transaction Details
            </Text>

            <View className="mb-4">
              <Text variant="caption" color="secondary" className="mb-1">
                Type
              </Text>
              <Text variant="body" weight="semibold">
                {transaction.type}
              </Text>
            </View>

            <View className="mb-4">
              <Text variant="caption" color="secondary" className="mb-1">
                Token
              </Text>
              <Text variant="body" weight="semibold">
                {transaction.tokenSymbol}
              </Text>
            </View>

            <View className="mb-4">
              <Text variant="caption" color="secondary" className="mb-1">
                Network
              </Text>
              <Text variant="body" weight="semibold">
                {transaction.network}
              </Text>
            </View>

            <View className="mb-4">
              <Text variant="caption" color="secondary" className="mb-1">
                From Address
              </Text>
              <Text variant="body" className="font-mono">
                {transaction.fromAddress}
              </Text>
            </View>

            <View className="mb-4">
              <Text variant="caption" color="secondary" className="mb-1">
                To Address
              </Text>
              <Text variant="body" className="font-mono">
                {transaction.toAddress}
              </Text>
            </View>

            {transaction.memo && (
              <View className="mb-4">
                <Text variant="caption" color="secondary" className="mb-1">
                  Memo
                </Text>
                <Text variant="body">{transaction.memo}</Text>
              </View>
            )}

            <View className="mb-4">
              <Text variant="caption" color="secondary" className="mb-1">
                Transaction Hash
              </Text>
              <Text variant="body" className="font-mono">
                {transaction.transactionHash}
              </Text>
            </View>

            {transaction.gasFee && (
              <View className="mb-4">
                <Text variant="caption" color="secondary" className="mb-1">
                  Gas Fee
                </Text>
                <Text variant="body" weight="semibold">
                  {transaction.gasFee} MATIC
                </Text>
              </View>
            )}

            <View className="mb-4">
              <Text variant="caption" color="secondary" className="mb-1">
                Confirmations
              </Text>
              <Text variant="body" weight="semibold">
                {transaction.confirmations}
              </Text>
            </View>

            <View>
              <Text variant="caption" color="secondary" className="mb-1">
                Submitted At
              </Text>
              <Text variant="body">{new Date(transaction.submittedAt).toLocaleString()}</Text>
            </View>

            {transaction.confirmedAt && (
              <View className="mt-4">
                <Text variant="caption" color="secondary" className="mb-1">
                  Confirmed At
                </Text>
                <Text variant="body">{new Date(transaction.confirmedAt).toLocaleString()}</Text>
              </View>
            )}
          </Card>

          {/* Reference */}
          <Card variant="outlined" className="p-4">
            <Text variant="caption" color="secondary" className="mb-1">
              Reference
            </Text>
            <Text variant="body" className="font-mono">
              {transaction.reference}
            </Text>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
