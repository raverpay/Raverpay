// app/transactions.tsx
import {
  ScreenHeader,
  Skeleton,
  SkeletonCircle,
  Text,
} from "@/src/components/ui";
import { TransactionItem } from "@/src/components/wallet/TransactionItem";
import { useTheme } from "@/src/hooks/useTheme";
import { useTransactions } from "@/src/hooks/useTransactions";
import { groupItemsByDate } from "@/src/lib/utils/dateGrouping";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";

// Backend filter types (simplified categories)
type TransactionFilterType = "ALL" | "DEBIT" | "CREDIT";

type TransactionStatus =
  | "ALL"
  | "COMPLETED"
  | "PENDING"
  | "FAILED"
  | "REVERSED";

type DateRangeFilter = "ALL" | "TODAY" | "WEEK" | "MONTH" | "CUSTOM";

const TRANSACTION_TYPES: {
  label: string;
  value: TransactionFilterType;
  description: string;
}[] = [
  {
    label: "All Transactions",
    value: "ALL",
    description: "Show all transactions",
  },
  {
    label: "Money In",
    value: "CREDIT",
    description: "Deposits, refunds, sales",
  },
  {
    label: "Money Out",
    value: "DEBIT",
    description: "Withdrawals, purchases, bills",
  },
];

const TRANSACTION_STATUSES: { label: string; value: TransactionStatus }[] = [
  { label: "All Status", value: "ALL" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Pending", value: "PENDING" },
  { label: "Failed", value: "FAILED" },
  { label: "Reversed", value: "REVERSED" },
];

const DATE_RANGES: {
  label: string;
  value: DateRangeFilter;
  description: string;
}[] = [
  { label: "All Time", value: "ALL", description: "Show all transactions" },
  { label: "Today", value: "TODAY", description: "Transactions from today" },
  { label: "Last 7 Days", value: "WEEK", description: "Past week" },
  { label: "Last 30 Days", value: "MONTH", description: "Past month" },
];

export default function TransactionsScreen() {
  const { isDark } = useTheme();
  const [selectedType, setSelectedType] =
    useState<TransactionFilterType>("ALL");
  const [selectedStatus, setSelectedStatus] =
    useState<TransactionStatus>("ALL");
  const [selectedDateRange, setSelectedDateRange] =
    useState<DateRangeFilter>("ALL");
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);

  // Helper function to get date range
  const getDateRange = (range: DateRangeFilter) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (range) {
      case "TODAY":
        return {
          startDate: today.toISOString(),
          endDate: now.toISOString(),
        };
      case "WEEK":
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return {
          startDate: weekAgo.toISOString(),
          endDate: now.toISOString(),
        };
      case "MONTH":
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        return {
          startDate: monthAgo.toISOString(),
          endDate: now.toISOString(),
        };
      default:
        return {};
    }
  };

  // Build filter params
  const filterParams: any = { limit: 20 };
  if (selectedType !== "ALL") filterParams.type = selectedType;
  if (selectedStatus !== "ALL") filterParams.status = selectedStatus;

  // Add date range filters
  const dateRange = getDateRange(selectedDateRange);
  if (dateRange.startDate) filterParams.startDate = dateRange.startDate;
  if (dateRange.endDate) filterParams.endDate = dateRange.endDate;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending: isLoading,
    refetch,
  } = useTransactions(filterParams);

  const transactions = data?.pages.flatMap((page) => page.data) || [];

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const transactionsList = data?.pages.flatMap((page) => page.data) || [];
    return groupItemsByDate(transactionsList, "createdAt");
  }, [data]);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  const clearFilters = () => {
    setSelectedType("ALL");
    setSelectedStatus("ALL");
    setSelectedDateRange("ALL");
  };

  const hasActiveFilters =
    selectedType !== "ALL" ||
    selectedStatus !== "ALL" ||
    selectedDateRange !== "ALL";

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <ScreenHeader title="Transactions" />

      {/* Filters */}
      <View className="bg-white dark:bg-gray-800 px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        {/* First Row: Type and Status */}
        <View className="flex-row items-center gap-3 mb-3">
          {/* Type Filter */}
          <TouchableOpacity
            onPress={() => setShowTypeModal(true)}
            className="flex-1 flex-row items-center justify-between bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-lg"
          >
            <View className="flex-row items-center flex-1">
              <Ionicons
                name="funnel-outline"
                size={16}
                color={isDark ? "#9CA3AF" : "#6B7280"}
                style={{ marginRight: 8 }}
              />
              <Text variant="body" color="secondary" numberOfLines={1}>
                {TRANSACTION_TYPES.find((t) => t.value === selectedType)?.label}
              </Text>
            </View>
            <Ionicons
              name="chevron-down"
              size={16}
              color={isDark ? "#9CA3AF" : "#6B7280"}
            />
          </TouchableOpacity>

          {/* Status Filter */}
          <TouchableOpacity
            onPress={() => setShowStatusModal(true)}
            className="flex-1 flex-row items-center justify-between bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-lg"
          >
            <View className="flex-row items-center flex-1">
              <Ionicons
                name="checkbox-outline"
                size={16}
                color={isDark ? "#9CA3AF" : "#6B7280"}
                style={{ marginRight: 8 }}
              />
              <Text variant="body" color="secondary" numberOfLines={1}>
                {
                  TRANSACTION_STATUSES.find((s) => s.value === selectedStatus)
                    ?.label
                }
              </Text>
            </View>
            <Ionicons
              name="chevron-down"
              size={16}
              color={isDark ? "#9CA3AF" : "#6B7280"}
            />
          </TouchableOpacity>
        </View>

        {/* Second Row: Date and Clear */}
        <View className="flex-row items-center gap-3">
          {/* Date Range Filter */}
          <TouchableOpacity
            onPress={() => setShowDateModal(true)}
            className="flex-1 flex-row items-center justify-between bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-lg"
          >
            <View className="flex-row items-center flex-1">
              <Ionicons
                name="calendar-outline"
                size={16}
                color={isDark ? "#9CA3AF" : "#6B7280"}
                style={{ marginRight: 8 }}
              />
              <Text variant="body" color="secondary" numberOfLines={1}>
                {DATE_RANGES.find((d) => d.value === selectedDateRange)?.label}
              </Text>
            </View>
            <Ionicons
              name="chevron-down"
              size={16}
              color={isDark ? "#9CA3AF" : "#6B7280"}
            />
          </TouchableOpacity>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <TouchableOpacity
              onPress={clearFilters}
              className="bg-purple-100 dark:bg-purple-900/30 px-4 py-3 rounded-lg"
            >
              <View className="flex-row items-center">
                <Ionicons
                  name="close"
                  size={16}
                  color="#5B55F6"
                  style={{ marginRight: 4 }}
                />
                <Text variant="caption" className="text-[#5B55F6]">
                  Clear
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Transactions List */}
      {isLoading ? (
        <View className="flex-1 px-5 pt-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <TransactionItemSkeleton key={i} />
          ))}
        </View>
      ) : transactions.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
            <Ionicons name="receipt-outline" size={40} color="#9CA3AF" />
          </View>
          <Text variant="h3" className="mb-2">
            No transactions found
          </Text>
          <Text
            variant="body"
            color="secondary"
            align="center"
            className="mb-6"
          >
            {hasActiveFilters
              ? "Try adjusting your filters to see more results"
              : "Your transactions will appear here"}
          </Text>
          {hasActiveFilters && (
            <TouchableOpacity
              onPress={clearFilters}
              className="bg-[#5B55F6] px-6 py-3 rounded-lg"
            >
              <Text variant="bodyMedium" className="text-white">
                Clear Filters
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={groupedTransactions}
          keyExtractor={(item) => item.title}
          renderItem={({ item: section }) => (
            <View className="px-5">
              {/* Section Header */}
              <View className="py-3 mt-2">
                <Text variant="bodyMedium" weight="semibold" color="secondary">
                  {section.title}
                </Text>
              </View>
              {/* Section Items */}
              {section.data.map((transaction) => (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                />
              ))}
            </View>
          )}
          contentContainerStyle={{ paddingVertical: 16 }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshing={false}
          onRefresh={handleRefresh}
          ListFooterComponent={() =>
            isFetchingNextPage ? (
              <View className="py-4">
                <ActivityIndicator size="small" color="#8B5CF6" />
              </View>
            ) : null
          }
        />
      )}

      {/* Type Filter Modal */}
      <FilterModal
        visible={showTypeModal}
        title="Filter by Type"
        options={TRANSACTION_TYPES}
        selectedValue={selectedType}
        onSelect={(value) => {
          setSelectedType(value as TransactionFilterType);
          setShowTypeModal(false);
        }}
        onClose={() => setShowTypeModal(false)}
      />

      {/* Status Filter Modal */}
      <FilterModal
        visible={showStatusModal}
        title="Filter by Status"
        options={TRANSACTION_STATUSES}
        selectedValue={selectedStatus}
        onSelect={(value) => {
          setSelectedStatus(value as TransactionStatus);
          setShowStatusModal(false);
        }}
        onClose={() => setShowStatusModal(false)}
      />

      {/* Date Range Filter Modal */}
      <FilterModal
        visible={showDateModal}
        title="Filter by Date"
        options={DATE_RANGES}
        selectedValue={selectedDateRange}
        onSelect={(value) => {
          setSelectedDateRange(value as DateRangeFilter);
          setShowDateModal(false);
        }}
        onClose={() => setShowDateModal(false)}
      />
    </View>
  );
}

