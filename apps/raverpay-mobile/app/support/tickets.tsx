import { ScreenHeader, Text } from '@/src/components/ui';
import { useTickets } from '@/src/hooks/useSupport';
import { groupItemsByDate } from '@/src/lib/utils/dateGrouping';
import { formatRelativeTime } from '@/src/lib/utils/formatters';
import { Ticket, TicketPriority, TicketStatus } from '@/src/types/support';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo } from 'react';

import { useTheme } from '@/src/hooks/useTheme';
import { ActivityIndicator, FlatList, TouchableOpacity, View } from 'react-native';

function TicketCard({ ticket }: { ticket: Ticket }) {
  const getStatusStyle = () => {
    switch (ticket.status) {
      case TicketStatus.OPEN:
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-700 dark:text-blue-400',
        };
      case TicketStatus.IN_PROGRESS:
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900/30',
          text: 'text-yellow-700 dark:text-yellow-400',
        };
      case TicketStatus.RESOLVED:
        return {
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-700 dark:text-green-400',
        };
      case TicketStatus.CLOSED:
        return {
          bg: 'bg-gray-100 dark:bg-gray-700',
          text: 'text-gray-700 dark:text-gray-300',
        };
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-700',
          text: 'text-gray-700 dark:text-gray-300',
        };
    }
  };

  const getPriorityIcon = () => {
    switch (ticket.priority) {
      case TicketPriority.URGENT:
        return { name: 'alert-circle' as const, color: '#EF4444' };
      case TicketPriority.HIGH:
        return { name: 'arrow-up-circle' as const, color: '#F97316' };
      case TicketPriority.MEDIUM:
        return { name: 'remove-circle' as const, color: '#EAB308' };
      case TicketPriority.LOW:
        return { name: 'arrow-down-circle' as const, color: '#22C55E' };
      default:
        return { name: 'ellipse' as const, color: '#6B7280' };
    }
  };

  const statusStyle = getStatusStyle();
  const priorityIcon = getPriorityIcon();

  return (
    <TouchableOpacity
      onPress={() => router.push(`/support/chat/${ticket.conversationId}`)}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 border border-gray-100 dark:border-gray-700"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="text-[#5B55F6] dark:text-purple-400 font-medium">
              #{ticket.ticketNumber}
            </Text>
            <View className={`ml-2 px-2 py-0.5 rounded-full ${statusStyle.bg}`}>
              <Text className={`${statusStyle.text}`} variant="caption" weight="semibold">
                {ticket.status.replace('_', ' ')}
              </Text>
            </View>
          </View>
          <Text variant="body" weight="semibold" color="primary" className="mt-2">
            {ticket.title}
          </Text>
          <Text variant="body" color="secondary" className="mt-1">
            {ticket.category}
          </Text>
        </View>
        <Ionicons name={priorityIcon.name} size={24} color={priorityIcon.color} />
      </View>
      <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <Text variant="caption" color="tertiary">
          Created {formatRelativeTime(ticket.createdAt)}
        </Text>
        {ticket.assignedAgent && (
          <Text variant="caption" color="secondary">
            Agent: {ticket.assignedAgent.firstName}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function TicketsScreen() {
  const { isDark } = useTheme();
  const { data, isPending, refetch, isRefetching } = useTickets();

  // Group tickets by date
  const groupedTickets = useMemo(
    () => groupItemsByDate(data?.tickets || [], 'createdAt'),
    [data?.tickets],
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <ScreenHeader title="My Tickets" />

      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#5B55F6" />
        </View>
      ) : (
        <FlatList
          data={groupedTickets}
          keyExtractor={(item) => item.title}
          renderItem={({ item: section }) => (
            <View>
              {/* Section Header */}
              <View className="py-3 mt-2">
                <Text variant="bodyMedium" weight="semibold" color="secondary">
                  {section.title}
                </Text>
              </View>
              {/* Section Items */}
              {section.data.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </View>
          )}
          contentContainerStyle={{ padding: 20 }}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View className="items-center py-20">
              <View className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center mb-4">
                <Ionicons name="ticket-outline" size={40} color="#9CA3AF" />
              </View>
              <Text variant="body" color="secondary" className="text-center">
                No tickets yet
              </Text>
              <Text variant="body" color="tertiary" className="text-center mt-1">
                Tickets are created when you need help with an issue
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
