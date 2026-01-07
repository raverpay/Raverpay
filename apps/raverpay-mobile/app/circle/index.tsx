// app/circle/index.tsx
import { CircleWalletCard } from "@/src/components/circle";
import { Button, Card, Text } from "@/src/components/ui";
import {
  useCircleChains,
  useCircleConfig,
  useCircleWalletBalance,
  useCircleWallets,
} from "@/src/hooks/useCircleWallet";
import { useTheme } from "@/src/hooks/useTheme";
import { useCircleStore } from "@/src/store/circle.store";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";

export default function CircleWalletScreen() {
  const { isDark } = useTheme();
  const { data: config, isLoading: isLoadingConfig } = useCircleConfig();
  const { data: chainsData } = useCircleChains();
  const {
    data: wallets,
    isLoading: isLoadingWallets,
    refetch,
  } = useCircleWallets();
  const { selectedWallet, setSelectedWallet, getUsdcBalance } =
    useCircleStore();

  const [refreshing, setRefreshing] = useState(false);

  // Load balance for selected wallet
  useCircleWalletBalance(selectedWallet?.id || "");

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // If no wallets, show setup screen
  if (!isLoadingWallets && (!wallets || wallets.length === 0)) {
    return (
      <>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View className="flex-1 bg-gray-50 dark:bg-gray-900 justify-center items-center p-6">
          {/* USDC Logo */}
          <View className="w-24 h-24 rounded-full bg-[#2775CA] items-center justify-center mb-6">
            <Text variant="h1" color="inverse" weight="bold">
              $
            </Text>
          </View>

          <Text
            variant="h3"
            weight="bold"
            className="mb-2 text-center dark:text-white"
          >
            USDC Wallet
          </Text>
          <Text
            variant="body"
            color="secondary"
            align="center"
            className="mb-6 px-4"
          >
            Create your Circle USDC wallet to send and receive stablecoins
            across multiple blockchains.
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
            onPress={() => router.push("/circle/wallet-type-selection")}
            className="bg-[#2775CA]"
          >
            Create USDC Wallet
          </Button>
        </View>
      </>
    );
  }

  if (isLoadingWallets || isLoadingConfig) {
    return (
      <>
        <StatusBar style={isDark ? "light" : "dark"} />
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header with Balance */}
        {/* <View className="bg-[#2775CA] p-6 pb-12">
          <View className="flex-row justify-between items-center mb-4">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text variant="h5" color="inverse" weight="semibold">
              USDC Wallet
            </Text>
            <TouchableOpacity onPress={() => router.push('/circle/setup')}>
              <Ionicons name="add-circle-outline" size={28} color="white" />
            </TouchableOpacity>
          </View>

          <Text variant="caption" color="inverse" className="opacity-80 mb-1">
            Total Balance
          </Text>
          <Text variant="h1" color="inverse" weight="bold">
            ${totalBalance}
          </Text>
          <Text variant="caption" color="inverse" className="opacity-70 mt-1">
            USDC
          </Text>
        </View> */}

        {/* Action Buttons */}
        <View className="px-6 -mt-6 mb-6">
          <Card variant="elevated" className="p-4">
            <View className="flex-row justify-around">
              <TouchableOpacity
                className="items-center"
                onPress={() => router.push("/circle/receive")}
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
                onPress={() => router.push("/circle/send")}
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
                onPress={() => router.push("/circle/bridge")}
              >
                <View className="w-12 h-12 bg-purple-100 rounded-full items-center justify-center mb-2">
                  <Ionicons
                    name="git-compare-outline"
                    size={24}
                    color="#9333EA"
                  />
                </View>
                <Text variant="caption" weight="semibold">
                  Bridge
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* Wallets List */}
        <View className="px-6 mb-6">
          <Text variant="h5" weight="bold" className="mb-4 dark:text-white">
            Your Wallets
          </Text>

          {wallets?.map((wallet) => {
            const supportedChain = chainsData?.chains?.find(
              (c) => c.blockchain === wallet.blockchain
            );
            const isSupported = !!supportedChain;
            const isSponsored =
              supportedChain?.feeLabel?.includes("Free") || false;

            return (
              <CircleWalletCard
                key={wallet.id}
                wallet={wallet}
                usdcBalance={getUsdcBalance(wallet.id)}
                isSelected={selectedWallet?.id === wallet.id}
                onPress={() => setSelectedWallet(wallet)}
                isSponsored={isSponsored}
                isUnsupported={!isSupported}
              />
            );
          })}
        </View>

        {/* Recent Transactions */}
        <View className="px-6 mb-6">
          <TouchableOpacity
            className="flex-row justify-between items-center mb-4"
            onPress={() => router.push("/circle/transactions")}
          >
            <Text variant="h5" weight="bold" className="dark:text-white">
              Recent Activity
            </Text>
            <View className="flex-row items-center">
              <Text variant="bodyMedium" className="text-[#2775CA] mr-1">
                View All
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#2775CA" />
            </View>
          </TouchableOpacity>

          <Card
            variant="outlined"
            pressable
            onPress={() => router.push("/circle/transactions")}
            className="p-6"
          >
            <View className="items-center">
              <Ionicons name="receipt-outline" size={32} color="#9CA3AF" />
              <Text variant="body" color="secondary" className="mt-2">
                View transaction history
              </Text>
            </View>
          </Card>
        </View>

        {/* Network Info */}
        {config && (
          <View className="px-6 mb-8">
            <Card variant="filled" className="p-4">
              <View className="flex-row items-center">
                <Ionicons
                  name={
                    config.environment === "testnet"
                      ? "flask-outline"
                      : "shield-checkmark-outline"
                  }
                  size={20}
                  color={
                    config.environment === "testnet" ? "#F59E0B" : "#10B981"
                  }
                />
                <Text variant="caption" color="secondary" className="ml-2">
                  {config.environment === "testnet"
                    ? "Connected to Testnet"
                    : "Connected to Mainnet"}
                </Text>
              </View>
            </Card>
          </View>
        )}
      </ScrollView>
    </>
  );
}
