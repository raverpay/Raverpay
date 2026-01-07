// app/p2p-history.tsx
import { Card, ScreenHeader, Text } from "@/src/components/ui";
import { useP2PHistory } from "@/src/hooks/useP2P";

import { useTheme } from "@/src/hooks/useTheme";
import {
  getRelativeTimeLabel,
  groupItemsByDate,
} from "@/src/lib/utils/dateGrouping";
import { formatCurrency } from "@/src/lib/utils/formatters";
import type { P2PTransfer } from "@/src/types/api.types";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  View,
} from "react-native";

const DEFAULT_AVATAR =
  "https://ui-avatars.com/api/?name=User&background=5B55F6&color=fff";

export default function P2PHistoryScreen() {
  const { isDark } = useTheme();
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useP2PHistory();

  // const transfers = data?.pages.flatMap((page) => page.transfers) || [];

  // Group transfers by date
  const groupedTransfers = useMemo(() => {
    const transfersList = data?.pages.flatMap((page) => page.transfers) || [];
    return groupItemsByDate(transfersList, "createdAt");
  }, [data]);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  const renderSection = ({
    item: section,
  }: {
    item: { title: string; data: P2PTransfer[] };
  }) => (
    <View>
      {/* Section Header */}
      <View className="py-3 mt-2">
        <Text variant="bodyMedium" weight="semibold" color="secondary">
          {section.title}
        </Text>
      </View>
      {/* Section Items */}
      {section.data.map((transfer) => (
        <TransferItem key={transfer.id} transfer={transfer} />
      ))}
    </View>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#5B55F6" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#5B55F6" />
          <Text variant="body" color="secondary" className="mt-4">
            Loading transfers...
          </Text>
        </View>
      );
    }

    return (
      <View className="flex-1 items-center justify-center py-20">
        <View className="w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-900/30 items-center justify-center mb-4">
          <Ionicons name="swap-horizontal" size={40} color="#5B55F6" />
        </View>
        <Text variant="h3" className="mb-2">
          No P2P Transfers Yet
        </Text>
        <Text
          variant="body"
          color="secondary"
          align="center"
          className="mb-6 px-8"
        >
          Send money to other users with their @username
        </Text>
        <TouchableOpacity
          className="bg-[#5B55F6] px-6 py-3 rounded-xl"
          onPress={() => router.push("/send-p2p")}
        >
          <Text variant="bodyMedium" className="text-white">
            Send Money
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <ScreenHeader title="P2P Transfers" />

      {/* Transfer List */}
      <FlatList
        data={groupedTransfers}
        renderItem={renderSection}
        keyExtractor={(item) => item.title}
        contentContainerStyle={{ padding: 20 }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor="#5B55F6"
          />
        }
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
      />
    </View>
  );
}

interface TransferItemProps {
  transfer: P2PTransfer;
}

const TransferItem: React.FC<TransferItemProps> = ({ transfer }) => {
  const isSent = transfer.type === "SENT";
  const amount = parseFloat(transfer.amount);

  return (
    <Card variant="elevated" className="p-4 mb-3">
      <View className="flex-row items-center">
        {/* Avatar */}
        <Image
          source={{ uri: transfer.counterparty.avatar || DEFAULT_AVATAR }}
          className="w-12 h-12 rounded-full"
        />

        {/* Info */}
        <View className="flex-1 ml-3">
          <Text variant="bodyMedium" weight="bold">
            {transfer.counterparty.name}
          </Text>
          <Text variant="caption" className="text-[#5B55F6]">
            @{transfer.counterparty.tag}
          </Text>
          {transfer.message && (
            <Text
              variant="caption"
              color="secondary"
              numberOfLines={1}
              className="mt-1"
            >
              {transfer.message}
            </Text>
          )}
          <Text variant="caption" color="secondary" className="mt-1">
            {getRelativeTimeLabel(new Date(transfer.createdAt))}
          </Text>
        </View>

        {/* Amount */}
        <View className="items-end">
          <Text
            variant="bodyMedium"
            weight="bold"
            className={isSent ? "text-red-600" : "text-green-600"}
          >
            {isSent ? "-" : "+"}
            {formatCurrency(amount)}
          </Text>
          <Text variant="caption" color="secondary" className="mt-1">
            {isSent ? "Sent" : "Received"}
          </Text>
          {transfer.status === "COMPLETED" && (
            <View className="flex-row items-center mt-1">
              <Ionicons name="checkmark-circle" size={12} color="#10B981" />
              <Text variant="caption" className="text-green-600 ml-1">
                Completed
              </Text>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
};
