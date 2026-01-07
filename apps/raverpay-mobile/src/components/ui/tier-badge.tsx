import { KYCTier } from '@/src/types/api.types';
import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';

interface TierBadgeProps {
  tier: KYCTier;
  size?: 'small' | 'medium' | 'large';
  showLimit?: boolean;
}

const tierConfig = {
  [KYCTier.TIER_0]: {
    label: 'Starter',
    color: 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600',
    textColor: 'text-gray-700 dark:text-gray-200',
    iconColor: '#9CA3AF',
    limit: '₦50,000',
  },
  [KYCTier.TIER_1]: {
    label: 'Basic',
    color: 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600',
    textColor: 'text-blue-700 dark:text-blue-300',
    iconColor: '#3B82F6',
    limit: '₦300,000',
  },
  [KYCTier.TIER_2]: {
    label: 'Advanced',
    color: 'bg-[#5b55f6] dark:bg-[#5b55f6] border-purple-300 dark:border-purple-600',
    textColor: 'text-white dark:text-white',
    iconColor: '#9333EA',
    limit: '₦5,000,000',
  },
  [KYCTier.TIER_3]: {
    label: 'Premium',
    color: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600',
    textColor: 'text-yellow-800 dark:text-yellow-300',
    iconColor: '#EAB308',
    limit: 'Unlimited',
  },
};

const sizeConfig = {
  small: {
    padding: 'px-2 py-1',
    textSize: 'caption',
    limitSize: 'caption',
  },
  medium: {
    padding: 'px-3 py-1.5',
    textSize: 'bodySmall',
    limitSize: 'caption',
  },
  large: {
    padding: 'px-4 py-2',
    textSize: 'bodyMedium',
    limitSize: 'bodySmall',
  },
} as const;

export function TierBadge({ tier, size = 'medium', showLimit = false }: TierBadgeProps) {
  const config = tierConfig[tier];
  const sizeStyle = sizeConfig[size];

  return (
    <View
      className={`flex-row items-center rounded-full border ${config?.color} ${sizeStyle.padding}`}
    >
      <Text variant={sizeStyle.textSize as any} className={`font-semibold ${config?.textColor}`}>
        {config?.label}
      </Text>
      {showLimit && (
        <>
          <View className="w-1 h-1 rounded-full bg-gray-400 mx-2" />
          <Text variant={sizeStyle.limitSize as any} className={config?.textColor}>
            {config?.limit}
          </Text>
        </>
      )}
    </View>
  );
}

// Export tier utilities for use in other components
export const getTierColor = (tier: KYCTier) => tierConfig[tier].iconColor;
export const getTierLabel = (tier: KYCTier) => tierConfig[tier].label;
export const getTierLimit = (tier: KYCTier) => tierConfig[tier].limit;
