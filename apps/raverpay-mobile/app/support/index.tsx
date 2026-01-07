import { ScreenHeader, Text } from "@/src/components/ui";

import {
  useConversations,
  useCreateConversation,
  usePopularArticles,
  useSearchHelp,
  useTickets,
  useUnreadCount,
} from "@/src/hooks/useSupport";
import { useTheme } from "@/src/hooks/useTheme";
import { toast } from "@/src/lib/utils/toast";
import { useUserStore } from "@/src/store/user.store";
import { TransactionContext } from "@/src/types/support";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function SupportHubScreen() {
  const { isDark } = useTheme();
  const params = useLocalSearchParams<{ context?: string }>();
  const { user } = useUserStore();
  const [searchQuery, setSearchQuery] = useState("");

  // Parse transaction context if provided
  const transactionContext: TransactionContext | undefined = params.context
    ? JSON.parse(params.context)
    : undefined;

  // Queries
  const { data: conversationsData } = useConversations({
    limit: 5,
  });
  const { data: ticketsData } = useTickets({
    limit: 5,
  });
  const { data: unreadData } = useUnreadCount();
  const { data: popularArticles, isPending: loadingArticles } =
    usePopularArticles();
  const { data: searchResults, isFetching: searching } =
    useSearchHelp(searchQuery);

  // Mutations
  const createConversation = useCreateConversation();

  const openTicketsCount =
    ticketsData?.tickets.filter(
      (t) => t.status === "OPEN" || t.status === "IN_PROGRESS"
    ).length || 0;

  const handleStartChat = async () => {
    try {
      const result = await createConversation.mutateAsync({
        transactionContext,
      });

      if (result.isExisting) {
        router.push(`/support/chat/${result.conversation.id}`);
      } else {
        router.push(`/support/chat/${result.conversation.id}`);
      }
    } catch {
      toast.error("Failed to start conversation");
    }
  };

  const handleViewMessages = () => {
    router.push("/support/messages");
  };

  const handleViewTickets = () => {
    router.push("/support/tickets");
  };

  const handleViewHelp = () => {
    router.push("/support/help");
  };

  const handleArticlePress = (articleId: string) => {
    router.push(`/support/article/${articleId}`);
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-800">
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <ScreenHeader
        title="Support"
        backIcon="close"
        rightComponent={
          <View className="w-10 h-10 rounded-full bg-[#5B55F6]/10 items-center justify-center">
            <Ionicons name="headset" size={20} color="#5B55F6" />
          </View>
        }
      />

      {/* Greeting Section */}
      <View className="bg-white dark:bg-gray-800 px-5 pb-6 py-2 border-b border-gray-100 dark:border-gray-700">
        <Text variant="h3" weight="bold" color="primary">
          Hi {user?.firstName || "there"}!
        </Text>
        <Text variant="body" color="secondary" className="mt-1">
          How can we help you today?
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 200 }}
      >
        {/* Transaction Context Banner */}
        {transactionContext && (
          <View className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 mb-6">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800/50 items-center justify-center">
                <Ionicons name="alert-circle" size={20} color="#D97706" />
              </View>
              <View className="flex-1 ml-3">
                <Text variant="body" weight="semibold" color="primary">
                  Need help with your transaction?
                </Text>
                <Text variant="body" color="secondary">
                  {transactionContext.transactionType} - {"\u20A6"}
                  {(transactionContext.amount || 0).toLocaleString()}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleStartChat}
              disabled={createConversation.isPending}
              className={`mt-3 rounded-xl py-3 items-center ${
                createConversation.isPending
                  ? "bg-amber-300 dark:bg-amber-600"
                  : "bg-amber-500 dark:bg-amber-600"
              }`}
            >
              {createConversation.isPending ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#fff" />
                  <Text
                    variant="button"
                    color="inverse"
                    weight="semibold"
                    className="ml-2"
                  >
                    Starting chat...
                  </Text>
                </View>
              ) : (
                <Text variant="button" color="inverse" weight="semibold">
                  Get Help Now
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <View className="flex-row gap-3 mb-6">
          {/* Messages */}
          <TouchableOpacity
            onPress={handleViewMessages}
            className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-2xl p-4"
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center">
                <Ionicons name="chatbubbles" size={20} color="#3B82F6" />
              </View>
              {(unreadData?.unreadCount || 0) > 0 && (
                <View className="bg-red-500 rounded-full px-2 py-0.5">
                  <Text variant="button" color="inverse" weight="semibold">
                    {unreadData?.unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text variant="body" weight="semibold" color="primary">
              Messages
            </Text>
            <Text className="text-gray-500 text-sm">
              {conversationsData?.conversations.length || 0} conversations
            </Text>
          </TouchableOpacity>

          {/* Tickets */}
          <TouchableOpacity
            onPress={handleViewTickets}
            className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-2xl p-4"
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 items-center justify-center">
                <Ionicons name="ticket" size={20} color="#5B55F6" />
              </View>
              {openTicketsCount > 0 && (
                <View className="bg-purple-500 rounded-full px-2 ">
                  <Text variant="button" color="inverse" weight="semibold">
                    {openTicketsCount}
                  </Text>
                </View>
              )}
            </View>
            <Text variant="body" weight="semibold" color="primary">
              Tickets
            </Text>
            <Text variant="body" color="secondary">
              Track your requests
            </Text>
          </TouchableOpacity>
        </View>

        {/* Help Center */}
        <TouchableOpacity
          onPress={handleViewHelp}
          className="bg-[#5B55F6]/5 border border-[#5B55F6]/20 rounded-2xl p-4 mb-6 flex-row items-center"
        >
          <View className="w-12 h-12 rounded-full bg-[#5B55F6]/10 items-center justify-center">
            <Ionicons name="help-circle" size={24} color="#5B55F6" />
          </View>
          <View className="flex-1 ml-4">
            <Text variant="body" weight="semibold" color="primary">
              Help Center
            </Text>
            <Text variant="body" color="secondary">
              Browse FAQs and guides
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Start Chat Button */}
        {!transactionContext && (
          <TouchableOpacity
            onPress={handleStartChat}
            disabled={createConversation.isPending}
            className={`rounded-2xl py-4 items-center mb-6 ${
              createConversation.isPending ? "bg-[#5B55F6]/60" : "bg-[#5B55F6]"
            }`}
          >
            {createConversation.isPending ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="white" />
                <Text
                  variant="button"
                  weight="semibold"
                  className="ml-2 text-white"
                >
                  Starting chat...
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center">
                <Ionicons name="chatbubble-ellipses" size={20} color="white" />
                <Text
                  variant="button"
                  weight="semibold"
                  className="ml-2 text-white"
                >
                  Send us a message
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Search Help */}
        <View className="mb-6">
          <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-3">
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search help articles..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-3"
            />
            {searching && <ActivityIndicator size="small" color="#5B55F6" />}
          </View>

          {/* Search Results */}
          {searchQuery.length >= 2 &&
            searchResults &&
            searchResults.length > 0 && (
              <View className="mt-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                {searchResults.slice(0, 5).map((article, index) => (
                  <TouchableOpacity
                    key={article.id}
                    onPress={() => handleArticlePress(article.id)}
                    className={`p-4 flex-row items-center ${
                      index < searchResults.length - 1
                        ? "border-b border-gray-100"
                        : ""
                    }`}
                  >
                    <Ionicons name="document-text" size={20} color="#6B7280" />
                    <Text
                      variant="body"
                      color="primary"
                      className="flex-1 ml-3"
                      numberOfLines={1}
                    >
                      {article.title}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
        </View>

        {/* Popular Articles */}
        {!searchQuery && (
          <View className="mb-8">
            <Text
              variant="h4"
              weight="semibold"
              color="primary"
              className="mb-4"
            >
              Popular Articles
            </Text>
            {loadingArticles ? (
              <ActivityIndicator color="#5B55F6" />
            ) : (
              <View style={{ height: (popularArticles?.length || 0) * 80 }}>
                <FlashList
                  data={popularArticles || []}
                  renderItem={({ item: article }) => (
                    <TouchableOpacity
                      onPress={() => handleArticlePress(article.id)}
                      className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 flex-row items-center mb-2"
                    >
                      <View className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 items-center justify-center">
                        <Ionicons
                          name="document-text"
                          size={16}
                          color="#6B7280"
                        />
                      </View>
                      <Text
                        variant="body"
                        color="primary"
                        className="flex-1 ml-3"
                        numberOfLines={2}
                      >
                        {article.title}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="#9CA3AF"
                      />
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => item.id}
                />
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
