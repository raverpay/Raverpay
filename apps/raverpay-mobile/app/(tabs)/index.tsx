// app/(tabs)/index.tsx
import { Card, Skeleton, SkeletonCircle, Text } from "@/src/components/ui";
import { TransactionItem } from "@/src/components/wallet/TransactionItem";
import { useCashbackWallet } from "@/src/hooks/useCashback";
import { useUnreadCount } from "@/src/hooks/useNotifications";
import { useTransactions } from "@/src/hooks/useTransactions";
import { useWallet } from "@/src/hooks/useWallet";
import { formatCurrency } from "@/src/lib/utils/formatters";
import { useUserStore } from "@/src/store/user.store";
import { useWalletStore } from "@/src/store/wallet.store";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback } from "react";
import { Alert, Image, ScrollView, TouchableOpacity, View } from "react-native";

// Quick Actions configuration
const QUICK_ACTIONS = [
  // {
  //   id: "usdc",
  //   title: "USDC",
  //   image: require("../../assets/icons/usdc2.png"),
  //   route: "/(tabs)/circle-wallet",
  //   requiresUnlock: false,
  // },
  {
    id: "airtime",
    title: "Airtime",
    image: require("../../assets/icons/airtime2.png"),
    route: "/buy-airtime",
    requiresUnlock: true,
  },
  {
    id: "data",
    title: "Data",
    image: require("../../assets/icons/data2.png"),
    route: "/buy-data",
    requiresUnlock: true,
  },
  {
    id: "electricity",
    title: "Electricity",
    image: require("../../assets/icons/electricity2.png"),
    route: "/pay-electricity",
    requiresUnlock: false,
  },
  {
    id: "bills",
    title: "Bills",
    image: require("../../assets/icons/bills2.png"),
    route: "/bills",
    requiresUnlock: false,
  },
];

