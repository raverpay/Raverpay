// src/components/circle/CircleWalletCard.tsx
import { Card, Text } from '@/src/components/ui';
import { CircleBlockchain, CircleWallet } from '@/src/types/circle.types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';

interface CircleWalletCardProps {
  wallet: CircleWallet;
  usdcBalance?: string;
  nativeBalance?: { symbol: string; amount: string } | null;
  isSelected?: boolean;
  onPress?: () => void;
  isSponsored?: boolean;
  isUnsupported?: boolean;
}

const BLOCKCHAIN_INFO: Record<
  CircleBlockchain,
  { name: string; color: string; icon: string; nativeSymbol: string }
> = {
  ETH: { name: 'Ethereum', color: 'bg-blue-500', icon: 'Ξ', nativeSymbol: 'ETH' },
  'ETH-SEPOLIA': { name: 'Ethereum Sepolia', color: 'bg-blue-400', icon: 'Ξ', nativeSymbol: 'ETH' },
  MATIC: { name: 'Polygon', color: 'bg-purple-500', icon: '⬣', nativeSymbol: 'POL' },
  'MATIC-AMOY': { name: 'Polygon Amoy', color: 'bg-purple-400', icon: '⬣', nativeSymbol: 'POL' },
  ARB: { name: 'Arbitrum', color: 'bg-sky-500', icon: 'A', nativeSymbol: 'ETH' },
  'ARB-SEPOLIA': { name: 'Arbitrum Sepolia', color: 'bg-sky-400', icon: 'A', nativeSymbol: 'ETH' },
  SOL: {
    name: 'Solana',
    color: 'bg-gradient-to-r from-purple-500 to-green-400',
    icon: '◎',
    nativeSymbol: 'SOL',
  },
  'SOL-DEVNET': { name: 'Solana Devnet', color: 'bg-purple-300', icon: '◎', nativeSymbol: 'SOL' },
  AVAX: { name: 'Avalanche', color: 'bg-red-500', icon: '🔺', nativeSymbol: 'AVAX' },
  'AVAX-FUJI': { name: 'Avalanche Fuji', color: 'bg-red-400', icon: '🔺', nativeSymbol: 'AVAX' },
  BASE: { name: 'Base', color: 'bg-blue-600', icon: '🔵', nativeSymbol: 'ETH' },
  'BASE-SEPOLIA': { name: 'Base Sepolia', color: 'bg-blue-400', icon: '🔵', nativeSymbol: 'ETH' },
  OP: { name: 'Optimism', color: 'bg-red-600', icon: '🔴', nativeSymbol: 'ETH' },
  'OP-SEPOLIA': { name: 'Optimism Sepolia', color: 'bg-red-400', icon: '🔴', nativeSymbol: 'ETH' },
};

// Format native balance to a reasonable precision
const formatNativeBalance = (amount: string): string => {
  const num = parseFloat(amount);
  if (num === 0) return '0';
  if (num < 0.0001) return '<0.0001';
  if (num < 1) return num.toFixed(4);
  return num.toFixed(4);
};

export const CircleWalletCard: React.FC<CircleWalletCardProps> = ({
  wallet,
  usdcBalance = '0.00',
  nativeBalance,
  isSelected = false,
  onPress,
  isSponsored = false,
  isUnsupported = false,
}) => {
  const blockchainInfo = BLOCKCHAIN_INFO[wallet.blockchain] || {
    name: wallet.blockchain,
    color: 'bg-gray-500',
    icon: '?',
    nativeSymbol: 'ETH',
  };

  const truncatedAddress = `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`;

  const CardContent = (
    <View
      className={`flex-row items-center justify-between p-4 overflow-hidden rounded-2xl ${isSelected ? 'border-2 border-[#2775CA]' : ''}`}
    >
      <View className="flex-row items-center flex-1">
        <View
          className={`w-12 h-12 ${blockchainInfo.color} rounded-full items-center justify-center mr-3`}
        >
          <Text variant="h4" color="inverse">
            {blockchainInfo.icon}
          </Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center flex-wrap">
            <Text variant="h6" weight="bold" className="mr-2">
              {blockchainInfo.name}
            </Text>
            {/* Wallet Type Badge */}
            {(wallet as any).type === 'MODULAR' ? (
              // Modular Wallet (Gasless)
              <View className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 rounded-full mr-2">
                <Text
                  variant="caption"
                  weight="semibold"
                  className="text-purple-600 dark:text-purple-400"
                >
                  Gasless
                </Text>
              </View>
            ) : wallet.custodyType === 'USER' ? (
              // User-Controlled Wallet (Advanced)
              <View className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded-full mr-2">
                <Text
                  variant="caption"
                  weight="semibold"
                  className="text-blue-600 dark:text-blue-400"
                >
                  Non-Custodial
                </Text>
              </View>
            ) : (
              // Developer-Controlled Wallet (Easy)
              <View className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full mr-2">
                <Text
                  variant="caption"
                  weight="semibold"
                  className="text-green-600 dark:text-green-400"
                >
                  Custodial
                </Text>
              </View>
            )}

            {/* Sponsored Badge */}
            {isSponsored && !isUnsupported && (
              <View className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mr-2">
                <Text
                  variant="caption"
                  weight="semibold"
                  className="text-yellow-600 dark:text-yellow-400"
                >
                  ⚡ Free
                </Text>
              </View>
            )}

            {/* Unsupported Badge */}
            {isUnsupported && (
              <View className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 rounded-full mr-2">
                <Text
                  variant="caption"
                  weight="semibold"
                  className="text-red-600 dark:text-red-400"
                >
                  Unsupported
                </Text>
              </View>
            )}

            {isSelected && <Ionicons name="checkmark-circle" size={16} color="#2775CA" />}
          </View>
          <Text variant="caption" className="font-mono">
            {truncatedAddress}
          </Text>
        </View>
      </View>

      <View className="items-end">
        {/* USDC Balance - Primary */}
        <Text variant="h5" weight="bold" className="text-[#2775CA]">
          ${parseFloat(usdcBalance).toFixed(2)}
        </Text>
        <Text variant="caption" color="secondary">
          USDC
        </Text>

        {/* Native Token Balance - Secondary (only show if non-zero) */}
        {nativeBalance && parseFloat(nativeBalance.amount) > 0 && (
          <View className="mt-1 flex-row items-center">
            <Text variant="caption" color="secondary" className="text-xs">
              {formatNativeBalance(nativeBalance.amount)} {blockchainInfo.nativeSymbol}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Card variant="elevated" className="mb-3">
          {CardContent}
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <Card variant="elevated" className="mb-3">
      {CardContent}
    </Card>
  );
};
