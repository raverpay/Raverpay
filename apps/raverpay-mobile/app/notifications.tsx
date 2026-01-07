// app/notifications.tsx

import {
  Button,
  Card,
  ScreenHeader,
  Skeleton,
  SkeletonCircle,
  Text,
} from "@/src/components/ui";
import {
  useDeleteNotification,
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications,
} from "@/src/hooks/useNotifications";
import { useTheme } from "@/src/hooks/useTheme";
import {
  getRelativeTimeLabel,
  groupItemsByDate,
} from "@/src/lib/utils/dateGrouping";
import type { Notification } from "@/src/types/notification";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function NotificationsScreen() {
  const { isDark } = useTheme();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 1.0, 420);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useNotifications({ unreadOnly: showUnreadOnly });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  // const notifications = data?.pages.flatMap((page) => page.notifications) || [];
  const unreadCount = data?.pages[0]?.unreadCount || 0;

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const notificationsList =
      data?.pages.flatMap((page) => page.notifications) || [];
    return groupItemsByDate(notificationsList, "createdAt");
  }, [data]);

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      await markAsRead.mutateAsync(notification.id);
    }

    // Show notification details
    setSelectedNotification(notification);
  };

  const handleDeleteNotification = (notificationId: string) => {
    Alert.alert(
      "Delete Notification",
      "Are you sure you want to delete this notification?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteNotification.mutate(notificationId),
        },
      ]
    );
  };

  const handleMarkAllAsRead = () => {
    // console.log("First marking all notifications as read");
    Alert.alert("Mark All as Read", "Mark all notifications as read?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Mark All",
        onPress: () => markAllAsRead.mutate(),
      },
    ]);
  };

  return (
    <View className="flex-1 bg-black-900">
      <StatusBar style={isDark ? "light" : "dark"} />
      <TouchableWithoutFeedback onPress={() => router.back()}>
        <View className="flex-1" />
      </TouchableWithoutFeedback>

      <View
        className="h-full bg-gray-50 dark:bg-gray-900 rounded-l-3xl"
        style={{
          width: drawerWidth,
        }}
      >
        {/* Header */}
        <ScreenHeader
          title="Notifications"
          backIcon="close"
          rightIcon="settings-outline"
          onRightIconPress={() => router.push("/notification-preferences")}
          variant="transparent"
        />

        <View className="px-5 pb-6 border-b border-gray-200 dark:border-gray-700">
          {/* Filter Tabs */}
          <View className="flex-row gap-2 mt-4">
            <TouchableOpacity
              onPress={() => setShowUnreadOnly(false)}
              className={`px-4 py-2 rounded-full ${!showUnreadOnly ? "bg-[#5B55F6]" : "bg-gray-200 dark:bg-gray-700"}`}
            >
              <Text
                variant="caption"
                weight="semibold"
                className={
                  !showUnreadOnly
                    ? "text-white"
                    : "text-gray-600 dark:text-gray-300"
                }
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowUnreadOnly(true)}
              className={`px-4 py-2 rounded-full ${showUnreadOnly ? "bg-[#5B55F6]" : "bg-gray-200 dark:bg-gray-700"}`}
            >
              <Text
                variant="caption"
                weight="semibold"
                className={
                  showUnreadOnly
                    ? "text-white"
                    : "text-gray-600 dark:text-gray-300"
                }
              >
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View className="flex-1 px-5">
          <FlashList
            data={groupedNotifications}
            renderItem={({ item: section }) => (
              <View>
                {/* Section Header */}
                <View className="py-3 mt-4">
                  <Text
                    variant="bodyMedium"
                    weight="semibold"
                    color="secondary"
                  >
                    {section.title}
                  </Text>
                </View>
                {/* Section Items */}
                {section.data.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onPress={() => handleNotificationPress(notification)}
                    onDelete={() => handleDeleteNotification(notification.id)}
                  />
                ))}
              </View>
            )}
            keyExtractor={(item) => item.title}
            // estimatedItemSize={200}
            showsVerticalScrollIndicator={false}
            onRefresh={() => refetch()}
            refreshing={isRefetching}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={
              <View className="pt-6">
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={handleMarkAllAsRead}
                    className="mb-4"
                  >
                    Mark All as Read
                  </Button>
                )}
              </View>
            }
            ListEmptyComponent={
              <View className="py-12">
                {isLoading ? (
                  <View>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <NotificationSkeleton key={i} />
                    ))}
                  </View>
                ) : (
                  <View className="items-center mb-4">
                    <View className="w-20 h-20 rounded-full bg-gray-200 items-center justify-center mb-4">
                      <Ionicons
                        name="notifications-outline"
                        size={32}
                        color="#9CA3AF"
                      />
                    </View>
                    <Text variant="h3" align="center">
                      No Notifications
                    </Text>
                    <Text
                      variant="body"
                      color="secondary"
                      align="center"
                      className="mt-2"
                    >
                      {showUnreadOnly
                        ? "You have no unread notifications"
                        : "You're all caught up!"}
                    </Text>
                  </View>
                )}
              </View>
            }
            ListFooterComponent={
              hasNextPage ? (
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => fetchNextPage()}
                  loading={isFetchingNextPage}
                  className="mb-4"
                >
                  Load More
                </Button>
              ) : (
                <View className="h-8" />
              )
            }
          />
        </View>
      </View>

      {/* Notification Details Modal */}
      {selectedNotification && (
        <NotificationDetailsModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
        />
      )}
    </View>
  );
}

interface NotificationCardProps {
  notification: Notification;
  onPress: () => void;
  onDelete: () => void;
}

