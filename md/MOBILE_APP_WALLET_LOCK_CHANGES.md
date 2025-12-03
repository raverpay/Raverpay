# Mobile App Changes for Wallet Lock Feature (Option 2)

**Date:** 2 December 2024  
**Feature Branch:** `feature/deposit-limits-wallet-lock`  
**Affected File:** `app/(tabs)/index.tsx` (Home Screen)

---

## 🎯 Overview

When implementing **Option 2: Allow Deposit, Lock Excess Amount**, the mobile app home screen needs to:

1. **Display wallet locked status** prominently
2. **Disable transaction buttons** when wallet is locked
3. **Show unlock prompts** to upgrade KYC tier
4. **Display lockedReason** message to user
5. **Show current tier limits** and remaining capacity

---

## 🔧 Required Changes to Home Screen

### 1. **Update Wallet API Response Type**

The `useWallet` hook needs to return additional fields from the backend:

```typescript
// Expected API response shape (from backend /api/wallet/balance)
interface WalletBalance {
  balance: number;
  isLocked: boolean; // NEW FIELD
  lockedReason: string | null; // NEW FIELD
  kycTier: 'TIER_0' | 'TIER_1' | 'TIER_2' | 'TIER_3'; // NEW FIELD
  dailyDepositLimit: number; // NEW FIELD
  dailyDepositSpent: number; // NEW FIELD
  singleTransactionLimit: number; // NEW FIELD
}
```

### 2. **Update `useWalletStore` to Include Lock Status**

```typescript
// src/store/wallet.store.ts
interface WalletStore {
  balance: number;
  isBalanceVisible: boolean;
  isLocked: boolean; // NEW
  lockedReason: string | null; // NEW
  kycTier: string; // NEW
  dailyDepositLimit: number; // NEW
  dailyDepositSpent: number; // NEW

  setWalletData: (data: WalletBalance) => void; // NEW
  toggleBalanceVisibility: () => void;
}
```

### 3. **Update Home Screen UI Components**

#### A. **Add Locked Wallet Banner (Top Priority)**

Place this **immediately after** the balance card and **before** quick actions:

```tsx
{
  /* Locked Wallet Warning Banner */
}
{
  !isLoadingWallet && isLocked && (
    <View className="mx-5 mt-4 mb-2">
      <Card variant="elevated" className="bg-red-50 border-2 border-red-200">
        <View className="p-4">
          <View className="flex-row items-center mb-3">
            <View className="w-10 h-10 rounded-full bg-red-500 items-center justify-center mr-3">
              <Ionicons name="lock-closed" size={20} color="white" />
            </View>
            <View className="flex-1">
              <Text variant="bodyMedium" weight="bold" className="text-red-900">
                Wallet Locked
              </Text>
              <Text variant="caption" className="text-red-700 mt-1">
                {lockedReason || 'Your wallet has been locked'}
              </Text>
            </View>
          </View>

          {/* Upgrade CTA */}
          <TouchableOpacity
            className="bg-red-500 rounded-xl py-3 items-center"
            onPress={() => router.push('/kyc-upgrade')}
          >
            <Text variant="bodyMedium" color="inverse" weight="bold">
              Upgrade to {getNextTier(kycTier)} to Unlock
            </Text>
          </TouchableOpacity>

          {/* Contact Support Link */}
          <TouchableOpacity className="mt-3 items-center" onPress={() => router.push('/support')}>
            <Text variant="caption" className="text-red-600 underline">
              Contact Support
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    </View>
  );
}
```

#### B. **Disable Buttons When Wallet is Locked**

Update all transaction buttons in the balance card:

