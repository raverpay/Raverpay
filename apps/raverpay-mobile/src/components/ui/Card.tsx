// components/ui/Card.tsx
import * as Haptics from 'expo-haptics';
import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, View, ViewProps } from 'react-native';

export type CardVariant = 'elevated' | 'outlined' | 'filled' | 'primary';

interface BaseCardProps {
  variant?: CardVariant;
  children: React.ReactNode;
}

interface PressableCardProps
  extends BaseCardProps, Omit<TouchableOpacityProps, 'style' | 'className'> {
  pressable: true;
  onPress: () => void;
  className?: string;
}

interface StaticCardProps extends BaseCardProps, Omit<ViewProps, 'style' | 'className'> {
  pressable?: false;
  className?: string;
}

type CardProps = PressableCardProps | StaticCardProps;

export const Card: React.FC<CardProps> = ({
  variant = 'elevated',
  pressable = false,
  children,
  className,
  ...props
}) => {
  const baseClasses = 'rounded-2xl overflow-hidden';

  const variantClasses = {
    elevated: 'bg-white dark:bg-gray-800  border-[1.5px] border-gray-300 dark:border-gray-700',
    outlined: 'bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700',
    filled: 'bg-gray-50 dark:bg-gray-900',
    primary: 'bg-[#5B55F6] dark:bg-[#5B55F6]',
  };

  const cardClasses = `${baseClasses} ${variantClasses[variant]} ${className || ''}`.trim();

  if (pressable && 'onPress' in props) {
    const handlePress = async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      props.onPress?.();
    };

    return (
      <TouchableOpacity
        {...(props as TouchableOpacityProps)}
        onPress={handlePress}
        activeOpacity={0.7}
        className={cardClasses}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View {...(props as ViewProps)} className={cardClasses}>
      {children}
    </View>
  );
};