function NotificationCard({
  notification,
  onPress,
  onDelete,
}: NotificationCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    setIsLoading(true);
    await onPress();
    setIsLoading(false);
  };

  const getIconForCategory = (category: string) => {
    switch (category) {
      case "TRANSACTION":
        return { name: "cash-outline" as const, color: "#10B981" };
      case "SECURITY":
        return { name: "shield-checkmark-outline" as const, color: "#EF4444" };
      case "KYC":
        return { name: "checkmark-circle-outline" as const, color: "#3B82F6" };
      case "ACCOUNT":
        return { name: "person-outline" as const, color: "#7C3AED" };
      case "PROMOTIONAL":
        return { name: "gift-outline" as const, color: "#F59E0B" };
      default:
        return {
          name: "information-circle-outline" as const,
          color: "#6B7280",
        };
    }
  };

  const icon = getIconForCategory(notification.category);

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isLoading}
      className="mb-3"
    >
      <Card
        variant="elevated"
        className={`p-4 ${!notification.isRead ? "border-l-4 border-l-[#5B55F6]" : ""} `}
      >
        <View className="flex-row">
          {/* Icon */}
          <View
            className="w-12 h-12 rounded-full items-center justify-center mr-4"
            style={{ backgroundColor: `${icon.color}20` }}
          >
            {isLoading ? (
              <Ionicons name="hourglass-outline" size={24} color={icon.color} />
            ) : (
              <Ionicons name={icon.name} size={24} color={icon.color} />
            )}
          </View>

          {/* Content */}
          <View className="flex-1">
            <View className="flex-row items-start justify-between mb-1">
              <Text variant="body" weight="semibold" className="flex-1 mr-2">
                {notification.title.length > 25
                  ? notification.title.substring(0, 25) + "..."
                  : notification.title}
              </Text>
              {!notification.isRead && (
                <View className="w-2 h-2 rounded-full bg-[#5B55F6] mt-1" />
              )}
            </View>

            <Text variant="body" color="secondary" className="">
              {notification.message.length > 35
                ? notification.message.substring(0, 35) + "..."
                : notification.message}
            </Text>

            <View className="flex-row items-center justify-between">
              <Text variant="caption" color="secondary">
                {getRelativeTimeLabel(new Date(notification.createdAt))}
              </Text>

              <TouchableOpacity onPress={onDelete} className="p-1">
                <Ionicons name="trash-outline" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// Notification Details Modal
interface NotificationDetailsModalProps {
  notification: Notification;
  onClose: () => void;
}

function NotificationDetailsModal({
  notification,
  onClose,
}: NotificationDetailsModalProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const getIconForCategory = (category: string) => {
    switch (category) {
      case "TRANSACTION":
        return { name: "cash-outline" as const, color: "#10B981" };
      case "SECURITY":
        return { name: "shield-checkmark-outline" as const, color: "#EF4444" };
      case "KYC":
        return { name: "checkmark-circle-outline" as const, color: "#3B82F6" };
      case "ACCOUNT":
        return { name: "person-outline" as const, color: "#7C3AED" };
      case "PROMOTIONAL":
        return { name: "gift-outline" as const, color: "#F59E0B" };
      default:
        return {
          name: "information-circle-outline" as const,
          color: "#6B7280",
        };
    }
  };

  const icon = getIconForCategory(notification.category);

  const handleActionPress = () => {
    onClose();
    // Navigate based on notification type/data
    if (notification.data?.transactionId) {
      router.push(`/transaction-details/${notification.data.transactionId}`);
    } else if (notification.data?.orderId) {
      router.push(`/transaction-details/${notification.data.orderId}`);
    }
  };

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/50 justify-end">
        <TouchableWithoutFeedback onPress={onClose}>
          <View className="flex-1" />
        </TouchableWithoutFeedback>

        <View
          className="bg-white dark:bg-gray-800 rounded-t-3xl"
          style={{ paddingBottom: insets.bottom }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
            <Text variant="h3">Notification Details</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons
                name="close"
                size={24}
                color={isDark ? "#FFF" : "#000"}
              />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView className="max-h-96">
            <View className="p-5">
              {/* Icon and Category */}
              <View className="items-center mb-6">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center mb-3"
                  style={{ backgroundColor: `${icon.color}20` }}
                >
                  <Ionicons name={icon.name} size={32} color={icon.color} />
                </View>
                <View className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700">
                  <Text variant="caption" color="secondary">
                    {notification.category}
                  </Text>
                </View>
              </View>

              {/* Title */}
              <Text variant="h3" align="center" className="mb-3">
                {notification.title}
              </Text>

              {/* Message */}
              <Text
                variant="body"
                color="secondary"
                align="center"
                className="mb-6"
              >
                {notification.message}
              </Text>

              {/* Timestamp */}
              <View className="flex-row items-center justify-center mb-6">
                <Ionicons name="time-outline" size={16} color="#9CA3AF" />
                <Text variant="caption" color="secondary" className="ml-2">
                  {getRelativeTimeLabel(new Date(notification.createdAt))} •{" "}
                  {new Date(notification.createdAt).toLocaleString()}
                </Text>
              </View>

              {/* Action Button - Only show if notification has associated data */}
              {(notification.data?.transactionId ||
                notification.data?.orderId) && (
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onPress={handleActionPress}
                >
                  View Details
                </Button>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Notification Skeleton Loader
const NotificationSkeleton: React.FC = () => (
  <View className="mb-3">
    <Card variant="elevated" className="p-4">
      <View className="flex-row">
        <SkeletonCircle size={48} />
        <View className="flex-1 ml-4">
          <Skeleton width="70%" height={16} className="mb-2" />
          <Skeleton width="90%" height={14} className="mb-2" />
          <Skeleton width="40%" height={12} />
        </View>
      </View>
    </Card>
  </View>
);