```tsx
{
  /* Balance Card Buttons - UPDATED */
}
<View className="flex-row gap-3">
  <TouchableOpacity
    className={`w-1/2 h-12 rounded-xl items-center justify-center ${
      isLocked ? 'bg-gray-300' : 'bg-white'
    }`}
    onPress={() => {
      if (isLocked) {
        Alert.alert(
          'Wallet Locked',
          lockedReason || 'Please upgrade your KYC tier to unlock your wallet',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade Now', onPress: () => router.push('/kyc-upgrade') },
          ],
        );
        return;
      }
      router.push('/fund-wallet');
    }}
    disabled={isLoadingWallet}
  >
    <View className="flex-row items-center">
      {isLocked && <Ionicons name="lock-closed" size={16} color="#9CA3AF" className="mr-2" />}
      <Text variant="bodyMedium" className={isLocked ? 'text-gray-500' : 'text-[#5B55F6]'}>
        Add Money
      </Text>
    </View>
  </TouchableOpacity>

  <TouchableOpacity
    className={`w-1/2 h-12 rounded-xl items-center justify-center ${
      isLocked ? 'bg-gray-300' : 'bg-white/20'
    }`}
    onPress={() => {
      if (isLocked) {
        Alert.alert(
          'Wallet Locked',
          lockedReason || 'Please upgrade your KYC tier to unlock your wallet',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade Now', onPress: () => router.push('/kyc-upgrade') },
          ],
        );
        return;
      }
      router.push('/withdraw');
    }}
    disabled={isLoadingWallet}
  >
    <View className="flex-row items-center">
      {isLocked && <Ionicons name="lock-closed" size={16} color="#9CA3AF" className="mr-2" />}
      <Text variant="bodyMedium" className={isLocked ? 'text-gray-500' : 'text-white'}>
        Transfer
      </Text>
    </View>
  </TouchableOpacity>
</View>;
```

#### C. **Disable Quick Actions When Locked**

Update all quick action cards:

```tsx
{
  /* Quick Actions - UPDATED */
}
<View className="my-6 w-full">
  <View className="flex-row flex-wrap gap-3 w-full">
    <QuickActionCard
      icon="call-outline"
      title="Airtime"
      onPress={() => {
        if (isLocked) {
          showLockedAlert();
          return;
        }
        router.push('/buy-airtime');
      }}
      disabled={isLocked}
    />
    <QuickActionCard
      icon="wifi-outline"
      title="Data"
      onPress={() => {
        if (isLocked) {
          showLockedAlert();
          return;
        }
        router.push('/buy-data');
      }}
      disabled={isLocked}
    />
    {/* ... repeat for all quick actions */}
  </View>
</View>;
```

#### D. **Add Helper Functions**

```tsx
// Helper: Show locked wallet alert
const showLockedAlert = () => {
  Alert.alert(
    'Wallet Locked',
    lockedReason || 'Your wallet is locked. Please upgrade your KYC tier to continue.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Upgrade Now', onPress: () => router.push('/kyc-upgrade') },
    ],
  );
};

// Helper: Get next tier name
const getNextTier = (currentTier: string): string => {
  const tierMap = {
    TIER_0: 'TIER 1 (₦300K daily)',
    TIER_1: 'TIER 2 (₦5M daily)',
    TIER_2: 'TIER 3 (Unlimited)',
    TIER_3: 'Already at max tier',
  };
  return tierMap[currentTier as keyof typeof tierMap] || 'Higher Tier';
};
```

#### E. **Update QuickActionCard Component**

```tsx
// Quick Action Component - UPDATED
interface QuickActionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
  disabled?: boolean; // NEW PROP
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  icon,
  title,
  onPress,
  disabled = false,
}) => (
  <TouchableOpacity
    className={`w-[31%] ${disabled ? 'opacity-50' : ''}`}
    onPress={onPress}
    disabled={disabled}
  >
    <Card variant="elevated" className="p-4 items-center relative">
      {disabled && (
        <View className="absolute top-2 right-2">
          <Ionicons name="lock-closed" size={12} color="#9CA3AF" />
        </View>
      )}
      <View
        className={`w-12 h-12 rounded-full ${disabled ? 'bg-gray-400' : 'bg-[#5B55F6]'} items-center justify-center mb-2`}
      >
        <Ionicons name={icon} size={24} color="white" />
      </View>
      <Text variant="caption" align="center" className={disabled ? 'text-gray-500' : ''}>
        {title}
      </Text>
    </Card>
  </TouchableOpacity>
);
```

### 4. **Add Deposit Limit Indicator (Optional but Recommended)**

Show user how much they can still deposit today:

