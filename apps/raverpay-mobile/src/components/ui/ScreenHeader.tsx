// src/components/ui/ScreenHeader.tsx
import { useTheme } from '@/src/hooks/useTheme';
import { formatCurrency } from '@/src/lib/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text } from './Text';

interface ScreenHeaderProps {
  title: string;

  subtitle?: number;
  subtitleText?: string;
  onBack?: () => void;
  backIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  rightComponent?: React.ReactNode;
  onRightIconPress?: () => void;
  rightIconColor?: string;
  disabled?: boolean;
  withPadding?: boolean;
  variant?: 'default' | 'transparent';
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  subtitleText,
  backIcon = 'arrow-back',
  rightIcon,
  rightComponent,
  onRightIconPress,
  rightIconColor = '#5B55F6',
  disabled = false,
  withPadding = true,
  variant = 'default',
}: ScreenHeaderProps) {
  const { isDark } = useTheme();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const containerClasses =
    variant === 'transparent' ? 'bg-gray-50 dark:bg-gray-900' : 'bg-white dark:bg-gray-800';

  const paddingTop = withPadding ? 'pt-12' : 'pt-6';

  return (
    <View
      className={`${containerClasses} ${paddingTop} pb-6 px-5 border-b border-gray-200 dark:border-gray-700`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={handleBack} className="mr-4" disabled={disabled}>
            <Ionicons
              name={backIcon}
              size={24}
              color={disabled ? '#9CA3AF' : isDark ? '#FFFFFF' : '#111827'}
            />
          </TouchableOpacity>
          <View>
            <Text variant="h4">{title}</Text>
            {subtitle && (
              <Text variant="caption" color="secondary" className="mt-1">
                Balance: {formatCurrency(subtitle)}
              </Text>
            )}
            {subtitleText && (
              <Text variant="caption" color="secondary" className="mt-1">
                {subtitleText}
              </Text>
            )}
          </View>
        </View>

        {rightComponent ? (
          rightComponent
        ) : rightIcon && onRightIconPress ? (
          <TouchableOpacity onPress={onRightIconPress} disabled={disabled}>
            <Ionicons name={rightIcon} size={24} color={disabled ? '#9CA3AF' : rightIconColor} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