export default function HomeScreen() {
  // const [refreshing, setRefreshing] = React.useState(false);
  const { user } = useUserStore();
  const {
    balance,
    isBalanceVisible,
    toggleBalanceVisibility,
    isLocked,
    lockedReason,
    kycTier,
  } = useWalletStore();
  // const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Fetch immediately when screen is focused
      onRefresh();

      // Set up polling every 10 seconds while screen is active
      // pollIntervalRef.current = setInterval(() => {
      //   refetchWallet();
      //   refetchCashback();
      //   refetchTransactions();
      // }, 30000); // 10 seconds

      // Cleanup: stop polling when screen loses focus
      // return () => {
      //   if (pollIntervalRef.current) {
      //     clearInterval(pollIntervalRef.current);
      //     pollIntervalRef.current = null;
      //   }
      // };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const { refetch: refetchWallet, isPending: isLoadingWallet } = useWallet();
  const {
    data: cashbackWallet,
    refetch: refetchCashback,
    isPending: isLoadingCashback,
  } = useCashbackWallet();
  const {
    data: transactionsData,
    refetch: refetchTransactions,
    isPending: isLoadingTransactions,
  } = useTransactions({ limit: 5 });

  const recentTransactions = transactionsData?.pages[0]?.data || [];

  const onRefresh = async () => {
    // setRefreshing(true);
    await Promise.all([
      refetchWallet(),
      refetchCashback(),
      refetchTransactions(),
    ]);
    //setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const unreadCount = useUnreadCount();

  const handleNotifications = () => {
    router.push("/notifications");
  };

  // Helper function to show locked alert
  const showLockedAlert = () => {
    Alert.alert(
      "Wallet Locked",
      lockedReason ||
        "Your wallet is locked. Please upgrade your KYC tier to continue.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Upgrade Now", onPress: () => router.push("/tier-details") },
      ]
    );
  };

  // Helper to get next tier
  const getNextTier = (currentTier: string): string => {
    const tierMap: Record<string, string> = {
      TIER_0: "TIER 1 (₦300K daily)",
      TIER_1: "TIER 2 (₦5M daily)",
      TIER_2: "TIER 3 (Unlimited)",
      TIER_3: "Already at max tier",
    };
    return tierMap[currentTier] || "Higher Tier";
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: false, // Disable swipe back gesture
        }}
      />
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <StatusBar style="light" />

        {/* Header */}
        <View className="bg-[#5B55F6] dark:bg-[#5B55F6] pt-12 pb-8 b-8 px-5 rounded-b-3xl relative overflow-hidden">
          {/* Background Wave Image */}
          {/* <Image
            source={require("../../assets/icons/wave2.png")}
            className="absolute right-0 top-10 h-full w-full"
            resizeMode="cover"
            style={{ opacity: 0.3 }}
          /> */}

          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text variant="bodyMedium" className="">
                {getGreeting()}
              </Text>
              <Text variant="h3" className="text-white dark:text-white">
                {user?.firstName || "User"}
              </Text>
            </View>

            <View className="flex-row items-center gap-4">
              {!isLoadingCashback &&
                cashbackWallet &&
                cashbackWallet.availableBalance > 0 && (
                  <TouchableOpacity
                    className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
                    onPress={() => router.push("/cashback-wallet")}
                  >
                    <MaterialIcons
                      name="wallet-giftcard"
                      size={22}
                      color="white"
                    />
                  </TouchableOpacity>
                )}

              <TouchableOpacity
                className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
                onPress={handleNotifications}
              >
                {unreadCount > 0 && (
                  <View className="absolute -top-0 -right-0 w-3 h-3 rounded-full bg-red-500" />
                )}
                <MaterialIcons
                  name="notifications-none"
                  size={24}
                  color="white"
                />
              </TouchableOpacity>
              {/* <TouchableOpacity
                className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
                onPress={() => router.push("/dev-tools")}
              >
                <MaterialIcons
                  name="notifications-none"
                  size={24}
                  color="white"
                />
              </TouchableOpacity> */}
            </View>
          </View>

          {/* Balance Card */}
          <Card variant="filled" className="bg-white/10 backdrop-blur-lg p-5">
            <View className="flex-row items-center justify-between">
              <Text variant="caption" className="text-white opacity-80">
                Available Balance
              </Text>
              {!isLoadingWallet && (
                <TouchableOpacity onPress={toggleBalanceVisibility}>
                  <Ionicons
                    name={isBalanceVisible ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="white"
                  />
                </TouchableOpacity>
              )}
            </View>

            {isLoadingWallet ? (
              <Skeleton
                width={200}
                height={48}
                className="mb-4"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.3)" }}
              />
            ) : (
              <View className="flex-row items-center h-14">
                <Text variant="h2" className="text-white">
                  {isBalanceVisible ? formatCurrency(balance) : "****"}
                </Text>
              </View>
            )}

            <View className="flex-row gap-3">
              <TouchableOpacity
                className={`w-1/2 h-12 rounded-xl items-center justify-center ${
                  isLocked
                    ? "bg-gray-300 dark:bg-gray-600"
                    : "bg-white/20 dark:bg-white/20"
                }`}
                onPress={() => {
                  if (isLocked) {
                    showLockedAlert();
                    return;
                  }
                  router.push("/fund-wallet");
                }}
                disabled={isLoadingWallet}
              >
                <View className="flex-row items-center">
                  {isLocked && (
                    <Ionicons
                      name="lock-closed"
                      size={16}
                      color="#9CA3AF"
                      style={{ marginRight: 8 }}
                    />
                  )}
                  <Text
                    variant="bodyMedium"
                    weight="semibold"
                    className={
                      isLocked
                        ? "text-gray-500 dark:text-gray-400"
                        : "text-white dark:text-white"
                    }
                  >
                    Add Money
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                className={`w-1/2 h-12 rounded-xl items-center justify-center ${
                  isLocked
                    ? "bg-gray-300 dark:bg-gray-600"
                    : "bg-white/20 dark:bg-white/20"
                }`}
                onPress={() => {
                  if (isLocked) {
                    showLockedAlert();
                    return;
                  }
                  router.push("/withdraw");
                }}
                disabled={isLoadingWallet}
              >
                <View className="flex-row items-center">
                  {isLocked && (
                    <Ionicons
                      name="lock-closed"
                      size={16}
                      color="#9CA3AF"
                      style={{ marginRight: 8 }}
                    />
                  )}
                  <Text
                    variant="bodyMedium"
                    weight="semibold"
                    className={
                      isLocked
                        ? "text-gray-500 dark:text-gray-400"
                        : "text-white dark:text-white"
                    }
                  >
                    Transfer
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* Content */}
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          // refreshControl={
          //   <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          // }
        >
          {/* 🧪 TEMPORARY: Developer Testing Panel - REMOVE AFTER TESTING */}
          {/* <View className="mt-4 mb-2">
            <TouchableOpacity
              onPress={() => setShowDevPanel(!showDevPanel)}
              className="bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-400 dark:border-yellow-600 rounded-xl p-3 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <Ionicons
                  name="flask"
                  size={20}
                  color="#F59E0B"
                  style={{ marginRight: 8 }}
                />
                <Text
                  variant="bodyMedium"
                  weight="bold"
                  className="text-yellow-800 dark:text-yellow-200"
                >
                  🧪 Developer Testing Panel
                </Text>
              </View>
              <Ionicons
                name={showDevPanel ? "chevron-up" : "chevron-down"}
                size={20}
                color="#F59E0B"
              />
            </TouchableOpacity>

            {showDevPanel && (
              <View className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-4 mt-2 gap-3">
                <View className="bg-white dark:bg-gray-800 rounded-lg p-3">
                  <Text
                    variant="caption"
                    weight="bold"
                    className="text-gray-600 dark:text-gray-400 mb-2"
                  >
                    CURRENT STATE:
                  </Text>
                  <Text
                    variant="caption"
                    className="text-gray-700 dark:text-gray-300"
                  >
                    Has Seen Welcome: {hasSeenWelcome ? "✅ Yes" : "❌ No"}
                  </Text>
                  <Text
                    variant="caption"
                    className="text-gray-700 dark:text-gray-300"
                  >
                    Authenticated: ✅ Yes (logged in)
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    router.push("/(auth)/welcome");
                  }}
                  className="bg-blue-500 rounded-lg p-3 flex-row items-center justify-center"
                >
                  <Ionicons
                    name="eye"
                    size={18}
                    color="white"
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    variant="bodyMedium"
                    weight="semibold"
                    className="text-white"
                  >
                    Preview Welcome Screen (Current State)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setHasSeenWelcome(false);
                    Alert.alert(
                      "✅ Flag Reset",
                      "hasSeenWelcome = false\n\nNow navigate to welcome screen to see first-time user flow (Splash → Onboarding → Welcome)",
                      [{ text: "OK" }]
                    );
                  }}
                  className="bg-purple-500 rounded-lg p-3 flex-row items-center justify-center"
                >
                  <Ionicons
                    name="refresh"
                    size={18}
                    color="white"
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    variant="bodyMedium"
                    weight="semibold"
                    className="text-white"
                  >
                    Reset Welcome Flag (First-Time User)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setHasSeenWelcome(true);
                    Alert.alert(
                      "✅ Flag Set",
                      "hasSeenWelcome = true\n\nNow navigate to welcome screen to see returning user flow (Splash → Welcome)",
                      [{ text: "OK" }]
                    );
                  }}
                  className="bg-green-500 rounded-lg p-3 flex-row items-center justify-center"
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color="white"
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    variant="bodyMedium"
                    weight="semibold"
                    className="text-white"
                  >
                    Set Welcome Flag (Returning User)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={async () => {
                    Alert.alert(
                      "🚪 Logout & Reset",
                      "This will:\n• Logout (clear auth)\n• Reset hasSeenWelcome to false\n• Restart app to welcome screen",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Logout & Test",
                          style: "destructive",
                          onPress: async () => {
                            setHasSeenWelcome(false);
                            await logout();
                            router.replace("/(auth)/welcome");
                          },
                        },
                      ]
                    );
                  }}
                  className="bg-red-500 rounded-lg p-3 flex-row items-center justify-center"
                >
                  <Ionicons
                    name="log-out"
                    size={18}
                    color="white"
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    variant="bodyMedium"
                    weight="semibold"
                    className="text-white"
                  >
                    Logout & Test Full Flow
                  </Text>
                </TouchableOpacity>

                <View className="bg-orange-100 dark:bg-orange-900/30 border border-orange-400 dark:border-orange-600 rounded-lg p-2">
                  <Text
                    variant="caption"
                    className="text-orange-800 dark:text-orange-200 text-center"
                  >
                    ⚠️ Remember to remove this panel before production!
                  </Text>
                </View>
              </View>
            )}
          </View> */}

          {/* Locked Wallet Warning Banner */}
          {!isLoadingWallet && isLocked && (
            <View className="mt-4 mb-2">
              <Card
                variant="elevated"
                className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800"
              >
                <View className="p-4">
                  <View className="flex-row items-center mb-3">
                    <View className="w-10 h-10 rounded-full bg-red-500 items-center justify-center mr-3">
                      <Ionicons name="lock-closed" size={20} color="white" />
                    </View>
                    <View className="flex-1">
                      <Text
                        variant="bodyMedium"
                        weight="bold"
                        className="text-red-900 dark:text-red-100"
                      >
                        Wallet Locked
                      </Text>
                      <Text
                        variant="caption"
                        className="text-red-700 dark:text-red-300 mt-1"
                      >
                        {lockedReason || "Your wallet has been locked"}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    className="bg-red-500 rounded-xl py-3 items-center"
                    onPress={() => router.push("/tier-details")}
                  >
                    <Text variant="bodyMedium" color="inverse" weight="bold">
                      Upgrade to {getNextTier(kycTier)} to Unlock
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="mt-3 items-center"
                    onPress={() => router.push("/support")}
                  >
                    <Text
                      variant="caption"
                      className="text-red-600 dark:text-red-400 underline"
                    >
                      Contact Support
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            </View>
          )}

          {/* Deposit Limit Indicator */}
          {/* {!isLoadingWallet &&
          !isLocked &&
          kycTier !== "TIER_3" &&
          dailyDepositLimit > 0 && (
            <View className="mt-4 mb-2">
              <Card variant="elevated" className="bg-blue-50 p-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text variant="caption" className="text-blue-900">
                    Daily Deposit Limit ({kycTier})
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/tier-details")}
                  >
                    <Text
                      variant="caption"
                      className="text-[#5B55F6] underline"
                    >
                      Upgrade
                    </Text>
                  </TouchableOpacity>
                </View>

                <View className="h-2 bg-blue-200 rounded-full overflow-hidden mb-2">
                  <View
                    className="h-full bg-blue-500"
                    style={{
                      width: `${Math.min((dailyDepositSpent / dailyDepositLimit) * 100, 100)}%`,
                    }}
                  />
                </View>

                <Text variant="caption" className="text-blue-700">
                  {formatCurrency(dailyDepositLimit - dailyDepositSpent)}{" "}
                  remaining of {formatCurrency(dailyDepositLimit)}
                </Text>
              </Card>
            </View>
          )} */}

          {/* USDC Wallet Card */}
          {/* <TouchableOpacity className="mt-6" onPress={() => router.push('/circle')}>
            <Card variant="elevated" className="bg-gradient-to-r from-[#2775CA] to-[#1E5A99] p-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center mr-3">
                    <Text variant="h4" className="text-white font-bold">
                      $
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text variant="bodyMedium" className="text-white/80">
                      USDC Wallet
                    </Text>
                    <Text variant="h5" className="text-white font-bold">
                      Send & Receive Stablecoins
                    </Text>
                  </View>
                </View>
                <View className="bg-white/20 rounded-full p-2">
                  <Ionicons name="chevron-forward" size={20} color="white" />
                </View>
              </View>
              <View className="flex-row items-center mt-3 pt-3 border-t border-white/20">
                <View className="flex-row items-center mr-4">
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text variant="caption" className="text-white/80 ml-1">
                    Multi-chain
                  </Text>
                </View>
                <View className="flex-row items-center mr-4">
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text variant="caption" className="text-white/80 ml-1">
                    Cross-chain Bridge
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text variant="caption" className="text-white/80 ml-1">
                    Low Fees
                  </Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>  */}

          {/* Quick Actions */}
          <View className="my-6 w-full">
            <View className="flex-row flex-wrap   w-full justify-between ">
              {QUICK_ACTIONS.map((action) => (
                <QuickActionCard
                  key={action.id}
                  image={action.image}
                  title={action.title}
                  onPress={() => {
                    if (action.requiresUnlock && isLocked) {
                      showLockedAlert();
                      return;
                    }
                    router.push(action.route as any);
                  }}
                  disabled={action.requiresUnlock && isLocked}
                />
              ))}
            </View>
          </View>

          {/* Recent Transactions */}
          <View className="mb-8">
            <View className="flex-row items-center justify-between mb-4">
              <Text variant="h4" weight="bold">
                Recent Transactions
              </Text>
              <TouchableOpacity onPress={() => router.push("/transactions")}>
                <Text
                  variant="bodyMedium"
                  className="text-[#5B55F6] dark:text-[#5B55F6]"
                >
                  View All
                </Text>
              </TouchableOpacity>
            </View>

            <Card variant="elevated" className="overflow-hidden">
              {isLoadingTransactions ? (
                <View className="p-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <TransactionItemSkeleton key={i} />
                  ))}
                </View>
              ) : recentTransactions.length === 0 ? (
                <View className="p-8 items-center">
                  <View className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center mb-4">
                    <Ionicons
                      name="receipt-outline"
                      size={32}
                      color="#9CA3AF"
                    />
                  </View>
                  <Text variant="bodyMedium" color="secondary" align="center">
                    No transactions yet
                  </Text>
                  <Text
                    variant="caption"
                    color="secondary"
                    align="center"
                    className="mt-2"
                  >
                    Your transactions will appear here
                  </Text>
                </View>
              ) : (
                <View className="p-4">
                  {recentTransactions.map((transaction: any) => (
                    <TransactionItem
                      key={transaction.id}
                      transaction={transaction}
                    />
                  ))}
                </View>
              )}
            </Card>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