```tsx
{
  /* Deposit Limit Indicator - Place below balance card */
}
{
  !isLoadingWallet && !isLocked && kycTier !== 'TIER_3' && (
    <View className="mx-5 mt-4 mb-2">
      <Card variant="elevated" className="bg-blue-50 p-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text variant="caption" className="text-blue-900">
            Daily Deposit Limit ({kycTier})
          </Text>
          <TouchableOpacity onPress={() => router.push('/kyc-upgrade')}>
            <Text variant="caption" className="text-[#5B55F6] underline">
              Upgrade
            </Text>
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View className="h-2 bg-blue-200 rounded-full overflow-hidden mb-2">
          <View
            className="h-full bg-blue-500"
            style={{
              width: `${Math.min((dailyDepositSpent / dailyDepositLimit) * 100, 100)}%`,
            }}
          />
        </View>

        <Text variant="caption" className="text-blue-700">
          {formatCurrency(dailyDepositLimit - dailyDepositSpent)} remaining of{' '}
          {formatCurrency(dailyDepositLimit)}
        </Text>
      </Card>
    </View>
  );
}
```

---

## 📱 Complete Updated Home Screen Component

Here's the full updated component with all changes integrated:

```tsx
// app/(tabs)/index.tsx - COMPLETE UPDATED VERSION
import { Card, Skeleton, SkeletonCircle, Text } from '@/src/components/ui';
import { TransactionItem } from '@/src/components/wallet/TransactionItem';
import { useCashbackWallet } from '@/src/hooks/useCashback';
import { useUnreadCount } from '@/src/hooks/useNotifications';
import { useTransactions } from '@/src/hooks/useTransactions';
import { useWallet } from '@/src/hooks/useWallet';
import { formatCurrency } from '@/src/lib/utils/formatters';
import { useUserStore } from '@/src/store/user.store';
import { useWalletStore } from '@/src/store/wallet.store';
import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const { user } = useUserStore();
  const {
    balance,
    isBalanceVisible,
    toggleBalanceVisibility,
    isLocked, // NEW
    lockedReason, // NEW
    kycTier, // NEW
    dailyDepositLimit, // NEW
    dailyDepositSpent, // NEW
  } = useWalletStore();
  const [refreshing, setRefreshing] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      onRefresh();
      pollIntervalRef.current = setInterval(() => {
        refetchWallet();
        refetchCashback();
        refetchTransactions();
      }, 30000);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    }, []),
  );

  const { refetch: refetchWallet, isPending: isLoadingWallet } = useWallet();
  const {
    data: cashbackWallet,
    refetch: refetchCashback,
    isLoading: isLoadingCashback,
  } = useCashbackWallet();
  const {
    data: transactionsData,
    refetch: refetchTransactions,
    isPending: isLoadingTransactions,
  } = useTransactions({ limit: 5 });

  const recentTransactions = transactionsData?.pages[0]?.data || [];

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchWallet(), refetchCashback(), refetchTransactions()]);
    setRefreshing(false);
  };

  const unreadCount = useUnreadCount();

  const handleNotifications = () => {
    router.push('/notifications');
  };

  // NEW: Helper function to show locked alert
  const showLockedAlert = () => {
    Alert.alert(
      'Wallet Locked',
      lockedReason || 'Your wallet is locked. Please upgrade your KYC tier to continue.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upgrade Now', onPress: () => router.push('/kyc-upgrade') },
      ],
    );
  };

  // NEW: Helper to get next tier
  const getNextTier = (currentTier: string): string => {
    const tierMap = {
      TIER_0: 'TIER 1 (₦300K daily)',
      TIER_1: 'TIER 2 (₦5M daily)',
      TIER_2: 'TIER 3 (Unlimited)',
      TIER_3: 'Already at max tier',
    };
    return tierMap[currentTier as keyof typeof tierMap] || 'Higher Tier';
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="light" />

      {/* Header */}
      <View className="bg-[#5B55F6] pt-12 pb-8 b-8 px-5 rounded-b-3xl">
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text variant="h3" color="inverse">
              Hi {user?.firstName || 'User'}
            </Text>
          </View>

          <View className="flex-row items-center gap-4">
            {!isLoadingCashback && cashbackWallet && cashbackWallet.availableBalance > 0 && (
              <TouchableOpacity
                className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
                onPress={() => router.push('/cashback-wallet')}
              >
                <MaterialIcons name="wallet-giftcard" size={22} color="white" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
              onPress={handleNotifications}
            >
              {unreadCount > 0 && (
                <View className="absolute -top-0 -right-0 w-3 h-3 rounded-full bg-red-500" />
              )}
              <MaterialIcons name="notifications-none" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance Card */}
        <Card variant="filled" className="bg-white/10 backdrop-blur-lg p-5">
          <View className="flex-row items-center justify-between">
            <Text variant="caption" color="inverse" className="opacity-80">
              Available Balance
            </Text>
            {!isLoadingWallet && (
              <TouchableOpacity onPress={toggleBalanceVisibility}>
                <Ionicons
                  name={isBalanceVisible ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="white"
                />
              </TouchableOpacity>
            )}
          </View>

          {isLoadingWallet ? (
            <Skeleton
              width={200}
              height={48}
              className="mb-4"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
            />
          ) : (
            <View className="flex-row items-center h-14">
              <Text variant="h2" color="inverse" className="">
                {isBalanceVisible ? formatCurrency(balance) : '****'}
              </Text>
            </View>
          )}

          {/* UPDATED: Buttons with lock state */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              className={`w-1/2 h-12 rounded-xl items-center justify-center ${
                isLocked ? 'bg-gray-300' : 'bg-white'
              }`}
              onPress={() => {
                if (isLocked) {
                  showLockedAlert();
                  return;
                }
                router.push('/fund-wallet');
              }}
              disabled={isLoadingWallet}
            >
              <View className="flex-row items-center">
                {isLocked && (
                  <Ionicons
                    name="lock-closed"
                    size={16}
                    color="#9CA3AF"
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text
                  variant="bodyMedium"
                  className={isLocked ? 'text-gray-500' : 'text-[#5B55F6]'}
                >
                  Add Money
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              className={`w-1/2 h-12 rounded-xl items-center justify-center ${
                isLocked ? 'bg-gray-300' : 'bg-white/20'
              }`}
              onPress={() => {
                if (isLocked) {
                  showLockedAlert();
                  return;
                }
                router.push('/withdraw');
              }}
              disabled={isLoadingWallet}
            >
              <View className="flex-row items-center">
                {isLocked && (
                  <Ionicons
                    name="lock-closed"
                    size={16}
                    color="#9CA3AF"
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text variant="bodyMedium" className={isLocked ? 'text-gray-500' : 'text-white'}>
                  Transfer
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </Card>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* NEW: Locked Wallet Warning Banner */}
        {!isLoadingWallet && isLocked && (
          <View className="mt-4 mb-2">
            <Card variant="elevated" className="bg-red-50 border-2 border-red-200">
              <View className="p-4">
                <View className="flex-row items-center mb-3">
                  <View className="w-10 h-10 rounded-full bg-red-500 items-center justify-center mr-3">
                    <Ionicons name="lock-closed" size={20} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text variant="bodyMedium" weight="bold" className="text-red-900">
                      Wallet Locked
                    </Text>
                    <Text variant="caption" className="text-red-700 mt-1">
                      {lockedReason || 'Your wallet has been locked'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  className="bg-red-500 rounded-xl py-3 items-center"
                  onPress={() => router.push('/kyc-upgrade')}
                >
                  <Text variant="bodyMedium" color="inverse" weight="bold">
                    Upgrade to {getNextTier(kycTier)} to Unlock
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="mt-3 items-center"
                  onPress={() => router.push('/support')}
                >
                  <Text variant="caption" className="text-red-600 underline">
                    Contact Support
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        )}

        {/* NEW: Deposit Limit Indicator */}
        {!isLoadingWallet && !isLocked && kycTier !== 'TIER_3' && (
          <View className="mt-4 mb-2">
            <Card variant="elevated" className="bg-blue-50 p-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text variant="caption" className="text-blue-900">
                  Daily Deposit Limit ({kycTier})
                </Text>
                <TouchableOpacity onPress={() => router.push('/kyc-upgrade')}>
                  <Text variant="caption" className="text-[#5B55F6] underline">
                    Upgrade
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="h-2 bg-blue-200 rounded-full overflow-hidden mb-2">
                <View
                  className="h-full bg-blue-500"
                  style={{
                    width: `${Math.min((dailyDepositSpent / dailyDepositLimit) * 100, 100)}%`,
                  }}
                />
              </View>

              <Text variant="caption" className="text-blue-700">
                {formatCurrency(dailyDepositLimit - dailyDepositSpent)} remaining of{' '}
                {formatCurrency(dailyDepositLimit)}
              </Text>
            </Card>
          </View>
        )}

        {/* Quick Actions */}
        <View className="my-6 w-full">
          <View className="flex-row flex-wrap gap-3 w-full ">
            <QuickActionCard
              icon="call-outline"
              title="Airtime"
              onPress={() => {
                if (isLocked) {
                  showLockedAlert();
                  return;
                }
                router.push('/buy-airtime');
              }}
              disabled={isLocked}
            />
            <QuickActionCard
              icon="wifi-outline"
              title="Data"
              onPress={() => {
                if (isLocked) {
                  showLockedAlert();
                  return;
                }
                router.push('/buy-data');
              }}
              disabled={isLocked}
            />
            <QuickActionCard
              icon="tv-outline"
              title="Cable"
              onPress={() => {
                if (isLocked) {
                  showLockedAlert();
                  return;
                }
                router.push('/pay-cable');
              }}
              disabled={isLocked}
            />
            <QuickActionCard
              icon="flash-outline"
              title="Electricity"
              onPress={() => {
                if (isLocked) {
                  showLockedAlert();
                  return;
                }
                router.push('/pay-electricity');
              }}
              disabled={isLocked}
            />
            <QuickActionCard
              icon="globe-outline"
              title="International"
              onPress={() => {
                if (isLocked) {
                  showLockedAlert();
                  return;
                }
                router.push('/buy-international-airtime');
              }}
              disabled={isLocked}
            />
          </View>
        </View>

        {/* Recent Transactions */}
        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text variant="h4" weight="bold">
              Recent Transactions
            </Text>
            <TouchableOpacity onPress={() => router.push('/transactions')}>
              <Text variant="bodyMedium" className="text-[#5B55F6]">
                View All
              </Text>
            </TouchableOpacity>
          </View>

          <Card variant="elevated" className="overflow-hidden">
            {isLoadingTransactions ? (
              <View className="p-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <TransactionItemSkeleton key={i} />
                ))}
              </View>
            ) : recentTransactions.length === 0 ? (
              <View className="p-8 items-center">
                <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
                  <Ionicons name="receipt-outline" size={32} color="#9CA3AF" />
                </View>
                <Text variant="bodyMedium" color="secondary" align="center">
                  No transactions yet
                </Text>
                <Text variant="caption" color="secondary" align="center" className="mt-2">
                  Your transactions will appear here
                </Text>
              </View>
            ) : (
              <View className="p-4">
                {recentTransactions.map((transaction: any) => (
                  <TransactionItem key={transaction.id} transaction={transaction} />
                ))}
              </View>
            )}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

// Quick Action Component - UPDATED
interface QuickActionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
  disabled?: boolean; // NEW
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  icon,
  title,
  onPress,
  disabled = false,
}) => (
  <TouchableOpacity
    className={`w-[31%] ${disabled ? 'opacity-50' : ''}`}
    onPress={onPress}
    disabled={disabled}
  >
    <Card variant="elevated" className="p-4 items-center relative">
      {disabled && (
        <View className="absolute top-2 right-2">
          <Ionicons name="lock-closed" size={12} color="#9CA3AF" />
        </View>
      )}
      <View
        className={`w-12 h-12 rounded-full ${disabled ? 'bg-gray-400' : 'bg-[#5B55F6]'} items-center justify-center mb-2`}
      >
        <Ionicons name={icon} size={24} color="white" />
      </View>
      <Text variant="caption" align="center" className={disabled ? 'text-gray-500' : ''}>
        {title}
      </Text>
    </Card>
  </TouchableOpacity>
);

// Transaction Item Skeleton
const TransactionItemSkeleton: React.FC = () => (
  <View className="flex-row items-center py-4 border-b border-gray-100 last:border-b-0">
    <SkeletonCircle size={48} />
    <View className="flex-1 ml-4">
      <Skeleton width="70%" height={16} className="mb-2" />
      <Skeleton width="40%" height={14} />
    </View>
    <View className="items-end">
      <Skeleton width={80} height={16} className="mb-2" />
      <Skeleton width={60} height={14} />
    </View>
  </View>
);
```