// Filter Modal Component
interface FilterModalProps {
  visible: boolean;
  title: string;
  options: { label: string; value: string; description?: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}) => {
  const { isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        className="flex-1 bg-black/50"
        activeOpacity={1}
        onPress={onClose}
      >
        <View className="flex-1 justify-end">
          <TouchableOpacity activeOpacity={1}>
            <View className="bg-white dark:bg-gray-800 rounded-t-3xl">
              {/* Header */}
              <View className="flex-row items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                <Text variant="h3">{title}</Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={isDark ? "#F3F4F6" : "#111827"}
                  />
                </TouchableOpacity>
              </View>

              {/* Options */}
              <ScrollView className="max-h-96">
                {options.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => onSelect(option.value)}
                    className={`px-5 py-4 border-b border-gray-100 dark:border-gray-700 ${
                      selectedValue === option.value
                        ? "bg-purple-50 dark:bg-purple-900/30"
                        : ""
                    }`}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text
                          variant="bodyMedium"
                          className={
                            selectedValue === option.value
                              ? "text-[#5B55F6]"
                              : ""
                          }
                        >
                          {option.label}
                        </Text>
                        {option.description && (
                          <Text
                            variant="caption"
                            color="secondary"
                            className="mt-1"
                          >
                            {option.description}
                          </Text>
                        )}
                      </View>
                      {selectedValue === option.value && (
                        <Ionicons name="checkmark" size={20} color="#8B5CF6" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// Transaction Item Skeleton
const TransactionItemSkeleton: React.FC = () => (
  <View className="flex-row items-center py-4 border-b border-gray-100">
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
