// app/(tabs)/profile.tsx
import { Button, Card, Text, TierBadge } from '@/src/components/ui';
import { useAuth } from '@/src/hooks/useAuth';
import { useTheme } from '@/src/hooks/useTheme';
import { ratingService } from '@/src/services/rating.service';
import { useUserStore } from '@/src/store/user.store';
import { KYCTier } from '@/src/types/api.types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Alert, Image, Linking, ScrollView, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const { user } = useUserStore();
  const { logout, isLoggingOut } = useAuth();
  const { isDark } = useTheme();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            // console.log('[Profile] Starting logout...');
            await logout();
            // console.log('[Profile] Logout complete, navigating to welcome');
            // Force navigation to welcome screen
            // Small delay to ensure state updates are complete
            setTimeout(() => {
              router.replace('/(auth)/welcome');
            }, 100);
          },
        },
      ],
      { cancelable: true },
    );
  };

  const handleRateApp = async () => {
    console.log('[Profile] 🌟 Rate app button clicked');
    try {
      await ratingService.openAppStore();
      console.log('[Profile] ✅ Rating service completed');
    } catch (error) {
      console.error('[Profile] ❌ Error in handleRateApp:', error);
      Alert.alert('Error', 'Failed to open app store');
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View className="bg-white dark:bg-gray-800 pt-16 pb-6 px-5 border-b border-gray-200 dark:border-gray-700">
        <Text variant="h3">Profile</Text>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        {/* User Info Card */}
        <Card variant="elevated" className="p-6 mb-6">
          <View className="items-center mb-4">
            {user?.avatar ? (
              <Image
                source={{ uri: user.avatar }}
                className="w-24 h-24 rounded-full bg-gray-200 mb-4"
              />
            ) : (
              <View className="w-24 h-24 rounded-full bg-purple-100 dark:bg-purple-900 items-center justify-center mb-4">
                <Text variant="h1" className="text-[#5B55F6] dark:text-[#5B55F6]">
                  {user?.firstName?.charAt(0) || 'U'}
                </Text>
              </View>
            )}
            <Text variant="h2" align="center">
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : 'User Name'}
            </Text>
            <Text variant="body" color="secondary" align="center" className="mt-1">
              {user?.email || 'user@example.com'}
            </Text>
            <View className="mt-3">
              <TouchableOpacity onPress={() => router.push('/tier-details')}>
                <TierBadge
                  tier={(user?.kycTier as KYCTier) || KYCTier.TIER_0}
                  size="medium"
                  showLimit
                />
              </TouchableOpacity>
            </View>
          </View>
          <View className="flex-row gap-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onPress={() => router.push('/edit-profile')}
            >
              Edit Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onPress={() => router.push('/security-settings')}
            >
              Security
            </Button>
          </View>
        </Card>

        {/* P2P Username Section */}
        <View className="mb-6">
          <Text variant="h4" className="mb-2">
            P2P Transfer
          </Text>
          <Card variant="elevated" className="overflow-hidden">
            {user?.tag ? (
              <TouchableOpacity
                className="flex-row items-center p-4 border-b border-gray-100 dark:border-gray-700"
                onPress={() => router.push('/set-tag')}
              >
                <View className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 items-center justify-center mr-3">
                  <Ionicons name="at" size={20} color="#5B55F6" />
                </View>
                <View className="flex-1">
                  <Text variant="caption" color="secondary" className="mb-1">
                    Your @username
                  </Text>
                  <Text variant="bodyMedium" className="text-[#5B55F6]">
                    @{user.tag}
                  </Text>
                  <Text variant="caption" color="secondary" className="mt-1">
                    {3 - (user.tagChangedCount || 0)} changes remaining
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                className="flex-row items-center p-4 border-b border-gray-100 dark:border-gray-700"
                onPress={() => router.push('/set-tag')}
              >
                <View className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 items-center justify-center mr-3">
                  <Ionicons name="at" size={20} color="#5B55F6" />
                </View>
                <View className="flex-1">
                  <Text variant="bodyMedium">Set Your @username</Text>
                  <Text variant="caption" color="secondary">
                    Receive money from other users
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
            {/* <ProfileMenuItem
              icon="paper-plane-outline"
              title="Send to @username"
              onPress={() => router.push("/send-p2p")}
            />
            <ProfileMenuItem
              icon="time-outline"
              title="P2P Transfer History"
              onPress={() => router.push("/p2p-history")}
            /> */}
          </Card>
        </View>

        {/* Account Section */}
        <View className="mb-6">
          <Text variant="h4" className="mb-2">
            Account
          </Text>
          <Card variant="elevated" className="overflow-hidden">
            <ProfileMenuItem
              icon="person-outline"
              title="Personal Information"
              onPress={() => router.push('/edit-profile')}
            />
            <ProfileMenuItem
              icon="shield-checkmark-outline"
              title="Security"
              onPress={() => router.push('/security-settings')}
            />
            <ProfileMenuItem
              icon="color-palette-outline"
              title="Theme Settings"
              onPress={() => router.push('/theme-settings')}
              isDark={isDark}
            />

            {/* <ProfileMenuItem
              icon="notifications-outline"
              title="Notification Preferences"
              onPress={() => router.push("/notification-preferences")}
            /> */}
          </Card>
        </View>

        {/* Support Section */}
        <View className="mb-6">
          <Text variant="h4" className="mb-2">
            Support
          </Text>
          <Card variant="elevated" className="overflow-hidden">
            <ProfileMenuItem
              icon="help-circle-outline"
              title="Help Center"
              onPress={() => router.push('/support')}
            />
            <ProfileMenuItem icon="star-outline" title="Rate Our App" onPress={handleRateApp} />
            <ProfileMenuItem
              icon="document-text-outline"
              title="Terms of Service"
              onPress={() =>
                // Linking.openURL("https://raverpay.expertvetteddigital.tech/tos")
                Linking.openURL('https://raverpay.expertvetteddigital.tech/tos')
              }
            />
            <ProfileMenuItem
              icon="shield-outline"
              title="Privacy Policy"
              onPress={() =>
                // Linking.openURL(
                //   "https://raverpay.expertvetteddigital.tech/privacy"
                // )
                Linking.openURL('https://raverpay.expertvetteddigital.tech/privacy')
              }
            />
          </Card>
        </View>

        {/* Danger Zone */}
        <View className="mb-6">
          <Text variant="h4" className="mb-2 text-red-600">
            Danger Zone
          </Text>
          <Card variant="elevated" className="overflow-hidden border-2 border-red-200">
            <ProfileMenuItem
              icon="trash-outline"
              title="Delete Account"
              onPress={() => router.push('/delete-account')}
              titleClassName="text-red-600"
              iconColor="#EF4444"
            />
          </Card>
        </View>

        {/* Logout Button */}
        <Button
          variant="outline"
          size="lg"
          fullWidth
          loading={isLoggingOut}
          onPress={handleLogout}
          className="mb-8 border-red-500"
        >
          <Text className="text-red-500">Logout</Text>
        </Button>
      </ScrollView>
    </View>
  );
}

interface ProfileMenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress?: () => void;
  titleClassName?: string;
  iconColor?: string;
  isDark?: boolean;
}

const ProfileMenuItem: React.FC<ProfileMenuItemProps> = ({
  icon,
  title,
  onPress,
  titleClassName = '',
  iconColor,
  isDark = false,
}) => {
  const defaultIconColor = iconColor || (isDark ? '#9CA3AF' : '#6B7280');
  const chevronColor = isDark ? '#9CA3AF' : '#9CA3AF';

  return (
    <TouchableOpacity
      className="flex-row items-center p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
      onPress={onPress}
    >
      <View className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center mr-3">
        <Ionicons name={icon} size={20} color={defaultIconColor} />
      </View>
      <Text variant="bodyMedium" className={`flex-1 ${titleClassName}`}>
        {title}
      </Text>
      <Ionicons name="chevron-forward" size={20} color={chevronColor} />
    </TouchableOpacity>
  );
};
