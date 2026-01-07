// app/circle/receive.tsx
import { BlockchainSelector } from "@/src/components/circle";
import { QRCodeDisplay } from "@/src/components/crypto/QRCodeDisplay";
import { Card, ScreenHeader, Text } from "@/src/components/ui";
import {
  useCircleDepositInfo,
  useCircleWallets,
} from "@/src/hooks/useCircleWallet";
import { useTheme } from "@/src/hooks/useTheme";
import { toast } from "@/src/lib/utils/toast";
import { useCircleStore } from "@/src/store/circle.store";
import { CircleBlockchain, CircleWallet } from "@/src/types/circle.types";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BLOCKCHAIN_NAMES: Record<CircleBlockchain, string> = {
  ETH: "Ethereum",
  "ETH-SEPOLIA": "Ethereum Sepolia (Testnet)",
  MATIC: "Polygon",
  "MATIC-AMOY": "Polygon Amoy (Testnet)",
  ARB: "Arbitrum",
  "ARB-SEPOLIA": "Arbitrum Sepolia (Testnet)",
  SOL: "Solana",
  "SOL-DEVNET": "Solana Devnet (Testnet)",
  AVAX: "Avalanche",
  "AVAX-FUJI": "Avalanche Fuji (Testnet)",
  BASE: "Base",
  "BASE-SEPOLIA": "Base Sepolia (Testnet)",
  OP: "Optimism",
  "OP-SEPOLIA": "Optimism Sepolia (Testnet)",
};

export default function CircleReceiveScreen() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: wallets, isLoading: isLoadingWallets } = useCircleWallets();

  // Deduplicate wallets by ID to prevent React duplicate key errors
  const uniqueWallets = React.useMemo(() => {
    if (!wallets) return [];
    const walletMap = new Map(wallets.map((wallet) => [wallet.id, wallet]));
    return Array.from(walletMap.values());
  }, [wallets]);

  const { selectedWallet, setSelectedWallet } = useCircleStore();
  useCircleDepositInfo();

  const [selectedWalletId, setSelectedWalletId] = useState<string | undefined>(
    selectedWallet?.id
  );

  // Get current wallet
  const currentWallet =
    uniqueWallets?.find((w) => w.id === selectedWalletId) ||
    selectedWallet ||
    uniqueWallets?.[0];

  const address = currentWallet?.address || "";
  const blockchain = currentWallet?.blockchain;

  const handleCopyAddress = async () => {
    if (address) {
      await Clipboard.setStringAsync(address);
      toast.success({
        title: "Address Copied",
        message: "Wallet address copied to clipboard",
      });
    }
  };

  const handleWalletSelect = (wallet: CircleWallet) => {
    setSelectedWalletId(wallet.id);
    setSelectedWallet(wallet);
  };

  if (isLoadingWallets) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 justify-center items-center">
        <ActivityIndicator size="large" color="#2775CA" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? "light" : "dark"} />
      <ScreenHeader
        title="Receive USDC"
        subtitleText="Share your address to receive funds"
      />

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 50 }}
      >
        {/* Network Selector */}
        {uniqueWallets && uniqueWallets.length > 1 && (
          <View className="mt-4">
            <BlockchainSelector
              wallets={uniqueWallets}
              selectedWalletId={selectedWalletId}
              onSelect={handleWalletSelect}
            />
          </View>
        )}

        {/* QR Code */}
        <Card variant="elevated" className="p-6 my-4 items-center">
          <View className="bg-white p-4 rounded-xl mb-4">
            <QRCodeDisplay address={address} size={200} />
          </View>

          <Text variant="h6" weight="semibold" className="mb-2 dark:text-white">
            {blockchain ? BLOCKCHAIN_NAMES[blockchain] : "USDC"} Address
          </Text>

          <TouchableOpacity
            onPress={handleCopyAddress}
            className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg w-full"
          >
            <Text
              variant="caption"
              align="center"
              className="font-mono "
              numberOfLines={2}
            >
              {address}
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Action Buttons */}
        {/* <View className="flex-row mb-6">
          <Button
            variant="outline"
            size="md"
            onPress={handleCopyAddress}
            className="flex-1 mr-2"
            icon={<Ionicons name="copy-outline" size={18} color={isDark ? 'white' : '#2775CA'} />}
          >
            Copy Address
          </Button>
          <Button
            variant="outline"
            size="md"
            onPress={handleShare}
            className="flex-1 ml-2"
            icon={<Ionicons name="share-outline" size={18} color={isDark ? 'white' : '#2775CA'} />}
          >
            Share
          </Button>
        </View> */}

        {/* Warning */}
        <Card
          variant="filled"
          className="p-4 mb-4 bg-yellow-50 dark:bg-yellow-900/20"
        >
          <View className="flex-row items-start">
            <Ionicons name="warning" size={20} color="#F59E0B" />
            <View className="ml-3 flex-1">
              <Text
                variant="bodyMedium"
                weight="semibold"
                className="mb-1 text-yellow-700 dark:text-yellow-400"
              >
                Important
              </Text>
              <Text
                variant="caption"
                className="text-yellow-600 dark:text-yellow-300"
              >
                Only send USDC on the{" "}
                {blockchain ? BLOCKCHAIN_NAMES[blockchain] : "selected"} network
                to this address. Sending other tokens or using a different
                network may result in permanent loss of funds.
              </Text>
            </View>
          </View>
        </Card>

        {/* Info Card */}
        <Card variant="outlined" className="p-4">
          <View className="flex-row items-center mb-3">
            <Ionicons name="information-circle" size={20} color="#2775CA" />
            <Text
              variant="bodyMedium"
              weight="semibold"
              className="ml-2 dark:text-white"
            >
              Receiving USDC
            </Text>
          </View>
          <View className="flex-row items-start mb-2">
            <Text variant="caption" className="dark:text-gray-300">
              • Transactions typically confirm within minutes
            </Text>
          </View>
          <View className="flex-row items-start mb-2">
            <Text variant="caption" className="dark:text-gray-300">
              • Your balance will update automatically
            </Text>
          </View>
          <View className="flex-row items-start">
            <Text variant="caption" className="dark:text-gray-300">
              • You&apos;ll receive a notification when funds arrive
            </Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
