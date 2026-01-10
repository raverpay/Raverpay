// app/circle/setup.tsx
import { BlockchainSelector } from '@/src/components/circle';
import { Button, Card, ScreenHeader, Text } from '@/src/components/ui';
import {
  useCircleChains,
  useCircleConfig,
  useCircleWallets,
  useCreateCircleWallet,
} from '@/src/hooks/useCircleWallet';
import { useTheme } from '@/src/hooks/useTheme';
import { CircleBlockchain } from '@/src/types/circle.types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CircleSetupScreen() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: config, isLoading: isLoadingConfig } = useCircleConfig();
  const { data: chainsData, isPending: isLoadingChains } = useCircleChains();
  const { data: existingWallets, isLoading: isLoadingWallets } = useCircleWallets();
  const { mutateAsync: createWallet, isPending: isCreating } = useCreateCircleWallet();

  const [selectedBlockchain, setSelectedBlockchain] = useState<CircleBlockchain | undefined>();

  // Filter out networks where user already has a wallet
  const availableChains = useMemo(() => {
    const allChains = chainsData?.chains || [];
    const existingBlockchains = existingWallets?.map((w) => w.blockchain) || [];
    
    return allChains.filter(
      (chain) => !existingBlockchains.includes(chain.blockchain)
    );
  }, [chainsData, existingWallets]);

  // Check if user has wallets on all supported networks
  const allNetworksHaveWallets = useMemo(() => {
    const allChains = chainsData?.chains || [];
    return allChains.length > 0 && availableChains.length === 0;
  }, [chainsData, availableChains]);

  // Set default selection when chains load
  useEffect(() => {
    if (availableChains.length > 0 && !selectedBlockchain) {
      const recommended = availableChains.find((c) => c.isRecommended);
      if (recommended) {
        setSelectedBlockchain(recommended.blockchain);
      } else if (availableChains.length > 0) {
        setSelectedBlockchain(availableChains[0].blockchain);
      }
    }
  }, [availableChains, selectedBlockchain]);

  const handleCreateWallet = async () => {
    try {
      await createWallet({
        blockchain: selectedBlockchain || config?.defaultBlockchain,
        accountType: config?.defaultAccountType || 'EOA',
      });
      router.back();
    } catch {
      // Error is handled in the hook
    }
  };

  if (isLoadingConfig || isLoadingChains || isLoadingWallets) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 justify-center items-center">
        <ActivityIndicator size="large" color="#2775CA" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <ScreenHeader title="Create USDC Wallet" subtitleText="Select your preferred blockchain" />

      <ScrollView
        className="flex-1 p-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* All Networks Have Wallets Message */}
        {allNetworksHaveWallets ? (
          <Card variant="elevated" className="p-6 mb-6">
            <View className="items-center">
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              <Text variant="h6" weight="semibold" align="center" className="mt-3 dark:text-white">
                You're All Set!
              </Text>
              <Text variant="body" color="secondary" align="center" className="mt-2">
                You already have wallets on all supported networks.
              </Text>
              <TouchableOpacity
                onPress={() => router.replace('/circle')}
                className="mt-4 px-6 py-3 bg-[#2775CA] rounded-full"
              >
                <Text variant="body" weight="semibold" className="text-white">
                  View My Wallets
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        ) : (
          <>
            {/* Blockchain Selection */}
            <Card variant="elevated" className="p-4 mb-6">
              <BlockchainSelector
                chains={availableChains}
                selectedChain={selectedBlockchain}
                onSelect={setSelectedBlockchain}
              />
              {/* <Text variant="caption" color="tertiary" className="mt-3">
                Each network has different gas fees and transaction speeds. You can create wallets on
                multiple networks.
              </Text> */}
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
              {isCreating ? 'Creating Wallet...' : 'Create Wallet'}
            </Button>

            {config?.environment === 'testnet' && (
              <View className="flex-row items-center justify-center mt-4">
                <Ionicons name="flask-outline" size={16} color="#F59E0B" />
                <Text variant="caption" color="secondary" className="ml-1">
                  Testnet Mode - No real funds
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
