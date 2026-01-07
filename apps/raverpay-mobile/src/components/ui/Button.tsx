// components/ui/Button.tsx
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  haptic?: boolean;
  showLoadingIndicator?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  children,
  haptic = true,
  onPress,
  className,
  showLoadingIndicator = true,
  ...props
}) => {
  const handlePress = (event: any) => {
    if (haptic && !disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (onPress && !disabled && !loading) {
      onPress(event);
    }
  };

  const isDisabled = disabled || loading;

  // Base classes
  const baseClasses = 'flex-row items-center justify-center rounded-xl';

  // Size classes
  const sizeClasses = {
    sm: 'h-10 px-4 gap-1.5',
    md: 'h-[52px] px-5 gap-2',
    lg: 'h-14 px-6 gap-2.5',
  };

  // Variant classes
  const variantClasses = {
    primary: isDisabled ? 'bg-gray-400' : 'bg-[#5B55F6] active:bg-[#7C3AED]',
    secondary: isDisabled ? 'bg-gray-100' : 'bg-[#EDE9FE] active:bg-[#DDD6FE]',
    outline: isDisabled
      ? 'bg-transparent border-2 border-gray-300'
      : 'bg-transparent border-2 border-gray-600 active:bg-[#A78BFA]',
    ghost: isDisabled ? 'bg-transparent' : 'bg-transparent active:bg-[#A78BFA]',
  };

  // Text classes
  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const textColorClasses = {
    primary: isDisabled ? 'text-gray-600' : 'text-white',
    secondary: isDisabled ? 'text-gray-400' : 'text-[#7C3AED]',
    outline: isDisabled ? 'text-gray-400' : 'text-gray-400',
    ghost: isDisabled ? 'text-gray-400' : 'text-[#5B55F6]',
  };

  const buttonClasses =
    `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${fullWidth ? 'w-full' : ''} ${className || ''}`.trim();
  const textClasses =
    `${textSizeClasses[size]} ${textColorClasses[variant]} font-semibold tracking-wide`.trim();

  return (
    <TouchableOpacity
      {...props}
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.7}
      className={buttonClasses}
    >
      {loading && showLoadingIndicator ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : '#C4B5FD'} />
      ) : (
        <View className="flex-row items-center justify-center">
          {icon && <View className="mr-2">{icon}</View>}
          <Text className={textClasses}>{children}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
