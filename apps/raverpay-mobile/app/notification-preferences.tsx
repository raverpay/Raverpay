// app/notification-preferences.tsx

import { Button, Card, ScreenHeader, Skeleton, SkeletonCircle, Text } from '@/src/components/ui';
import {
  useNotificationPreferences,
  useResetPreferences,
  useUpdatePreferences,
} from '@/src/hooks/useNotifications';
import { useTheme } from '@/src/hooks/useTheme';
import { toast } from '@/src/lib/utils/toast';
import type { UpdateNotificationPreferencesDto } from '@/src/types/notification';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Alert, ScrollView, Switch, View } from 'react-native';

export default function NotificationPreferencesScreen() {
  const { isDark } = useTheme();
  const { data: preferences, isPending: isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdatePreferences();
  const resetPreferences = useResetPreferences();

  const [localPreferences, setLocalPreferences] = useState<UpdateNotificationPreferencesDto>({});

  // Update local state when preferences load
  React.useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
    }
  }, [preferences]);

  const handleToggle = (key: keyof UpdateNotificationPreferencesDto, value: boolean) => {
    // Check if user is enabling SMS (which costs money)
    const smsKeys = ['smsEnabled', 'transactionSms', 'securitySms', 'kycSms', 'promotionalSms'];
    if (smsKeys.includes(key) && value === true) {
      // Show warning about SMS charges
      Alert.alert(
        'SMS Charges Apply',
        'Enabling SMS notifications will incur charges. You will be billed for each SMS sent. Are you sure you want to enable SMS notifications?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: () => {
              setLocalPreferences((prev) => ({ ...prev, [key]: value }));
            },
          },
        ],
      );
    } else {
      setLocalPreferences((prev) => ({ ...prev, [key]: value }));
    }
  };

  const handleSave = async () => {
    try {
      // Only send fields that are in the DTO (exclude id, userId, createdAt, updatedAt)
      const {
        id,

        userId,

        createdAt,

        updatedAt,
        ...updateData
      } = localPreferences as any;

      await updatePreferences.mutateAsync(updateData);
      toast.success({
        title: 'Success',
        message: 'Notification preferences updated successfully',
      });
    } catch (error: any) {
      console.error('[NotificationPreferences] Save error:', error);
      toast.error({
        title: 'Failed to Update',
        message: error?.message || 'Failed to update preferences. Please try again.',
      });
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Preferences',
      'Are you sure you want to reset all notification preferences to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const defaults = await resetPreferences.mutateAsync();
              setLocalPreferences(defaults);
              toast.success({
                title: 'Success',
                message: 'Preferences reset to defaults',
              });
            } catch (error: any) {
              console.error('[NotificationPreferences] Reset error:', error);
              toast.error({
                title: 'Failed to Reset',
                message: error?.message || 'Failed to reset preferences. Please try again.',
              });
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <StatusBar style={isDark ? 'light' : 'dark'} />

        {/* Header */}
        <ScreenHeader title="Notification Preferences" />

        {/* Skeleton Content */}
        <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} className="mb-6">
              <Skeleton width="60%" height={24} className="mb-4" />
              <Card variant="elevated" className="p-4">
                {Array.from({ length: 3 }).map((_, j) => (
                  <PreferenceSkeleton key={j} showDivider={j < 2} />
                ))}
              </Card>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <ScreenHeader title="Notification Preferences" withPadding={false} />

      {/* Content */}
      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        {/* Channels Section */}
        <View className="mb-6">
          <Text variant="h4" className="mb-4">
            Notification Channels
          </Text>
          <Card variant="elevated" className="p-4">
            <PreferenceToggle
              icon="mail-outline"
              title="Email Notifications"
              description="Receive notifications via email"
              value={localPreferences.emailEnabled ?? true}
              onToggle={(value) => handleToggle('emailEnabled', value)}
            />
            <PreferenceToggle
              icon="chatbubble-outline"
              title="SMS Notifications"
              description="Receive notifications via SMS (charges apply)"
              value={localPreferences.smsEnabled ?? false}
              onToggle={(value) => handleToggle('smsEnabled', value)}
            />
            <PreferenceToggle
              icon="notifications-outline"
              title="Push Notifications"
              description="Receive push notifications"
              value={localPreferences.pushEnabled ?? true}
              onToggle={(value) => handleToggle('pushEnabled', value)}
            />
            <PreferenceToggle
              icon="apps-outline"
              title="In-App Notifications"
              description="Show notifications in app"
              value={localPreferences.inAppEnabled ?? true}
              onToggle={(value) => handleToggle('inAppEnabled', value)}
              showDivider={false}
            />
          </Card>
        </View>

        {/* Transaction Notifications */}
        <View className="mb-6">
          <Text variant="h4" className="mb-4">
            Transaction Notifications
          </Text>
          <Card variant="elevated" className="p-4">
            <PreferenceToggle
              icon="mail-outline"
              title="Email"
              description="Deposits, withdrawals, purchases"
              value={localPreferences.transactionEmails ?? true}
              onToggle={(value) => handleToggle('transactionEmails', value)}
            />
            <PreferenceToggle
              icon="chatbubble-outline"
              title="SMS"
              description="Instant transaction alerts"
              value={localPreferences.transactionSms ?? false}
              onToggle={(value) => handleToggle('transactionSms', value)}
            />
            <PreferenceToggle
              icon="notifications-outline"
              title="Push"
              description="Real-time transaction updates"
              value={localPreferences.transactionPush ?? true}
              onToggle={(value) => handleToggle('transactionPush', value)}
              showDivider={false}
            />
          </Card>
        </View>

        {/* Security Notifications */}
        <View className="mb-6">
          <Text variant="h4" className="mb-4">
            Security Notifications
          </Text>
          <Card variant="elevated" className="p-4">
            <PreferenceToggle
              icon="mail-outline"
              title="Email"
              description="Login alerts, password changes"
              value={localPreferences.securityEmails ?? true}
              onToggle={(value) => handleToggle('securityEmails', value)}
            />
            <PreferenceToggle
              icon="chatbubble-outline"
              title="SMS"
              description="Critical security alerts"
              value={localPreferences.securitySms ?? false}
              onToggle={(value) => handleToggle('securitySms', value)}
            />
            <PreferenceToggle
              icon="notifications-outline"
              title="Push"
              description="Immediate security warnings"
              value={localPreferences.securityPush ?? true}
              onToggle={(value) => handleToggle('securityPush', value)}
              showDivider={false}
            />
          </Card>
        </View>

        {/* KYC Notifications */}
        <View className="mb-6">
          <Text variant="h4" className="mb-4">
            KYC & Verification
          </Text>
          <Card variant="elevated" className="p-4">
            <PreferenceToggle
              icon="mail-outline"
              title="Email"
              description="BVN verification, tier upgrades"
              value={localPreferences.kycEmails ?? true}
              onToggle={(value) => handleToggle('kycEmails', value)}
            />
            <PreferenceToggle
              icon="chatbubble-outline"
              title="SMS"
              description="Verification status updates"
              value={localPreferences.kycSms ?? false}
              onToggle={(value) => handleToggle('kycSms', value)}
            />
            <PreferenceToggle
              icon="notifications-outline"
              title="Push"
              description="KYC completion alerts"
              value={localPreferences.kycPush ?? true}
              onToggle={(value) => handleToggle('kycPush', value)}
              showDivider={false}
            />
          </Card>
        </View>

        {/* Promotional Notifications */}
        <View className="mb-6">
          <Text variant="h4" className="mb-4">
            Promotional & Marketing
          </Text>
          <Card variant="elevated" className="p-4">
            <PreferenceToggle
              icon="mail-outline"
              title="Email"
              description="Offers, news, updates"
              value={localPreferences.promotionalEmails ?? false}
              onToggle={(value) => handleToggle('promotionalEmails', value)}
            />
            <PreferenceToggle
              icon="chatbubble-outline"
              title="SMS"
              description="Special promotions"
              value={localPreferences.promotionalSms ?? false}
              onToggle={(value) => handleToggle('promotionalSms', value)}
            />
            <PreferenceToggle
              icon="notifications-outline"
              title="Push"
              description="Promotional alerts"
              value={localPreferences.promotionalPush ?? false}
              onToggle={(value) => handleToggle('promotionalPush', value)}
              showDivider={false}
            />
          </Card>
        </View>

        {/* Quiet Hours */}
        <View className="mb-6">
          <Text variant="h4" className="mb-4">
            Quiet Hours
          </Text>
          <Card variant="elevated" className="p-4">
            <PreferenceToggle
              icon="moon-outline"
              title="Enable Quiet Hours"
              description="Pause notifications during specific hours (except security alerts)"
              value={localPreferences.quietHoursEnabled ?? false}
              onToggle={(value) => handleToggle('quietHoursEnabled', value)}
              showDivider={false}
            />
            {localPreferences.quietHoursEnabled && (
              <View className="mt-4 pl-12">
                <Text variant="caption" color="secondary">
                  Quiet hours: {localPreferences.quietHoursStart || '22:00'} -{' '}
                  {localPreferences.quietHoursEnd || '06:00'}
                </Text>
                <Text variant="caption" color="secondary" className="mt-1">
                  Timezone: {localPreferences.timeZone || 'Africa/Lagos'}
                </Text>
              </View>
            )}
          </Card>
        </View>

        {/* Action Buttons */}
        <View className="mb-8">
          <Button onPress={handleSave} loading={updatePreferences.isPending} className="mb-3">
            Save Preferences
          </Button>
          <Button variant="outline" onPress={handleReset} loading={resetPreferences.isPending}>
            Reset to Defaults
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

interface PreferenceToggleProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  showDivider?: boolean;
}

