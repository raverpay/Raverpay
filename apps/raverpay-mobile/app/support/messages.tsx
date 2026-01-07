import { ScreenHeader, Text } from '@/src/components/ui';
import { useConversations } from '@/src/hooks/useSupport';
import { formatRelativeTime } from '@/src/lib/utils/formatters';
import { Conversation, ConversationStatus } from '@/src/types/support';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

import { useTheme } from '@/src/hooks/useTheme';
import { ActivityIndicator, FlatList, TouchableOpacity, View } from 'react-native';

function ConversationCard({ conversation }: { conversation: Conversation }) {
  const getStatusColor = () => {
    switch (conversation.status) {
      case ConversationStatus.AGENT_ASSIGNED:
        return 'bg-green-500';
      case ConversationStatus.AWAITING_AGENT:
        return 'bg-yellow-500';
      case ConversationStatus.ENDED:
        return 'bg-gray-400';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <TouchableOpacity
      onPress={() => router.push(`/support/chat/${conversation.id}`)}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 border border-gray-100 dark:border-gray-700"
    >
      <View className="flex-row items-start">
        <View className="w-12 h-12 rounded-full bg-[#5B55F6]/10 items-center justify-center">
          <Ionicons name="chatbubbles" size={20} color="#5B55F6" />
        </View>
        <View className="flex-1 ml-3">
          <View className="flex-row items-center justify-between">
            <Text variant="body" weight="semibold" color="primary" className="capitalize">
              {conversation?.category && conversation?.category?.length > 20
                ? conversation.category?.slice(0, 20) + '...'
                : conversation.category || 'Support Chat'}
            </Text>
            <Text variant="caption" color="tertiary">
              {formatRelativeTime(conversation.updatedAt)}
            </Text>
          </View>
          <Text variant="body" color="secondary" className="mt-1" numberOfLines={2}>
            {conversation.lastMessagePreview || 'No messages yet'}
          </Text>
          <View className="flex-row items-center mt-2">
            <View className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
            <Text variant="caption" color="tertiary" className="ml-2">
              {conversation.status.replace('_', ' ')}
            </Text>
            {conversation.unreadCount > 0 && (
              <View className="bg-red-500 rounded-full px-2 py-0.5 ml-auto">
                <Text variant="button" color="inverse" weight="semibold">
                  {conversation.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MessagesScreen() {
  const { isDark } = useTheme();
  const { data, isPending, refetch, isRefetching } = useConversations();

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <ScreenHeader title="Messages" />

      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#5B55F6" />
        </View>
      ) : (
        <FlatList
          data={data?.conversations || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ConversationCard conversation={item} />}
          contentContainerStyle={{ padding: 20 }}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View className="items-center py-20">
              <View className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center mb-4">
                <Ionicons name="chatbubbles-outline" size={40} color="#9CA3AF" />
              </View>
              <Text className="text-gray-500 dark:text-gray-400 text-center">
                No conversations yet
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/support')}
                className="mt-4 bg-[#5B55F6] rounded-xl px-6 py-3"
              >
                <Text variant="button" weight="semibold" className="text-white">
                  Start a conversation
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}
