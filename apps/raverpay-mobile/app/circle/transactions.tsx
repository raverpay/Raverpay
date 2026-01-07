// app/circle/transactions.tsx
import { CircleTransactionItem } from '@/src/components/circle';
import { Card, ScreenHeader, Text } from '@/src/components/ui';
import { useCircleTransactions } from '@/src/hooks/useCircleWallet';
import { useTheme } from '@/src/hooks/useTheme';
import { CircleTransaction } from '@/src/types/circle.types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CircleTransactionsScreen() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch, isRefetching } =
    useCircleTransactions({ limit: 20 });

  const transactions = data?.pages.flatMap((page) => page.data) || [];

  const handleTransactionPress = (transaction: CircleTransaction) => {
    router.push(`/circle/transaction-details?id=${transaction.id}`);
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const renderTransaction = ({ item }: { item: CircleTransaction }) => (
    <CircleTransactionItem transaction={item} onPress={() => handleTransactionPress(item)} />
  );

  const renderEmpty = () => (
    <Card variant="outlined" className="p-8 items-center">
      <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
      <Text variant="h6" weight="semibold" className="mt-4 dark:text-white">
        No Transactions Yet
      </Text>
      <Text variant="body" color="secondary" align="center" className="mt-2">
        Your USDC transaction history will appear here
      </Text>
    </Card>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#2775CA" />
      </View>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 justify-center items-center">
        <ActivityIndicator size="large" color="#2775CA" />
        <Text variant="body" color="secondary" className="mt-4">
          Loading transactions...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScreenHeader title="Transaction History" subtitleText="Your USDC transactions" />

      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 20,
          flexGrow: transactions.length === 0 ? 1 : undefined,
          paddingTop: 16,
        }}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor="#2775CA"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
