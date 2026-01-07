// app/crypto/transactions.tsx
import React from 'react';

import { CryptoTransactionItem } from '@/src/components/crypto/CryptoTransactionItem';
import { Card, ScreenHeader, Skeleton, Text } from '@/src/components/ui';
import { useCryptoTransactions } from '@/src/hooks/useCryptoWallet';
import { useTheme } from '@/src/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';

export default function CryptoTransactionsScreen() {
  const { isDark } = useTheme();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending: isLoading,
    refetch,
    isRefetching,
  } = useCryptoTransactions({ limit: 20 });

  const transactions = data?.pages.flatMap((page) => page.transactions) || [];

  const handleRefresh = () => {
    refetch();
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <ScreenHeader title="Stablecoins Transactions" />

      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        {isLoading && transactions.length === 0 ? (
          <View className="flex-1 px-5 pt-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} variant="elevated" className="p-4 mb-3">
                <Skeleton width="100%" height={50} />
              </Card>
            ))}
          </View>
        ) : transactions.length === 0 ? (
          <View className="flex-1 items-center justify-center px-5">
            <View className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center mb-4">
              <Ionicons name="receipt-outline" size={40} color="#9CA3AF" />
            </View>
            <Text variant="h3" className="mb-2">
              No transactions found
            </Text>
            <Text variant="body" color="secondary" align="center">
              Your stablecoin transactions will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View className="px-5">
                <CryptoTransactionItem
                  transaction={item}
                  onPress={() => router.push(`/crypto/transaction-details?id=${item.id}`)}
                />
              </View>
            )}
            contentContainerStyle={{ paddingVertical: 16 }}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={() =>
              isFetchingNextPage ? (
                <View className="py-4">
                  <ActivityIndicator size="small" color="#5B55F6" />
                </View>
              ) : null
            }
          />
        )}
      </View>
    </View>
  );
}
