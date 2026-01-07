// components/ui/Input.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  required = false,
  secureTextEntry,
  className,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPassword = secureTextEntry === true;

  const getBorderClass = () => {
    if (error) return 'border-red-500 dark:border-red-400';
    if (isFocused) return 'border-[#5B55F6] dark:border-[#5B55F6] border-2';
    return 'border-gray-300 dark:border-gray-700 border-[1.5px]';
  };

  const getIconColor = () => {
    if (isFocused) return '#5B55F6'; // #5B55F6
    return '#9CA3AF'; // Gray
  };

  const handleTogglePassword = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <View className="w-full mb-4">
      {label && (
        <View className="flex-row mb-2">
          <Text className="text-sm font-medium text-gray-900 dark:text-white">{label}</Text>
          {required && (
            <Text className="text-sm font-medium text-red-500 dark:text-red-400"> *</Text>
          )}
        </View>
      )}

      <View
        className={`flex-row items-center h-[52px] bg-white dark:bg-gray-800 rounded-xl px-4 ${getBorderClass()}`}
      >
        <View className="h-full justify-center">
          {leftIcon && (
            <Ionicons name={leftIcon} size={20} color={getIconColor()} className="mr-2" />
          )}
        </View>

        <View className="flex-1">
          <TextInput
            {...props}
            secureTextEntry={isPassword && !isPasswordVisible}
            className={`flex-1 text-base text-gray-900 dark:text-white font-normal py-0 ${className || ''}`}
            placeholderTextColor="#9CA3AF"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </View>

        {isPassword && (
          <TouchableOpacity
            onPress={handleTogglePassword}
            className="ml-2 p-1"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        )}

        {!isPassword && rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            className="ml-2 p-1"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={rightIcon} size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View className="flex-row items-center mt-1 gap-1">
          <Ionicons name="alert-circle" size={14} color="#EF4444" />
          <Text className="text-xs text-red-500">{error}</Text>
        </View>
      )}

      {hint && !error && <Text className="text-xs text-gray-500 mt-1">{hint}</Text>}
    </View>
  );
};
