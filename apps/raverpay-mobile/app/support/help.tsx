import { ScreenHeader, Text } from '@/src/components/ui';
import { useHelpCollections } from '@/src/hooks/useSupport';
import { HelpCollection } from '@/src/types/support';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

import { useTheme } from '@/src/hooks/useTheme';
import { ActivityIndicator, FlatList, TouchableOpacity, View } from 'react-native';

const COLLECTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Getting Started': 'rocket',
  'Funding Your Wallet': 'wallet',
  'Buying Airtime & Data': 'phone-portrait',
  'Cable TV Payments': 'tv',
  'Electricity Bills': 'flash',
  'Transaction Issues': 'receipt',
  'Account & Security': 'shield-checkmark',
  'Virtual Account': 'card',
};

function CollectionCard({ collection }: { collection: HelpCollection }) {
  const iconName = COLLECTION_ICONS[collection.title] || 'help-circle';

  return (
    <TouchableOpacity
      onPress={() => router.push(`/support/collection/${collection.id}`)}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 border border-gray-100 dark:border-gray-700 flex-row items-center"
    >
      <View className="w-12 h-12 rounded-full bg-[#5B55F6]/10 items-center justify-center">
        <Ionicons name={iconName} size={24} color="#5B55F6" />
      </View>
      <View className="flex-1 ml-4">
        <Text variant="body" weight="semibold" color="primary">
          {collection.title}
        </Text>
        <Text variant="body" color="secondary" className="mt-1" numberOfLines={2}>
          {collection.description}
        </Text>
        <Text variant="caption" color="tertiary" className="mt-1">
          {collection._count?.articles || 0} articles
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

export default function HelpCenterScreen() {
  const { isDark } = useTheme();
  const { data: collections, isPending, refetch, isRefetching } = useHelpCollections();

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <ScreenHeader title="Help Center" />

      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#5B55F6" />
        </View>
      ) : (
        <FlatList
          data={collections || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CollectionCard collection={item} />}
          contentContainerStyle={{ padding: 20 }}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListHeaderComponent={
            <Text variant="body" color="secondary" className="mb-4">
              Browse our help articles to find answers to your questions.
            </Text>
          }
          ListEmptyComponent={
            <View className="items-center py-20">
              <View className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center mb-4">
                <Ionicons name="help-circle-outline" size={40} color="#9CA3AF" />
              </View>
              <Text variant="body" color="secondary" className="text-center">
                No help articles available
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
