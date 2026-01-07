// app/circle/setup.tsx
import { BlockchainSelector } from "@/src/components/circle";
import { Button, Card, ScreenHeader, Text } from "@/src/components/ui";
import {
  useCircleChains,
  useCircleConfig,
  useCreateCircleWallet,
} from "@/src/hooks/useCircleWallet";
import { useTheme } from "@/src/hooks/useTheme";
import { CircleBlockchain } from "@/src/types/circle.types";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CircleSetupScreen() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: config, isLoading: isLoadingConfig } = useCircleConfig();
  const { data: chainsData, isLoading: isLoadingChains } = useCircleChains();
  const { mutateAsync: createWallet, isPending: isCreating } =
    useCreateCircleWallet();

  const [selectedBlockchain, setSelectedBlockchain] = useState<
    CircleBlockchain | undefined
  >();

  // Set default selection when chains load
  useEffect(() => {
    if (chainsData?.chains && !selectedBlockchain) {
      const recommended = chainsData.chains.find((c) => c.isRecommended);
      if (recommended) {
        setSelectedBlockchain(recommended.blockchain);
      } else if (config?.defaultBlockchain) {
        setSelectedBlockchain(config.defaultBlockchain);
      }
    }
  }, [chainsData, config, selectedBlockchain]);

  const handleCreateWallet = async () => {
    try {
      await createWallet({
        blockchain: selectedBlockchain || config?.defaultBlockchain,
        accountType: config?.defaultAccountType || "EOA",
      });
      router.back();
    } catch {
      // Error is handled in the hook
    }
  };

  if (isLoadingConfig || isLoadingChains) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 justify-center items-center">
        <ActivityIndicator size="large" color="#2775CA" />
      </View>
    );
  }

  const supportedChains = chainsData?.chains || [];

  // console.log({supportedChains})

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? "light" : "dark"} />

      <ScreenHeader
        title="Create USDC Wallet"
        subtitleText="Select your preferred blockchain"
      />

      <ScrollView
        className="flex-1 p-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Blockchain Selection */}
        <Card variant="elevated" className="p-4 mb-6">
          <BlockchainSelector
            chains={supportedChains}
            selectedChain={selectedBlockchain}
            onSelect={setSelectedBlockchain}
          />
          <Text variant="caption" color="tertiary" className="mt-3">
            Each network has different gas fees and transaction speeds. You can
            create wallets on multiple networks.
          </Text>
        </Card>

        {/* Info Cards */}
        <Card variant="filled" className="p-4 mb-4">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={20} color="#2775CA" />
            <View className="ml-3 flex-1">
              <Text
                variant="bodyMedium"
                weight="semibold"
                className="mb-1 dark:text-white"
              >
                About USDC
              </Text>
              <Text variant="caption" color="secondary">
                USDC is a fully reserved stablecoin pegged 1:1 to the US dollar.
                It&apos;s issued by Circle and backed by cash and short-term
                U.S. Treasury bonds.
              </Text>
            </View>
          </View>
        </Card>

        <Card variant="filled" className="p-4 mb-4">
          <View className="flex-row items-start">
            <Ionicons name="shield-checkmark" size={20} color="#10B981" />
            <View className="ml-3 flex-1">
              <Text
                variant="bodyMedium"
                weight="semibold"
                className="mb-1 dark:text-white"
              >
                Secure & Compliant
              </Text>
              <Text variant="caption" color="secondary">
                Your wallet is secured by Circle&apos;s enterprise-grade
                infrastructure with multi-party computation (MPC) technology.
              </Text>
            </View>
          </View>
        </Card>

        <Card variant="filled" className="p-4 mb-6">
          <View className="flex-row items-start">
            <Ionicons name="git-compare" size={20} color="#9333EA" />
            <View className="ml-3 flex-1">
              <Text
                variant="bodyMedium"
                weight="semibold"
                className="mb-1 dark:text-white"
              >
                Cross-Chain Transfers
              </Text>
              <Text variant="caption" color="secondary">
                Move USDC between blockchains using Circle&apos;s CCTP
                (Cross-Chain Transfer Protocol) with no slippage or bridging
                fees.
              </Text>
            </View>
          </View>
        </Card>

        {/* Features */}
        <Card variant="elevated" className="p-4 mb-6">
          <Text variant="h6" weight="semibold" className="mb-3 dark:text-white">
            Wallet Features
          </Text>
          <View className="flex-row items-center mb-2">
            <Ionicons name="checkmark" size={16} color="#10B981" />
            <Text variant="body" className="ml-2 dark:text-white">
              Send & receive USDC globally
            </Text>
          </View>
          <View className="flex-row items-center mb-2">
            <Ionicons name="checkmark" size={16} color="#10B981" />
            <Text variant="body" className="ml-2 dark:text-white">
              Bridge USDC across chains
            </Text>
          </View>
          <View className="flex-row items-center mb-2">
            <Ionicons name="checkmark" size={16} color="#10B981" />
            <Text variant="body" className="ml-2 dark:text-white">
              Pay gas fees in USDC (Paymaster)
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="checkmark" size={16} color="#10B981" />
            <Text variant="body" className="ml-2 dark:text-white">
              Real-time transaction tracking
            </Text>
          </View>
        </Card>

        {/* Create Button */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleCreateWallet}
          disabled={isCreating}
          loading={isCreating}
          className="bg-[#2775CA]"
        >
          {isCreating ? "Creating Wallet..." : "Create Wallet"}
        </Button>

        {config?.environment === "testnet" && (
          <View className="flex-row items-center justify-center mt-4">
            <Ionicons name="flask-outline" size={16} color="#F59E0B" />
            <Text variant="caption" color="secondary" className="ml-1">
              Testnet Mode - No real funds
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
