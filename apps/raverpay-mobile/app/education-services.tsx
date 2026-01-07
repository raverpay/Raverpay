// app/education-services.tsx

import { Card, ScreenHeader, Text } from '@/src/components/ui';
import { useTheme } from '@/src/hooks/useTheme';
import { useWalletStore } from '@/src/store/wallet.store';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EducationServicesScreen() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { balance, isLocked, lockedReason } = useWalletStore();

  const showLockedAlert = () => {
    Alert.alert(
      'Wallet Locked',
      lockedReason || 'Your wallet is locked. Please upgrade your KYC tier to continue.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upgrade Now', onPress: () => router.push('/tier-details') },
      ],
    );
  };

  const services = [
    {
      id: 'jamb',
      icon: 'school-outline' as const,
      title: 'JAMB Pin Vending',
      description: 'Purchase JAMB UTME registration PIN',
      route: '/buy-jamb-pin',
      color: '#10B981',
    },
    {
      id: 'waec-reg',
      icon: 'book-outline' as const,
      title: 'WAEC Registration',
      description: 'Buy WAEC registration PIN',
      route: '/buy-waec-registration',
      color: '#F59E0B',
    },
    {
      id: 'waec-result',
      icon: 'document-text-outline' as const,
      title: 'WAEC Result Checker',
      description: 'Purchase WAEC result checker PIN',
      route: '/buy-waec-result',
      color: '#8B5CF6',
    },
  ];

  const handleServicePress = (route: string) => {
    if (isLocked) {
      showLockedAlert();
      return;
    }
    router.push(route as any);
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? '#000000' : '#FFFFFF',
      }}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScreenHeader title="Education Services" subtitle={balance} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Card */}
        {/* <Card className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <View className="flex-row items-start">
            <View className="w-10 h-10 rounded-full bg-blue-500 items-center justify-center mr-3">
              <Ionicons name="information" size={20} color="white" />
            </View>
            <View className="flex-1">
              <Text
                variant="bodyMedium"
                weight="semibold"
                className="text-blue-900 dark:text-blue-100 mb-1"
              >
                Exam Services
              </Text>
              <Text variant="caption" className="text-blue-700 dark:text-blue-300">
                Purchase exam registration and result checker PINs instantly
              </Text>
            </View>
          </View>
        </Card> */}

        {/* Service Cards */}
        <View className="space-y-3">
          {services.map((service) => (
            <TouchableOpacity
              key={service.id}
              onPress={() => handleServicePress(service.route)}
              disabled={isLocked}
              activeOpacity={0.7}
              className="mb-4"
            >
              <Card variant="elevated" className={`relative ${isLocked ? 'opacity-50' : ''}`}>
                <View className="flex-row items-center p-4">
                  {/* Icon */}
                  <View
                    className="w-14 h-14 rounded-full items-center justify-center mr-4"
                    style={{ backgroundColor: `${service.color}20` }}
                  >
                    <Ionicons name={service.icon} size={28} color={service.color} />
                  </View>

                  {/* Content */}
                  <View className="flex-1">
                    <Text variant="body" weight="semibold" className="mb-1">
                      {service.title}
                    </Text>
                    <Text variant="caption" color="secondary">
                      {service.description}
                    </Text>
                  </View>

                  {/* Arrow / Lock */}
                  {isLocked ? (
                    <Ionicons name="lock-closed" size={20} color="#9CA3AF" />
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {/* Features Card */}
        <Card className="mt-6 bg-gray-50 dark:bg-gray-800/50 p-4">
          <Text variant="bodyMedium" weight="semibold" className="mb-3">
            Why Choose Us?
          </Text>
          <View className="space-y-3">
            <FeatureItem icon="flash" text="Instant delivery of PINs" iconColor="#10B981" />
            <FeatureItem
              icon="shield-checkmark"
              text="100% authentic and verified"
              iconColor="#3B82F6"
            />
            <FeatureItem icon="wallet" text="Earn cashback on purchases" iconColor="#F59E0B" />
            <FeatureItem icon="time" text="Available 24/7" iconColor="#8B5CF6" />
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

// Feature Item Component
interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  iconColor: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, text, iconColor }) => {
  const { isDark } = useTheme();

  return (
    <View className="flex-row items-center">
      <View
        className="w-8 h-8 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: `${iconColor}20` }}
      >
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <Text variant="bodyMedium" className={isDark ? 'text-gray-300' : 'text-gray-700'}>
        {text}
      </Text>
    </View>
  );
};
