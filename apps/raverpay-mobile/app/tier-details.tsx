// app/tier-details.tsx
import { Button, Card, ScreenHeader, Text, TierBadge } from '@/src/components/ui';
import { useTheme } from '@/src/hooks/useTheme';
import { formatCurrency } from '@/src/lib/utils/formatters';
import { useUserStore } from '@/src/store/user.store';
import { useWalletStore } from '@/src/store/wallet.store';
import { KYCTier } from '@/src/types/api.types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

interface TierInfo {
  tier: KYCTier;
  name: string;
  dailyLimit: string;
  monthlyLimit: string;
  requirements: { label: string; key: keyof typeof user | string }[];
  benefits: string[];
  verifyRoute?: string;
}

const tierInfo: TierInfo[] = [
  {
    tier: KYCTier.TIER_0,
    name: 'Starter',
    dailyLimit: '₦50,000',
    monthlyLimit: '₦50,000',
    requirements: [{ label: 'Sign up only', key: 'id' }],
    benefits: ['Basic wallet access', 'View transaction history'],
  },
  {
    tier: KYCTier.TIER_1,
    name: 'Basic',
    dailyLimit: '₦300,000',
    monthlyLimit: '₦300,000',
    requirements: [
      { label: 'Verify email', key: 'emailVerified' },
      { label: 'Verify phone number', key: 'phoneVerified' },
    ],
    benefits: [
      '6x higher transaction limits',
      'Full wallet functionality',
      'Virtual account access',
      'Buy airtime & data',
    ],
  },
  {
    tier: KYCTier.TIER_2,
    name: 'Advanced',
    dailyLimit: '₦5,000,000',
    monthlyLimit: '₦5,000,000',
    requirements: [
      { label: 'Complete TIER 1', key: 'tier1' },
      { label: 'BVN verification', key: 'bvnVerified' },
    ],
    benefits: [
      '17x higher limits than TIER 1',
      'Pay bills (Cable TV, Electricity)',
      'International airtime',
      'Enhanced security features',
    ],
    verifyRoute: '/verify-bvn',
  },
  {
    tier: KYCTier.TIER_3,
    name: 'Premium',
    dailyLimit: 'Unlimited',
    monthlyLimit: 'Unlimited',
    requirements: [
      { label: 'Complete TIER 2', key: 'tier2' },
      { label: 'NIN verification', key: 'ninVerified' },
    ],
    benefits: [
      'Unlimited transactions',
      'Priority customer support',
      'Lower transaction fees (coming soon)',
      'Early access to new features',
      'VIP status',
    ],
    verifyRoute: '/verify-nin',
  },
];

