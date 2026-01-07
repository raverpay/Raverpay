// src/components/wallet/TransactionItem.tsx
import { Text } from '@/src/components/ui';
import { formatCurrency, formatRelativeTime } from '@/src/lib/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';

type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'TRANSFER'
  | 'VTU_AIRTIME'
  | 'VTU_DATA'
  | 'VTU_CABLE'
  | 'VTU_ELECTRICITY'
  | 'GIFTCARD_BUY'
  | 'GIFTCARD_SELL'
  | 'CRYPTO_BUY'
  | 'CRYPTO_SELL'
  | 'REFUND'
  | 'FEE';

interface Transaction {
  id: string;
  reference: string;
  type: TransactionType;
  amount: number;
  fee?: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  description: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

interface TransactionItemProps {
  transaction: Transaction;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({ transaction }) => {
  // Money IN (green, arrow down): DEPOSIT, REFUND, GIFTCARD_SELL, CRYPTO_SELL
  // Money OUT (red, arrow up): WITHDRAWAL, TRANSFER, VTU_*, GIFTCARD_BUY, CRYPTO_BUY, FEE
  const isCredit = ['DEPOSIT', 'REFUND', 'GIFTCARD_SELL', 'CRYPTO_SELL'].includes(transaction.type);

  const getIcon = () => {
    if (isCredit) return 'arrow-down-circle'; // Money coming in
    return 'arrow-up-circle'; // Money going out
  };

  const getIconColor = () => {
    if (isCredit) return '#22C55E'; // Green for money in
    return '#EF4444'; // Red for money out
  };

  const getStatusColor = () => {
    switch (transaction.status) {
      case 'COMPLETED':
        return 'text-green-600 dark:text-green-400';
      case 'PENDING':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'FAILED':
        return 'text-red-600 dark:text-red-400';
      case 'REVERSED':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const handlePress = () => {
    router.push(`/transaction-details/${transaction.id}`);
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <View className="flex-row items-center py-3  border-b border-gray-400 last:border-b-0">
        <View
          className="w-12 h-12 rounded-full items-center justify-center mr-4"
          style={{ backgroundColor: `${getIconColor()}20` }}
        >
          <Ionicons name={getIcon()} size={24} color={getIconColor()} />
        </View>

        <View className="flex-1">
          <Text variant="bodyMedium" weight="semibold">
            {transaction.description.length > 25
              ? transaction.description.substring(0, 25) + '......'
              : transaction.description}
          </Text>
          <Text variant="caption" color="secondary" className="mt-1">
            {formatRelativeTime(transaction.createdAt)}
          </Text>
        </View>

        <View className="items-end">
          <Text variant="bodyMedium" className={isCredit ? 'text-green-600' : 'text-red-600'}>
            {isCredit ? '+' : '-'}
            {formatCurrency(transaction.amount)}
          </Text>
          <Text variant="caption" className={getStatusColor()}>
            {transaction.status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