---

## 🔄 Backend API Updates Required

The `/api/wallet/balance` endpoint must return:

```typescript
// GET /api/wallet/balance response
{
  "balance": 125000.50,
  "isLocked": true, // NEW
  "lockedReason": "Deposit of ₦100,000 exceeds your TIER_0 daily limit of ₦50,000. Please upgrade your KYC tier to unlock your wallet.", // NEW
  "kycTier": "TIER_0", // NEW
  "dailyDepositLimit": 50000, // NEW
  "dailyDepositSpent": 100000, // NEW
  "singleTransactionLimit": 20000 // NEW
}
```

---

## 📋 Testing Checklist

### Scenario 1: Wallet Locked State

- [ ] Locked banner displays prominently
- [ ] All transaction buttons show lock icon
- [ ] Clicking any button shows upgrade alert
- [ ] "Upgrade Now" button navigates to KYC upgrade screen
- [ ] "Contact Support" link navigates to support screen

### Scenario 2: Wallet Unlocked State

- [ ] No locked banner visible
- [ ] All buttons are fully enabled
- [ ] Deposit limit indicator shows correct remaining amount
- [ ] Progress bar updates correctly after deposits

### Scenario 3: TIER_3 User

- [ ] No deposit limit indicator shown
- [ ] No upgrade prompts
- [ ] All features fully accessible

