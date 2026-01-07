// app/circle/paymaster-status.tsx
import { Button, Card, Text } from "@/src/components/ui";
import { usePaymaster } from "@/src/hooks/usePaymaster";
import { useTheme } from "@/src/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PaymasterStatusScreen() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { userOpHash } = useLocalSearchParams<{ userOpHash: string }>();
  const { getUserOpStatus } = usePaymaster();

  const [userOp, setUserOp] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch UserOperation status
  useEffect(() => {
    const fetchStatus = async () => {
      if (!userOpHash) return;

      try {
        const status = await getUserOpStatus(userOpHash);
        setUserOp(status);
      } catch (error) {
        console.error("Failed to fetch UserOp status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userOpHash]);

  // Auto-refresh while pending
  useEffect(() => {
    if (
      !userOp ||
      userOp.status === "CONFIRMED" ||
      userOp.status === "FAILED"
    ) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const status = await getUserOpStatus(userOpHash);
        setUserOp(status);
      } catch (error) {
        console.error("Failed to refresh status:", error);
      }
    }, 3000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userOp, userOpHash]);

  if (isLoading || !userOp) {
    return (
      <>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View className="flex-1 bg-gray-50 dark:bg-gray-900 justify-center items-center">
          <ActivityIndicator size="large" color="#2775CA" />
          <Text variant="body" color="secondary" className="mt-4">
            Loading UserOperation...
          </Text>
        </View>
      </>
    );
  }

  const getStateInfo = () => {
    switch (userOp.status) {
      case "PENDING":
        return {
          icon: "time-outline" as const,
          color: "#F59E0B",
          title: "UserOperation Pending",
          description: "Your transaction is being processed by the bundler...",
          progress: 50,
        };
      case "CONFIRMED":
        return {
          icon: "checkmark-circle" as const,
          color: "#10B981",
          title: "Transaction Complete",
          description: "Your USDC transfer was successful! Gas paid in USDC.",
          progress: 100,
        };
      case "FAILED":
        return {
          icon: "close-circle" as const,
          color: "#EF4444",
          title: "Transaction Failed",
          description:
            "The UserOperation failed to complete. Please try again.",
          progress: 0,
        };
      default:
        return {
          icon: "help-circle-outline" as const,
          color: "#9CA3AF",
          title: "Unknown Status",
          description: "UserOperation status is unknown.",
          progress: 0,
        };
    }
  };

  const stateInfo = getStateInfo();
  const isComplete = userOp.status === "CONFIRMED";
  const isFailed = userOp.status === "FAILED";

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <StatusBar style={isDark ? "light" : "dark"} />
      <View
        className="flex-1 bg-gray-50 dark:bg-gray-900"
        style={{ paddingTop: insets.top }}
      >
        <ScrollView className="flex-1">
          {/* Header */}
          <View className="px-6 py-4">
            <Text variant="h4" weight="bold" className="dark:text-white">
              Paymaster Transaction
            </Text>
            <Text variant="caption" color="secondary" className="mt-1">
              Gas paid in USDC
            </Text>
          </View>

          {/* Status Card */}
          <View className="px-6 mb-6">
            <Card variant="elevated" className="p-6 items-center">
              {/* Icon */}
              <View
                className="w-24 h-24 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: `${stateInfo.color}20` }}
              >
                <Ionicons
                  name={stateInfo.icon}
                  size={48}
                  color={stateInfo.color}
                />
              </View>

              {/* Status Title */}
              <Text variant="h5" weight="bold" className="mb-2 dark:text-white">
                {stateInfo.title}
              </Text>

              {/* Status Description */}
              <Text
                variant="body"
                color="secondary"
                align="center"
                className="mb-4"
              >
                {stateInfo.description}
              </Text>

              {/* Progress Bar */}
              {!isFailed && (
                <View className="w-full mb-4">
                  <View className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <View
                      className="h-full bg-[#2775CA] rounded-full"
                      style={{ width: `${stateInfo.progress}%` }}
                    />
                  </View>
                  <Text variant="caption" color="secondary" className="mt-2">
                    {stateInfo.progress}% Complete
                  </Text>
                </View>
              )}
            </Card>
          </View>

          {/* Transaction Details */}
          <View className="px-6 mb-6">
            <Text variant="h6" weight="bold" className="mb-3 dark:text-white">
              Transaction Details
            </Text>

            <Card variant="outlined">
              {/* UserOp Hash */}
              <View className="p-4 border-b border-gray-200 dark:border-gray-700">
                <Text variant="caption" color="secondary" className="mb-1">
                  UserOperation Hash
                </Text>
                <Text
                  variant="body"
                  className="dark:text-white font-mono text-xs"
                >
                  {userOp.userOpHash}
                </Text>
              </View>

              {/* Sender */}
              <View className="p-4 border-b border-gray-200 dark:border-gray-700">
                <Text variant="caption" color="secondary" className="mb-1">
                  From Address
                </Text>
                <Text
                  variant="bodyMedium"
                  className="dark:text-white font-mono"
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {userOp.sender}
                </Text>
              </View>

              {/* Blockchain */}
              <View className="p-4 border-b border-gray-200 dark:border-gray-700">
                <Text variant="caption" color="secondary" className="mb-1">
                  Blockchain
                </Text>
                <Text variant="body" className="dark:text-white">
                  {userOp.blockchain}
                </Text>
              </View>

              {/* Transaction Hash */}
              {userOp.transactionHash && (
                <View className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <Text variant="caption" color="secondary" className="mb-1">
                    Transaction Hash
                  </Text>
                  <Text
                    variant="bodyMedium"
                    className="dark:text-white font-mono"
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {userOp.transactionHash}
                  </Text>
                </View>
              )}

              {/* Gas Fee (Estimated) */}
              <View className="p-4 border-b border-gray-200 dark:border-gray-700">
                <Text variant="caption" color="secondary" className="mb-1">
                  Estimated Gas Fee (USDC)
                </Text>
                <Text variant="body" className="dark:text-white">
                  ${parseFloat(userOp.estimatedGasUsdc).toFixed(6)} USDC
                </Text>
              </View>

              {/* Gas Fee (Actual) */}
              {userOp.actualGasUsdc && (
                <View className="p-4">
                  <Text variant="caption" color="secondary" className="mb-1">
                    Actual Gas Fee (USDC)
                  </Text>
                  <Text
                    variant="body"
                    className="text-green-600 dark:text-green-400"
                  >
                    ${parseFloat(userOp.actualGasUsdc).toFixed(6)} USDC
                  </Text>
                  {parseFloat(userOp.estimatedGasUsdc) >
                    parseFloat(userOp.actualGasUsdc) && (
                    <Text
                      variant="caption"
                      className="text-green-600 dark:text-green-400 mt-1"
                    >
                      Saved $
                      {(
                        parseFloat(userOp.estimatedGasUsdc) -
                        parseFloat(userOp.actualGasUsdc)
                      ).toFixed(6)}
                      !
                    </Text>
                  )}
                </View>
              )}
            </Card>
          </View>

          {/* Auto-refresh indicator */}
          {!isComplete && !isFailed && (
            <View className="px-6 mb-6">
              <Card variant="filled" className="flex-row items-center">
                <ActivityIndicator size="small" color="#2775CA" />
                <Text variant="caption" color="secondary" className="ml-2">
                  Auto-refreshing status...
                </Text>
              </Card>
            </View>
          )}

          {/* Paymaster Info */}
          <View className="px-6 mb-6">
            <Card
              variant="filled"
              className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
            >
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={20} color="#2775CA" />
                <View className="ml-3 flex-1">
                  <Text
                    variant="bodyMedium"
                    weight="semibold"
                    className="text-blue-800 dark:text-blue-200 mb-1"
                  >
                    Paymaster Transaction
                  </Text>
                  <Text
                    variant="caption"
                    className="text-blue-700 dark:text-blue-300"
                  >
                    This transaction used Circle&apos;s Paymaster to pay gas
                    fees in USDC instead of native tokens.
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View
          className="px-6 pb-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
          style={{ paddingBottom: insets.bottom + 24 }}
        >
          {isComplete && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => router.replace("/(tabs)/circle-wallet")}
              className="bg-[#2775CA]"
            >
              Back to Wallet
            </Button>
          )}

          {isFailed && (
            <>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onPress={() => router.replace("/circle/send")}
                className="mb-3 bg-[#2775CA]"
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                size="lg"
                fullWidth
                onPress={() => router.replace("/(tabs)/circle-wallet")}
              >
                Back to Wallet
              </Button>
            </>
          )}

          {!isComplete && !isFailed && (
            <Button
              variant="outline"
              size="lg"
              fullWidth
              onPress={() => router.replace("/(tabs)/circle-wallet")}
            >
              Back to Wallet
            </Button>
          )}
        </View>
      </View>
    </>
  );
}
