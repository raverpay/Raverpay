// src/components/circle/CircleTransactionItem.tsx
import { Card, Text } from '@/src/components/ui';
import { CircleTransaction, CircleTransactionState } from '@/src/types/circle.types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';

interface CircleTransactionItemProps {
  transaction: CircleTransaction;
  onPress?: () => void;
}

const STATE_COLORS: Record<CircleTransactionState, string> = {
  INITIATED: 'text-yellow-500',
  PENDING: 'text-yellow-500',
  CONFIRMED: 'text-blue-500',
  COMPLETE: 'text-green-500',
  FAILED: 'text-red-500',
  CANCELLED: 'text-gray-500',
  DENIED: 'text-red-500',
  QUEUED: 'text-yellow-500',
  SENT: 'text-blue-500',
  STUCK: 'text-gray-500',
  CLEARED: 'text-green-500',
};

const STATE_LABELS: Record<CircleTransactionState, string> = {
  INITIATED: 'Initiated',
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  COMPLETE: 'Complete',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  DENIED: 'Denied',
  QUEUED: 'Queued',
  SENT: 'Sent',
  STUCK: 'Stuck',
  CLEARED: 'Cleared',
};

export const CircleTransactionItem: React.FC<CircleTransactionItemProps> = ({
  transaction,
  onPress,
}) => {
  const isInbound = transaction.type === 'INBOUND';
  const amount = parseFloat(transaction.amounts?.[0] || '0');
  const formattedAmount = amount.toFixed(2);
  const formattedDate = new Date(transaction.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const truncatedAddress = isInbound
    ? transaction.sourceAddress
      ? `From: ${transaction.sourceAddress.slice(0, 6)}...${transaction.sourceAddress.slice(-4)}`
      : 'From: External'
    : `To: ${transaction.destinationAddress.slice(0, 6)}...${transaction.destinationAddress.slice(-4)}`;

  const CardContent = (
    <View className="flex-row items-center justify-between px-4 py-2">
      <View className="flex-row items-center flex-1">
        <View
          className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
            isInbound ? 'bg-green-100' : 'bg-red-100'
          }`}
        >
          <Ionicons
            name={isInbound ? 'arrow-down' : 'arrow-up'}
            size={20}
            color={isInbound ? '#10B981' : '#EF4444'}
          />
        </View>
        <View className="flex-1">
          <Text variant="bodyMedium" weight="semibold">
            {truncatedAddress}
          </Text>
          {/* <Text variant="caption" color="secondary" className="font-mono">
            {truncatedAddress}
          </Text> */}
          <Text variant="caption" color="tertiary">
            {formattedDate}
          </Text>
        </View>
      </View>

      <View className="items-end">
        <Text
          variant="bodyMedium"
          weight="bold"
          className={isInbound ? 'text-green-500' : 'text-red-500'}
        >
          {isInbound ? '+' : '-'}${formattedAmount}
        </Text>
        <Text variant="caption" className={STATE_COLORS[transaction.state]}>
          {STATE_LABELS[transaction.state]}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <View className="mb-2">{CardContent}</View>
      </TouchableOpacity>
    );
  }

  return (
    <Card variant="filled" className="">
      {CardContent}
    </Card>
  );
};