### Scenario 4: Real-time Updates

- [ ] Lock status updates immediately after deposit exceeding limit
- [ ] Lock status clears immediately after KYC upgrade
- [ ] Balance updates reflect locked state correctly

---

## 🎨 UI/UX Considerations

### Colors

- **Locked State:** Red theme (`bg-red-50`, `border-red-200`, `bg-red-500`)
- **Deposit Limit:** Blue theme (`bg-blue-50`, `text-blue-900`)
- **Disabled Buttons:** Gray theme (`bg-gray-300`, `text-gray-500`)

### Messaging

- **Clear:** "Wallet Locked" (not "Account Suspended")
- **Action-Oriented:** "Upgrade to TIER 1 to Unlock" (not "Please upgrade")
- **Contextual:** Show exact reason from backend
- **Helpful:** Provide both upgrade and support options

### Accessibility

- Lock icons on disabled buttons for visual clarity
- Sufficient color contrast for red warning banner
- Clear tap targets (44px minimum height)
- Descriptive button labels

---

## 🚀 Rollout Strategy

### Phase 1: Backend First

1. ✅ Implement Option 2 on backend
2. ✅ Update `/api/wallet/balance` endpoint
3. ✅ Test with Postman/cURL

### Phase 2: Mobile App Updates

1. Update `useWallet` hook to consume new fields
2. Update `useWalletStore` to store lock state
3. Update home screen UI (this document)
4. Test in local development

### Phase 3: Staged Rollout

1. Deploy backend to staging
2. Deploy mobile app to internal TestFlight
3. Test with real test users (3 scenarios)
4. Deploy to production

---

## 📞 Support Preparation

### Common User Questions

**Q: Why is my wallet locked?**  
A: Your recent deposit exceeded your current KYC tier limit. Upgrade your tier to unlock your wallet and enjoy higher limits.

**Q: Is my money safe?**  
A: Yes! Your funds are 100% safe in your wallet. We've locked transactions temporarily to encourage KYC upgrade for regulatory compliance.

**Q: How long does KYC upgrade take?**  
A:

- TIER 1 (email/phone): Instant
- TIER 2 (BVN): 5-10 minutes
- TIER 3 (full KYC): 24-48 hours

**Q: Can I get a refund instead?**  
A: We don't offer refunds for deposits, but upgrading your KYC tier is quick and unlocks your wallet immediately.

---

**Document Version:** 1.0  
**Last Updated:** 2 December 2024  
**Review Status:** Ready for Implementation
