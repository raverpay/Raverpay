// app/cashback-wallet.tsx
import { Card, ScreenHeader, Skeleton, Text } from "@/src/components/ui";
import { useCashbackHistory, useCashbackWallet } from "@/src/hooks/useCashback";
import { formatCurrency } from "@/src/lib/utils/formatters";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TransactionType = "EARNED" | "REDEEMED" | "EXPIRED" | "REVERSED";

interface CashbackTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  balanceAfter: number;
  createdAt: string;
}

export default function CashbackWalletScreen() {
  const insets = useSafeAreaInsets();
  const [currentPage] = useState(1);
  const limit = 20;

  const {
    data: cashbackWallet,
    isLoading: isLoadingWallet,
    refetch: refetchWallet,
  } = useCashbackWallet();
  const {
    data: historyData,
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = useCashbackHistory(currentPage, limit);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchWallet(), refetchHistory()]);
    setIsRefreshing(false);
  };

  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case "EARNED":
        return { name: "arrow-down-circle" as const, color: "#22C55E" };
      case "REDEEMED":
        return { name: "arrow-up-circle" as const, color: "#EF4444" };
      case "EXPIRED":
        return { name: "time-outline" as const, color: "#F59E0B" };
      case "REVERSED":
        return { name: "arrow-undo-circle" as const, color: "#6B7280" };
    }
  };

  const getTransactionSign = (type: TransactionType) => {
    switch (type) {
      case "EARNED":
      case "REVERSED":
        return "+";
      case "REDEEMED":
      case "EXPIRED":
        return "-";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return `Today, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    } else if (diffInDays === 1) {
      return `Yesterday, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    } else if (diffInDays < 7) {
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  const renderTransaction = ({ item }: { item: CashbackTransaction }) => {
    const iconConfig = getTransactionIcon(item.type);
    const sign = getTransactionSign(item.type);

    return (
      <Card variant="elevated" className="p-4 mb-3">
        <View className="flex-row items-center">
          <View
            className="w-12 h-12 rounded-full items-center justify-center mr-4"
            style={{ backgroundColor: `${iconConfig.color}20` }}
          >
            <Ionicons
              name={iconConfig.name}
              size={24}
              color={iconConfig.color}
            />
          </View>

          <View className="flex-1">
            <Text variant="bodyMedium" weight="semibold">
              {item.description.length > 25
                ? item.description.substring(0, 25) + "......"
                : item.description}
            </Text>
            <Text variant="caption" color="secondary" className="mt-1">
              {formatDate(item.createdAt)}
            </Text>
          </View>

          <View className="items-end">
            <Text
              variant="bodyMedium"
              weight="semibold"
              style={{
                color:
                  item.type === "EARNED" || item.type === "REVERSED"
                    ? "#22C55E"
                    : "#EF4444",
              }}
            >
              {sign}
              {formatCurrency(item.amount)}
            </Text>
            <Text variant="caption" color="secondary" className="mt-1">
              Bal: {formatCurrency(item.balanceAfter)}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center px-5 py-20">
      <View className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center mb-4">
        <Ionicons name="wallet-outline" size={48} color="#9CA3AF" />
      </View>
      <Text variant="h3" align="center" className="mb-2">
        No Transactions Yet
      </Text>
      <Text variant="body" color="secondary" align="center" className="mb-6">
        Your cashback transactions will appear here once you start earning
        rewards
      </Text>
    </View>
  );

  const renderSkeleton = () => (
    <View className="px-5 pt-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} variant="elevated" className="p-4 mb-3">
          <View className="flex-row items-center">
            <Skeleton
              width={48}
              height={48}
              borderRadius={24}
              className="mr-4"
            />
            <View className="flex-1">
              <Skeleton width="60%" height={16} className="mb-2" />
              <Skeleton width="40%" height={14} />
            </View>
            <View className="items-end">
              <Skeleton width={80} height={18} className="mb-2" />
              <Skeleton width={60} height={14} />
            </View>
          </View>
        </Card>
      ))}
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style="light" />

      {/* Header */}
      <ScreenHeader title="Cashback Wallet" variant="transparent" />

      <View className="bg-[#5B55F6] pb-4 px-5 rounded-b-3xl pt-4">
        {/* Balance Card */}
        {isLoadingWallet ? (
          <Card variant="elevated" className="p-6 bg-white dark:bg-gray-800">
            <Skeleton width="40%" height={14} className="mb-2" />
            <Skeleton width="60%" height={32} className="mb-4" />
            <View className="flex-row gap-4">
              <View className="flex-1">
                <Skeleton width="80%" height={12} className="mb-1" />
                <Skeleton width="60%" height={16} />
              </View>
              <View className="flex-1">
                <Skeleton width="80%" height={12} className="mb-1" />
                <Skeleton width="60%" height={16} />
              </View>
            </View>
          </Card>
        ) : (
          <Card variant="elevated" className="p-6 bg-white dark:bg-gray-800">
            <Text variant="caption" color="secondary" className="mb-2">
              Available Balance
            </Text>
            <Text variant="h1" className="text-[#5B55F6] mb-6">
              {formatCurrency(cashbackWallet?.availableBalance || 0)}
            </Text>

            <View className="flex-row gap-4">
              <View className="flex-1">
                <Text variant="caption" color="secondary" className="mb-1">
                  Total Earned
                </Text>
                <Text
                  variant="bodyMedium"
                  weight="semibold"
                  className="text-green-600"
                >
                  {formatCurrency(cashbackWallet?.totalEarned || 0)}
                </Text>
              </View>

              <View className="w-px bg-gray-200" />

              <View className="flex-1">
                <Text variant="caption" color="secondary" className="mb-1">
                  Total Redeemed
                </Text>
                <Text
                  variant="bodyMedium"
                  weight="semibold"
                  className="text-gray-700"
                >
                  {formatCurrency(cashbackWallet?.totalRedeemed || 0)}
                </Text>
              </View>
            </View>
          </Card>
        )}
      </View>

      {/* Transaction History */}
      <View className="flex-1 pt-6">
        <View className="px-5 mb-4">
          <Text variant="h3">Transaction History</Text>
        </View>

        {isLoadingHistory && !historyData ? (
          renderSkeleton()
        ) : historyData?.data && historyData.data.length > 0 ? (
          <FlashList
            data={historyData.data}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
              />
            }
          />
        ) : (
          renderEmptyState()
        )}
      </View>

      {/* Info Card */}
      <View
        className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-5 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 24) }}
      >
        <Card
          variant="elevated"
          className="p-4 bg-purple-50 dark:bg-purple-900/20"
        >
          <View className="flex-row items-start">
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#5B55F6"
            />
            <View className="ml-3 flex-1">
              <Text variant="caption" color="secondary">
                • Earn cashback on data, airtime, and bill payments{"\n"}• Use
                your cashback balance to reducecosts{"\n"}• Cashback expires
                after 90 days of inactivity
              </Text>
            </View>
          </View>
        </Card>
      </View>
    </View>
  );
}
