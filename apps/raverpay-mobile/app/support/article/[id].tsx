import { MarkdownText, ScreenHeader, Text } from '@/src/components/ui';
import { useHelpArticle, useMarkArticleHelpful } from '@/src/hooks/useSupport';
import { useTheme } from '@/src/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';

export default function ArticleDetailScreen() {
  const { isDark } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: article, isPending } = useHelpArticle(id);
  const markHelpful = useMarkArticleHelpful();

  const handleFeedback = (helpful: boolean) => {
    markHelpful.mutate({ articleId: id, helpful });
  };

  if (isPending) {
    return (
      <View className="flex-1 bg-white dark:bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#5B55F6" />
      </View>
    );
  }

  if (!article) {
    return (
      <View className="flex-1 bg-white dark:bg-gray-900 items-center justify-center">
        <Text variant="body" color="secondary">
          Article not found
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <ScreenHeader title={article.title} />

      <ScrollView className="flex-1 px-5 py-6" showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text variant="h3" weight="bold" color="primary" className="mb-4">
          {article.title}
        </Text>

        {/* Meta */}
        <View className="flex-row items-center mb-6">
          <Ionicons name="eye-outline" size={16} color="#9CA3AF" />
          <Text variant="caption" color="tertiary" className="ml-1">
            {article.viewCount} views
          </Text>
          <View className="w-1 h-1 rounded-full bg-gray-300 mx-3" />
          <Text variant="caption" color="tertiary">
            {article.collection?.title}
          </Text>
        </View>

        {/* Content */}
        <View className="mb-8">
          <MarkdownText
            content={article.content}
            variant="body"
            color="primary"
            className="leading-7"
          />
        </View>

        {/* Feedback Section */}
        <View className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 mb-8">
          <Text variant="body" weight="medium" color="primary" className="text-center mb-4">
            Was this article helpful?
          </Text>
          <View className="flex-row justify-center gap-4">
            <TouchableOpacity
              onPress={() => handleFeedback(true)}
              disabled={markHelpful.isPending}
              className="flex-row items-center bg-green-100 dark:bg-green-900/30 rounded-xl px-6 py-3"
            >
              <Ionicons name="thumbs-up" size={20} color="#22C55E" />
              <Text
                variant="body"
                weight="medium"
                className="ml-2 text-green-700 dark:text-green-400"
              >
                Yes ({article.helpfulCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleFeedback(false)}
              disabled={markHelpful.isPending}
              className="flex-row items-center bg-red-100 dark:bg-red-900/30 rounded-xl px-6 py-3"
            >
              <Ionicons name="thumbs-down" size={20} color="#EF4444" />
              <Text variant="body" weight="medium" className="ml-2 text-red-700 dark:text-red-400">
                No ({article.notHelpfulCount})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Still need help */}
        <TouchableOpacity
          onPress={() => router.push('/support')}
          className="bg-[#5B55F6] rounded-2xl py-4 items-center mb-8"
        >
          <Text variant="body" weight="semibold" className="text-white">
            Still need help? Contact us
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