function PreferenceToggle({
  icon,
  title,
  description,
  value,
  onToggle,
  showDivider = true,
}: PreferenceToggleProps) {
  return (
    <>
      <View className="flex-row items-center py-3">
        <View className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 items-center justify-center mr-4">
          <Ionicons name={icon} size={20} color="#5b55f6" />
        </View>
        <View className="flex-1 mr-4">
          <Text variant="body" weight="semibold">
            {title}
          </Text>
          <Text variant="caption" color="secondary" className="mt-0.5">
            {description}
          </Text>
        </View>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#D1D5DB', true: '#f4f3f4' }}
          thumbColor={value ? '#5b55f6' : '#f4f3f4'}
        />
      </View>
      {showDivider && <View className="h-px bg-gray-200 ml-14" />}
    </>
  );
}

// Preference Toggle Skeleton
const PreferenceSkeleton: React.FC<{ showDivider?: boolean }> = ({ showDivider = true }) => (
  <>
    <View className="flex-row items-center py-3">
      <SkeletonCircle size={40} />
      <View className="flex-1 ml-4 mr-4">
        <Skeleton width="50%" height={16} className="mb-2" />
        <Skeleton width="80%" height={12} />
      </View>
      <Skeleton width={51} height={31} borderRadius={16} />
    </View>
    {showDivider && <View className="h-px bg-gray-200 ml-14" />}
  </>
);
