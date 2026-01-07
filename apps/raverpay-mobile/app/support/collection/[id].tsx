import { ScreenHeader, Text } from '@/src/components/ui';
import { useHelpCollection } from '@/src/hooks/useSupport';
import { useTheme } from '@/src/hooks/useTheme';
import { HelpArticle } from '@/src/types/support';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, FlatList, TouchableOpacity, View } from 'react-native';

function ArticleCard({ article }: { article: HelpArticle }) {
  return (
    <TouchableOpacity
      onPress={() => router.push(`/support/article/${article.id}`)}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 border border-gray-100 dark:border-gray-700 flex-row items-center"
    >
      <View className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center">
        <Ionicons name="document-text" size={20} color="#9CA3AF" />
      </View>
      <View className="flex-1 ml-3">
        <Text variant="body" weight="semibold" color="primary">
          {article.title}
        </Text>
        <Text variant="caption" color="tertiary" className="mt-1">
          {article.viewCount} views
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

export default function CollectionDetailScreen() {
  const { isDark } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: collection, isPending } = useHelpCollection(id);

  if (isPending) {
    return (
      <View className="flex-1 bg-white dark:bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#5B55F6" />
      </View>
    );
  }

  if (!collection) {
    return (
      <View className="flex-1 bg-white dark:bg-gray-900 items-center justify-center">
        <Text variant="body" color="secondary">
          Collection not found
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <ScreenHeader title={collection.title} />

      <FlatList
        data={collection.articles || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ArticleCard article={item} />}
        contentContainerStyle={{ padding: 20 }}
        ListHeaderComponent={
          collection.description ? (
            <Text variant="body" color="secondary" className="mb-4">
              {collection.description}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View className="items-center py-20">
            <View className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center mb-4">
              <Ionicons name="document-text-outline" size={40} color="#9CA3AF" />
            </View>
            <Text variant="body" color="secondary" className="text-center">
              No articles in this collection
            </Text>
          </View>
        }
      />
    </View>
  );
}