// Quick Action Component
interface QuickActionCardProps {
  icon?: keyof typeof Ionicons.glyphMap;
  image?: any;
  title: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  icon,
  image,
  title,
  onPress,
  disabled = false,
  color,
}) => (
  <TouchableOpacity
    className={`w-[48%] mb-4 ${disabled ? "opacity-50" : ""}`}
    onPress={onPress}
    disabled={disabled}
  >
    <Card variant="elevated" className="p-4 items-center relative">
      {disabled && (
        <View className="absolute top-2 right-2">
          <Ionicons name="lock-closed" size={12} color="#5B55F6" />
        </View>
      )}
      {image ? (
        <Image source={image} className="w-12 h-12 mb-2" resizeMode="contain" />
      ) : (
        <View
          className="w-12 h-12 rounded-full items-center justify-center mb-2"
          style={{
            backgroundColor: disabled ? "#9CA3AF" : color || "#5B55F6",
          }}
        >
          <Ionicons name={icon!} size={24} color="white" />
        </View>
      )}
      <Text
        variant="h5"
        align="center"
        className={disabled ? "text-gray-500" : ""}
      >
        {title}
      </Text>
    </Card>
  </TouchableOpacity>
);

// Transaction Item Skeleton
const TransactionItemSkeleton: React.FC = () => (
  <View className="flex-row items-center py-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
    <SkeletonCircle size={48} />
    <View className="flex-1 ml-4">
      <Skeleton width="70%" height={16} className="mb-2" />
      <Skeleton width="40%" height={14} />
    </View>
    <View className="items-end">
      <Skeleton width={80} height={16} className="mb-2" />
      <Skeleton width={60} height={14} />
    </View>
  </View>
);
