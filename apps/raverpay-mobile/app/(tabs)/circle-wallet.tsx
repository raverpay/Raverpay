import { CircleTransactionItem } from '@/src/components/circle';
import { Button, Card, Text } from '@/src/components/ui';
import {
  useAllWalletBalances,
  useCircleConfig,
  useCircleTransactions,
  useCircleWallets,
} from '@/src/hooks/useCircleWallet';
import { useTheme } from '@/src/hooks/useTheme';
import { useCircleStore } from '@/src/store/circle.store';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';

export default function CircleWalletScreen() {
  const { isDark } = useTheme();
  const { data: config, isLoading: isLoadingConfig } = useCircleConfig();
  const { data: wallets, isPending: isLoadingWallets, refetch } = useCircleWallets();

  // console.log("wallets", wallets);
  const {
    selectedWallet,
    setSelectedWallet,
    getUsdcBalance,
    getNativeBalance,
    getTotalUsdcBalance,
    cleanupBalances,
  } = useCircleStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showWalletSelector, setShowWalletSelector] = useState(false);

  // Load balances for ALL wallets
  const walletIds = wallets?.map((w) => w.id) || [];
  const { refetch: refetchBalances } = useAllWalletBalances(walletIds);

  // Load recent transactions (limit to 5)
  const { data: transactionsData, refetch: refetchTransactions } = useCircleTransactions({
    limit: 5,
  });

  // Cleanup old balances when wallets change
  React.useEffect(() => {
    if (wallets && wallets.length > 0) {
      const currentWalletIds = wallets.map((w) => w.id);
      cleanupBalances(currentWalletIds);
    }
  }, [wallets, cleanupBalances]);

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchBalances();
      refetchTransactions();
    }, [refetch, refetchBalances, refetchTransactions]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchBalances(), refetchTransactions()]);
    setRefreshing(false);
  };

  // Get recent transactions (flatten pages and take first 5)
  const recentTransactions = transactionsData?.pages.flatMap((page) => page.data).slice(0, 5) || [];

  // Deduplicate wallets by ID to prevent React duplicate key errors
  const uniqueWallets = React.useMemo(() => {
    if (!wallets) return [];
    const walletMap = new Map(wallets.map((wallet) => [wallet.id, wallet]));
    return Array.from(walletMap.values());
  }, [wallets]);

  const totalBalance = getTotalUsdcBalance();

  // Ensure a wallet is selected
  React.useEffect(() => {
    if (uniqueWallets.length > 0 && !selectedWallet) {
      setSelectedWallet(uniqueWallets[0]);
    }
  }, [uniqueWallets, selectedWallet, setSelectedWallet]);

  // If no wallets, show setup screen
  if (!isLoadingWallets && (!wallets || wallets.length === 0)) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View className="flex-1 bg-gray-50 dark:bg-gray-900 justify-center items-center p-6">
          {/* USDC Logo */}
          <View className="w-24 h-24 rounded-full bg-[#2775CA] items-center justify-center mb-6">
            <Text variant="h1" color="inverse" weight="bold">
              $
            </Text>
          </View>

          <Text variant="h3" weight="bold" className="mb-2 text-center dark:text-white">
            USDC Wallet
          </Text>
          <Text variant="body" color="secondary" align="center" className="mb-6 px-4">
            Create your Circle USDC wallet to send and receive stablecoins across multiple
            blockchains.
          </Text>

          {/* Features List */}
          <Card variant="elevated" className="p-4 mb-6 w-full">
            <View className="flex-row items-center mb-3">
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text variant="body" className="ml-2 dark:text-white">
                Multi-chain USDC support
              </Text>
            </View>
            <View className="flex-row items-center mb-3">
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text variant="body" className="ml-2 dark:text-white">
                Cross-chain transfers (CCTP)
              </Text>
            </View>
            <View className="flex-row items-center mb-3">
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text variant="body" className="ml-2 dark:text-white">
                Low gas fees with Paymaster
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text variant="body" className="ml-2 dark:text-white">
                Instant finality on supported chains
              </Text>
            </View>
          </Card>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.push('/circle/setup')}
            className="bg-[#2775CA]"
          >
            Create USDC Wallets
          </Button>
        </View>
      </>
    );
  }

  if (isLoadingWallets || isLoadingConfig) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View className="flex-1 bg-gray-50 dark:bg-gray-900 justify-center items-center">
          <ActivityIndicator size="large" color="#2775CA" />
          <Text variant="body" color="secondary" className="mt-4">
            Loading wallets...
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <ScrollView
        className="flex-1 bg-gray-50 dark:bg-gray-900"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Header with Balance */}
        <View className="bg-[#5B55F6] pt-12 p-6 pb-12 border-b-0 rounded-b-3xl">
          <View className="flex-row justify-between items-center mb-4">
            {/* <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity> */}
            {/* <Text variant="h4" weight="bold">
              USDC Wallet
            </Text> */}
            {/* onPress={() => router.push('/circle/wallet-type-selection')} */}
            {/* <TouchableOpacity onPress={() => router.push("/circle/setup")}>
              <Ionicons name="add-circle-outline" size={24} color="white" />
            </TouchableOpacity> */}
          </View>

          <View className="flex-row justify-between items-center">
            <View className=" h-full">
              <Text variant="h4" className="opacity-80 mb-1">
                {/* {selectedWallet ? "Balance" : "Total Balance"} */}Total Assets
              </Text>
              <Text variant="h2" weight="bold">
                ${selectedWallet ? getUsdcBalance(selectedWallet.id) : totalBalance}
              </Text>
              {selectedWallet && (
                <View className="flex-row items-center mt-1">
                  <Text variant="caption" className="opacity-70">
                    {getNativeBalance(selectedWallet.id)?.amount || '0.00'}{' '}
                    {getNativeBalance(selectedWallet.id)?.symbol || ''}
                  </Text>
                </View>
              )}
              {/* <Text variant="caption" className="opacity-70 mt-1">
            USDC
          </Text> */}
            </View>

            {/* Wallet Selector Dropdown */}
            {uniqueWallets.length > 0 && (
              <View className="bg-white/10 rounded-2xl p-3 mb-4 w-[40%] ">
                {/* <Text variant="caption" className="opacity-70 mb-2">
                Active Wallet
              </Text> */}
                <TouchableOpacity
                  className="flex-row items-center justify-between"
                  onPress={() => setShowWalletSelector(true)}
                >
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text variant="bodyMedium" weight="semibold" className="text-white">
                        {selectedWallet?.blockchain || uniqueWallets[0]?.blockchain}
                      </Text>
                      {/* {selectedWallet?.custodyType && (
                      <View
                        className={`px-2 py-0.5 rounded ${
                          selectedWallet.custodyType === "USER"
                            ? "bg-blue-500/30"
                            : "bg-green-500/30"
                        }`}
                      >
                        <Text variant="caption" className="text-white text-xs">
                          {selectedWallet.custodyType === "USER"
                            ? "🔑 Non-Custodial"
                            : "🛡️ Custodial"}
                        </Text>
                      </View>
                    )} */}
                    </View>
                    <Text variant="caption" className="opacity-70">
                      {selectedWallet?.address.slice(0, 5)}...
                      {selectedWallet?.address.slice(-3)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color="white" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View className="px-6 mt-6 mb-6">
          <Card variant="elevated" className="p-4">
            <View className="flex-row justify-around">
              <TouchableOpacity
                className="items-center"
                onPress={() => router.push('/circle/receive')}
              >
                <View className="w-12 h-12 bg-green-100 rounded-full items-center justify-center mb-2">
                  <Ionicons name="arrow-down" size={24} color="#10B981" />
                </View>
                <Text variant="caption" weight="semibold">
                  Receive
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="items-center"
                onPress={() => router.push('/circle/send')}
              >
                <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mb-2">
                  <Ionicons name="arrow-up" size={24} color="#3B82F6" />
                </View>
                <Text variant="caption" weight="semibold">
                  Send
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="items-center"
                onPress={() => router.push('/circle/bridge')}
              >
                <View className="w-12 h-12 bg-purple-100 rounded-full items-center justify-center mb-2">
                  <Ionicons name="git-compare-outline" size={24} color="#9333EA" />
                </View>
                <Text variant="caption" weight="semibold">
                  Bridge
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="items-center"
                onPress={() => router.push('/circle/setup')}
              >
                <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mb-2">
                  <Ionicons name="add" size={24} color="#3B82F6" />
                </View>
                <Text variant="caption" weight="semibold">
                  Create
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* Recent Transactions */}
        <View className="px-6 mb-6">
          <TouchableOpacity
            className="flex-row justify-between items-center mb-4"
            onPress={() => router.push('/circle/transactions')}
          >
            <Text variant="h5" weight="bold" className="dark:text-white">
              Recent Activity
            </Text>
            <View className="flex-row items-center">
              <Text variant="bodyMedium" className="text-[#2775CA] mr-1">
                View All
              </Text>
              <Ionicons name="chevron-forward" size={16} color={isDark ? 'white' : '#2775CA'} />
            </View>
          </TouchableOpacity>

          {recentTransactions.length > 0 ? (
            <Card>
              {recentTransactions.map((transaction, index) => (
                <View key={transaction.id} className="mt-2">
                  <CircleTransactionItem
                    transaction={transaction}
                    onPress={() => router.push(`/circle/transaction-details?id=${transaction.id}`)}
                  />
                  {index < recentTransactions.length - 1 && (
                    <View className="h-px bg-gray-200 dark:bg-gray-700" />
                  )}
                </View>
              ))}
            </Card>
          ) : (
            <Card
              variant="outlined"
              pressable
              onPress={() => router.push('/circle/transactions')}
              className="p-6"
            >
              <View className="items-center">
                <Ionicons name="receipt-outline" size={32} color="#9CA3AF" />
                <Text variant="body" color="secondary" className="mt-2">
                  No transactions yet
                </Text>
              </View>
            </Card>
          )}
        </View>

        {/* Network Info */}
        {config && (
          <View className="px-4 mb-8">
            <Card variant="filled" className="">
              <View className="flex-row items-center">
                <Ionicons
                  name={
                    config.environment === 'testnet' ? 'flask-outline' : 'shield-checkmark-outline'
                  }
                  size={20}
                  color={config.environment === 'testnet' ? '#F59E0B' : '#10B981'}
                />
                <Text variant="caption" color="secondary" className="ml-2">
                  {config.environment === 'testnet'
                    ? 'Connected to Testnet'
                    : 'Connected to Mainnet'}
                </Text>
              </View>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Wallet Selection Modal */}
      <Modal
        visible={showWalletSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWalletSelector(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowWalletSelector(false)}
          className="flex-1 justify-end bg-black/80"
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View className="bg-white dark:bg-gray-800 rounded-t-3xl min-h-[50%] max-h-[100%]">
              {/* Header */}
              <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <Text variant="h5" weight="bold" className="dark:text-white">
                  Select Wallet
                </Text>
                <TouchableOpacity onPress={() => setShowWalletSelector(false)}>
                  <Ionicons name="close" size={24} color={isDark ? '#fff' : '#000'} />
                </TouchableOpacity>
              </View>

              {/* Wallet List */}
              <ScrollView className="max-h-96">
                {uniqueWallets.map((wallet) => {
                  const isSelected = selectedWallet?.id === wallet.id;
                  const balance = getUsdcBalance(wallet.id);

                  return (
                    <TouchableOpacity
                      key={wallet.id}
                      onPress={() => {
                        setSelectedWallet(wallet);
                        setShowWalletSelector(false);
                      }}
                      className={`p-4 border-b border-gray-100 dark:border-gray-700 ${
                        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          {/* Blockchain name and custody badge */}
                          <View className="flex-row items-center gap-2 mb-1">
                            <Text
                              variant="bodyMedium"
                              weight="semibold"
                              className="dark:text-white"
                            >
                              {wallet.blockchain}
                            </Text>
                            {wallet.custodyType && (
                              <View
                                className={`px-2 py-0.5 rounded ${
                                  wallet.custodyType === 'USER'
                                    ? 'bg-blue-100 dark:bg-blue-900/50'
                                    : 'bg-green-100 dark:bg-green-900/50'
                                }`}
                              >
                                <Text
                                  variant="caption"
                                  className={`text-xs ${
                                    wallet.custodyType === 'USER'
                                      ? 'text-blue-700 dark:text-blue-300'
                                      : 'text-green-700 dark:text-green-300'
                                  }`}
                                >
                                  {wallet.custodyType === 'USER'
                                    ? '🔑 Non-Custodial'
                                    : '🛡️ Custodial'}
                                </Text>
                              </View>
                            )}
                          </View>

                          {/* Address */}
                          <Text variant="caption" color="secondary" className="mb-1">
                            {wallet.address.slice(0, 30)}...
                            {wallet.address.slice(-8)}
                          </Text>

                          {/* Balance */}
                          <View className="flex-row justify-between items-center">
                            <Text variant="body" weight="semibold" className="text-[#2775CA]">
                              ${balance} USDC
                            </Text>
                            {getNativeBalance(wallet.id) && (
                              <Text variant="caption" color="secondary">
                                {getNativeBalance(wallet.id)?.amount}{' '}
                                {getNativeBalance(wallet.id)?.symbol}
                              </Text>
                            )}
                          </View>
                        </View>

                        {/* Selected indicator */}
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={24} color="#2775CA" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
