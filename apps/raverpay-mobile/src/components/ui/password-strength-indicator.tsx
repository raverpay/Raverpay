import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from './Text';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

export interface PasswordRequirement {
  label: string;
  met: boolean;
  test: (password: string) => boolean;
}

export const PASSWORD_REQUIREMENTS: Omit<PasswordRequirement, 'met'>[] = [
  {
    label: 'At least 8 characters',
    test: (pwd) => pwd.length >= 8,
  },
  {
    label: 'One uppercase letter',
    test: (pwd) => /[A-Z]/.test(pwd),
  },
  {
    label: 'One lowercase letter',
    test: (pwd) => /[a-z]/.test(pwd),
  },
  {
    label: 'One number',
    test: (pwd) => /[0-9]/.test(pwd),
  },
  {
    label: 'One special character',
    test: (pwd) => /[^A-Za-z0-9]/.test(pwd),
  },
];

export type PasswordStrength = 'weak' | 'medium' | 'strong';

export function calculatePasswordStrength(password: string): {
  strength: PasswordStrength;
  score: number;
  requirements: PasswordRequirement[];
} {
  if (!password) {
    return {
      strength: 'weak',
      score: 0,
      requirements: PASSWORD_REQUIREMENTS.map((req) => ({
        ...req,
        met: false,
      })),
    };
  }

  const requirements = PASSWORD_REQUIREMENTS.map((req) => ({
    ...req,
    met: req.test(password),
  }));

  const metCount = requirements.filter((req) => req.met).length;
  const score = (metCount / requirements.length) * 100;

  let strength: PasswordStrength = 'weak';
  if (score >= 80) {
    strength = 'strong';
  } else if (score >= 40) {
    strength = 'medium';
  }

  return { strength, score, requirements };
}

const strengthConfig = {
  weak: {
    label: 'Weak',
    color: '#EF4444',
    bgColor: 'bg-red-100',
    textColor: 'text-red-600',
  },
  medium: {
    label: 'Medium',
    color: '#F59E0B',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-600',
  },
  strong: {
    label: 'Strong',
    color: '#10B981',
    bgColor: 'bg-green-100',
    textColor: 'text-green-600',
  },
};

export function PasswordStrengthIndicator({
  password,
  showRequirements = true,
}: PasswordStrengthIndicatorProps) {
  const { strength, score, requirements } = useMemo(
    () => calculatePasswordStrength(password),
    [password],
  );

  const config = strengthConfig[strength];

  if (!password) {
    return null;
  }

  return (
    <View className="mt-3">
      {/* Strength Bar */}
      <View className="mb-2">
        <View className="flex-row justify-between items-center mb-1.5">
          <Text variant="caption" className="text-gray-600">
            Password Strength
          </Text>
          <Text variant="caption" className={`font-semibold ${config.textColor}`}>
            {config.label}
          </Text>
        </View>
        <View className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
          <View
            className="h-full rounded-full transition-all"
            style={{
              width: `${score}%`,
              backgroundColor: config.color,
            }}
          />
        </View>
      </View>

      {/* Requirements Checklist */}
      {showRequirements && (
        <View className="mt-3 space-y-1.5">
          {requirements.map((req, index) => (
            <View key={index} className="flex-row items-center">
              <Ionicons
                name={req.met ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={req.met ? '#10B981' : '#D1D5DB'}
              />
              <Text
                variant="caption"
                className={`ml-2 ${req.met ? 'text-green-600' : 'text-gray-500'}`}
              >
                {req.label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// Export utility function for validation
export function isPasswordStrong(password: string): boolean {
  const { strength } = calculatePasswordStrength(password);
  return strength === 'strong';
}

export function validatePasswordRequirements(password: string): boolean {
  const { requirements } = calculatePasswordStrength(password);
  return requirements.every((req) => req.met);
}
