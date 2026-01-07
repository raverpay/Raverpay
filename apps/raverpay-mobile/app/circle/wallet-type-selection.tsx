// app/circle/wallet-type-selection.tsx
import { Card, ScreenHeader, Text } from "@/src/components/ui";
import { useTheme } from "@/src/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ScrollView, View } from "react-native";

export default function WalletTypeSelection() {
  const { isDark } = useTheme();

  const handleSelectCustodial = () => {
    // Navigate to existing wallet setup (developer-controlled)
    router.push("/circle/setup");
  };

  const handleSelectNonCustodial = () => {
    // Navigate to user-controlled wallet setup
    router.push("/circle/user-controlled-setup");
  };

  const handleSelectModular = () => {
    // Navigate to modular wallet setup
    router.push("/circle/modular-wallet-setup");
  };

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <ScreenHeader
          title="Choose Wallet Type"
          subtitleText="Select the wallet type that best fits your needs"
        />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Wallet Options */}
          <View className="px-6 gap-4">
            {/* Custodial Wallet Option */}
            <Card
              variant="elevated"
              pressable
              onPress={handleSelectCustodial}
              className="p-5"
            >
              <View className="flex-row">
                <View className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-900/20 items-center justify-center mr-4">
                  <Ionicons name="shield-checkmark" size={32} color="#10B981" />
                </View>
                <View className="flex-1">
                  <View className="flex-row justify-between items-start mb-1">
                    <Text variant="h5" weight="bold">
                      Custodial Wallet
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#9CA3AF"
                    />
                  </View>
                  <View className="bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full self-start mb-3">
                    <Text
                      variant="h9"
                      className="text-green-700 dark:text-green-400"
                    >
                      Recommended for beginners
                    </Text>
                  </View>
                  <Text variant="caption" color="secondary" className="mb-4">
                    We manage your wallet for you. Simple and secure - perfect
                    if you&apos;re new to crypto.
                  </Text>

                  <View className="gap-2">
                    {[
                      "Easy to use",
                      "No seed phrase needed",
                      "Quick setup",
                      "Account recovery",
                    ].map((feature, index) => (
                      <View key={index} className="flex-row items-center">
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color="#10B981"
                        />
                        <Text variant="caption" className="ml-2">
                          {feature}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </Card>

            {/* Non-Custodial Wallet Option */}
            <Card
              variant="elevated"
              pressable
              onPress={handleSelectNonCustodial}
              className="p-5"
            >
              <View className="flex-row">
                <View className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center mr-4">
                  <Ionicons name="key" size={32} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <View className="flex-row justify-between items-start mb-1">
                    <Text variant="h5" weight="bold">
                      Non-Custodial Wallet
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#9CA3AF"
                    />
                  </View>
                  <View className="bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full self-start mb-3">
                    <Text
                      variant="h9"
                      className="text-blue-700 dark:text-blue-400"
                    >
                      Full control
                    </Text>
                  </View>
                  <Text variant="caption" color="secondary" className="mb-4">
                    You control your wallet completely. Required for gas-free
                    transactions with Paymaster.
                  </Text>

                  <View className="gap-2">
                    {[
                      "Full ownership",
                      "Gas-free transactions",
                      "Enhanced security",
                      "PIN & biometric auth",
                    ].map((feature, index) => (
                      <View key={index} className="flex-row items-center">
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color="#3B82F6"
                        />
                        <Text variant="caption" className="ml-2">
                          {feature}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </Card>

            {/* Modular Wallet Option (NEW) */}
            <Card
              variant="elevated"
              pressable
              onPress={handleSelectModular}
              className="p-5"
            >
              <View className="flex-row">
                <View className="w-14 h-14 rounded-full bg-purple-50 dark:bg-purple-900/20 items-center justify-center mr-4">
                  <Ionicons name="flash" size={32} color="#9333EA" />
                </View>
                <View className="flex-1">
                  <View className="flex-row justify-between items-start mb-1">
                    <Text variant="h5" weight="bold">
                      Gasless Wallet
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#9CA3AF"
                    />
                  </View>
                  <View className="bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-full self-start mb-3">
                    <Text
                      variant="h9"
                      className="text-purple-700 dark:text-purple-400"
                    >
                      ⚡ Pay gas in USDC
                    </Text>
                  </View>
                  <Text variant="caption" color="secondary" className="mb-4">
                    Smart wallet with biometric security. Pay transaction fees
                    in USDC instead of native tokens.
                  </Text>

                  <View className="gap-2">
                    {[
                      "Gas fees in USDC",
                      "Face ID / Touch ID",
                      "Smart contract wallet",
                      "No native tokens needed",
                    ].map((feature, index) => (
                      <View key={index} className="flex-row items-center">
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color="#9333EA"
                        />
                        <Text variant="caption" className="ml-2">
                          {feature}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </Card>
          </View>

          {/* Info Box */}
          <View className="px-6 mt-6">
            <Card variant="filled" className="p-4 flex-row items-start">
              <View className="mr-3 mt-0.5">
                <Ionicons name="information-circle" size={24} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text
                  variant="h7"
                  weight="bold"
                  className="text-blue-700 dark:text-blue-400 mb-1"
                >
                  You can create both types
                </Text>
                <Text
                  variant="caption"
                  className="text-blue-600 dark:text-blue-300"
                >
                  You&apos;re not limited to one wallet type. You can create and
                  use both Easy and Advanced wallets in your account.
                </Text>
              </View>
            </Card>
          </View>
        </ScrollView>
      </View>
    </>
  );
}