export default function TierDetailsScreen() {
  const { isDark } = useTheme();
  const { user } = useUserStore();
  const { dailyDepositLimit, dailyDepositSpent } = useWalletStore();

  const getTierIndex = (tier: KYCTier): number => {
    return [KYCTier.TIER_0, KYCTier.TIER_1, KYCTier.TIER_2, KYCTier.TIER_3].indexOf(tier);
  };

  // Show loading skeleton if user data is not loaded yet
  if (!user) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <StatusBar style={isDark ? 'light' : 'dark'} />

        {/* Header */}
        <ScreenHeader title="Account Tiers" />

        <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
          {/* Loading Skeleton for Current Tier Card */}
          <Card variant="elevated" className="p-5 mb-6">
            <View className="h-4 w-24 bg-gray-200 rounded mb-3 animate-pulse" />
            <View className="h-8 w-32 bg-gray-200 rounded mb-2 animate-pulse" />
            <View className="h-6 w-40 bg-gray-200 rounded mb-4 animate-pulse" />
            <View className="h-2 w-full bg-gray-200 rounded animate-pulse" />
          </Card>

          {/* Loading Skeleton for Tier Cards */}
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} variant="elevated" className="p-5 mb-4">
              <View className="h-6 w-32 bg-gray-200 rounded mb-3 animate-pulse" />
              <View className="h-4 w-48 bg-gray-200 rounded mb-2 animate-pulse" />
              <View className="h-4 w-48 bg-gray-200 rounded mb-4 animate-pulse" />
              <View className="h-20 w-full bg-gray-200 rounded animate-pulse" />
            </Card>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Calculate effective tier based on actual verifications (safety check against backend)
  const getEffectiveTier = (): KYCTier => {
    // Check what's actually verified
    if (user.ninVerified && user.bvnVerified && user.phoneVerified && user.emailVerified) {
      return KYCTier.TIER_3;
    }
    if (user.bvnVerified && user.phoneVerified && user.emailVerified) {
      return KYCTier.TIER_2;
    }
    if (user.phoneVerified && user.emailVerified) {
      return KYCTier.TIER_1;
    }
    // If only email or nothing verified, TIER_0
    return KYCTier.TIER_0;
  };

  const effectiveTier = getEffectiveTier();
  const currentTierIndex = getTierIndex(effectiveTier);

  console.log({ currentTierIndex });
  console.log({ user });

  const isRequirementMet = (key: string): boolean => {
    if (key === 'id') return true;
    if (key === 'tier1') return getTierIndex(effectiveTier) >= getTierIndex(KYCTier.TIER_1);
    if (key === 'tier2') return getTierIndex(effectiveTier) >= getTierIndex(KYCTier.TIER_2);
    return (user as any)?.[key] === true;
  };

  const isTierUnlocked = (tierIndex: number): boolean => {
    return currentTierIndex >= tierIndex;
  };

  const isTierCurrent = (tier: KYCTier): boolean => {
    return effectiveTier === tier;
  };

  const handleRequirementClick = (key: string) => {
    // Only handle clicks for unmet requirements
    if (isRequirementMet(key)) {
      return;
    }

    switch (key) {
      case 'emailVerified':
        router.push('/(auth)/verify-email');
        break;
      case 'phoneVerified':
        router.push('/(auth)/verify-phone');
        break;
      case 'bvnVerified':
        Alert.alert('Coming Soon', 'BVN verification will be available soon.');
        break;
      case 'ninVerified':
        Alert.alert('Coming Soon', 'NIN verification will be available soon.');
        break;
      default:
        // No action for other requirements
        break;
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <ScreenHeader title="Account Tiers" />

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        {/* Current Tier Card */}
        <Card variant="elevated" className="p-5 mb-6 bg-gradient-to-br from-purple-50 to-blue-50">
          <Text variant="caption" color="secondary" className="mb-2">
            Your Current Tier
          </Text>
          <View className="flex-row items-center justify-between mb-3">
            <TierBadge tier={effectiveTier} size="medium" />
            <Text variant="h4" className="text-[#5B55F6]">
              {tierInfo[currentTierIndex]?.dailyLimit}
            </Text>
          </View>

          <View className="mt-2">
            <Text variant="h4" color="secondary">
              Daily transaction limit
            </Text>

            <Text variant="caption" className="text-blue-700">
              {formatCurrency(dailyDepositLimit - dailyDepositSpent)} remaining of{' '}
              {formatCurrency(dailyDepositLimit)}
            </Text>
          </View>

          {/* Progress Bar */}
          <View className="mt-4">
            <View className="flex-row justify-between mb-2">
              <Text variant="caption" color="secondary">
                Progress
              </Text>
              <Text variant="caption" className="text-[#5B55F6] font-semibold">
                {currentTierIndex + 1} of 4 tiers unlocked
              </Text>
            </View>
            <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <View
                className="h-full bg-[#5B55F6] rounded-full"
                style={{ width: `${((currentTierIndex + 1) / 4) * 100}%` }}
              />
            </View>
          </View>
        </Card>

        {/* All Tiers */}
        <Text variant="h4" className="mb-4">
          All Tiers
        </Text>

        {tierInfo.map((tier, index) => {
          const unlocked = isTierUnlocked(index);
          const current = isTierCurrent(tier.tier);
          const allRequirementsMet = tier.requirements.every((req) =>
            isRequirementMet(req.key as string),
          );

          return (
            <Card
              key={tier.tier}
              variant="elevated"
              className={`p-5 mb-4 ${current ? 'border-2 border-[#5B55F6]' : ''}`}
            >
              {/* Tier Header */}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center flex-1">
                  <TierBadge tier={tier.tier} size="medium" />
                  {current && (
                    <View className="ml-2 bg-[#5B55F6] px-2 py-0.5 rounded-full">
                      <Text variant="caption" className="text-white font-semibold">
                        Current
                      </Text>
                    </View>
                  )}
                  {unlocked && !current && (
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" className="ml-2" />
                  )}
                </View>
                {!unlocked && <Ionicons name="lock-closed" size={20} color="#9CA3AF" />}
              </View>

              {/* Limits */}
              <View className="mb-4">
                <View className="flex-row items-baseline mb-1">
                  <Text variant="caption" color="secondary" className="mr-2">
                    Daily Limit:
                  </Text>
                  <Text variant="bodyMedium" className="font-semibold">
                    {tier.dailyLimit}
                  </Text>
                </View>
                <View className="flex-row items-baseline">
                  <Text variant="caption" color="secondary" className="mr-2">
                    Monthly Limit:
                  </Text>
                  <Text variant="bodyMedium" className="font-semibold">
                    {tier.monthlyLimit}
                  </Text>
                </View>
              </View>

              {/* Requirements */}
              <View className="mb-4">
                <Text variant="caption" className="font-semibold mb-2">
                  Requirements:
                </Text>
                {tier.requirements.map((req, reqIndex) => {
                  const met = isRequirementMet(req.key as string);
                  const isClickable =
                    !met &&
                    ['emailVerified', 'phoneVerified', 'bvnVerified', 'ninVerified'].includes(
                      req.key as string,
                    );

                  const RequirementWrapper = isClickable ? Pressable : View;

                  return (
                    <RequirementWrapper
                      key={reqIndex}
                      className="flex-row items-center mb-1"
                      onPress={
                        isClickable ? () => handleRequirementClick(req.key as string) : undefined
                      }
                    >
                      <Ionicons
                        name={met ? 'checkmark-circle' : 'ellipse-outline'}
                        size={16}
                        color={met ? '#10B981' : '#D1D5DB'}
                      />
                      <Text
                        variant="caption"
                        className={`ml-2 ${met ? 'text-green-600' : isClickable ? 'text-blue-600 underline' : 'text-gray-500'}`}
                      >
                        {req.label}
                      </Text>
                      {isClickable && (
                        <Ionicons
                          name="chevron-forward"
                          size={14}
                          color="#2563EB"
                          className="ml-1"
                        />
                      )}
                    </RequirementWrapper>
                  );
                })}
              </View>

              {/* Benefits */}
              <View className="mb-4">
                <Text variant="caption" className="font-semibold mb-2">
                  Benefits:
                </Text>
                {tier.benefits.map((benefit, benefitIndex) => (
                  <View key={benefitIndex} className="flex-row items-start mb-1">
                    <Text variant="caption" color="secondary" className="mr-1">
                      •
                    </Text>
                    <Text variant="caption" color="secondary" className="flex-1">
                      {benefit}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Action Button */}
              {!unlocked && allRequirementsMet && tier.verifyRoute && (
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  onPress={() => router.push(tier.verifyRoute as any)}
                >
                  Unlock {tier.name}
                </Button>
              )}

              {!unlocked && !allRequirementsMet && (
                <View className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                  <Text variant="caption" className="text-gray-600 text-center">
                    Complete previous tier requirements first
                  </Text>
                </View>
              )}
            </Card>
          );
        })}

        {/* Info */}
        <Card variant="outlined" className="p-4 mb-8 border-blue-200 bg-blue-50">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <View className="flex-1 ml-2">
              <Text variant="caption" className="text-blue-800">
                Unlock higher tiers to enjoy increased transaction limits, lower fees, and exclusive
                features. Complete verification steps to upgrade your account.
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}
