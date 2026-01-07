// src/components/crypto/CryptoTokenCard.tsx
import { Card, Text } from '@/src/components/ui';
import { CryptoBalance, TokenSymbol } from '@/src/types/crypto.types';
import React from 'react';
import { View } from 'react-native';

interface CryptoTokenCardProps {
  balance: CryptoBalance;
  onPress?: () => void;
}

const TOKEN_ICONS: Record<TokenSymbol, string> = {
  MATIC: '⬣',
  USDT: '₮',
  USDC: '$',
};

const TOKEN_COLORS: Record<TokenSymbol, string> = {
  MATIC: 'bg-purple-500',
  USDT: 'bg-green-500',
  USDC: 'bg-blue-500',
};

export const CryptoTokenCard: React.FC<CryptoTokenCardProps> = ({ balance, onPress }) => {
  const icon = TOKEN_ICONS[balance.tokenSymbol];
  const colorClass = TOKEN_COLORS[balance.tokenSymbol];

  if (onPress) {
    return (
      <Card variant="elevated" pressable onPress={onPress} className="mb-3">
        <View className="flex-row items-center justify-between p-4">
          <View className="flex-row items-center">
            <View
              className={`w-12 h-12 ${colorClass} rounded-full items-center justify-center mr-3`}
            >
              <Text variant="h3" color="inverse">
                {icon}
              </Text>
            </View>
            <View>
              <Text variant="h6" weight="bold">
                {balance.tokenSymbol}
              </Text>
              <Text variant="caption" color="secondary">
                ${parseFloat(balance.usdPrice).toFixed(2)}
              </Text>
            </View>
          </View>

          <View className="items-end">
            <Text variant="h6" weight="bold">
              {parseFloat(balance.balance).toFixed(4)}
            </Text>
            <Text variant="caption" color="secondary">
              ${parseFloat(balance.usdValue).toFixed(2)}
            </Text>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="mb-3">
      <View className="flex-row items-center justify-between p-4">
        <View className="flex-row items-center">
          <View className={`w-12 h-12 ${colorClass} rounded-full items-center justify-center mr-3`}>
            <Text variant="h3" color="inverse">
              {icon}
            </Text>
          </View>
          <View>
            <Text variant="h6" weight="bold">
              {balance.tokenSymbol}
            </Text>
            <Text variant="caption" color="secondary">
              ${parseFloat(balance.usdPrice).toFixed(2)}
            </Text>
          </View>
        </View>

        <View className="items-end">
          <Text variant="h6" weight="bold">
            {parseFloat(balance.balance).toFixed(4)}
          </Text>
          <Text variant="caption" color="secondary">
            ${parseFloat(balance.usdValue).toFixed(2)}
          </Text>
        </View>
      </View>
    </Card>
  );
};
