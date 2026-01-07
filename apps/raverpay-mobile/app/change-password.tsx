// app/change-password.tsx

import {
  Button,
  Card,
  Input,
  PasswordStrengthIndicator,
  ScreenHeader,
  Text,
  validatePasswordRequirements,
} from '@/src/components/ui';
import { useAuth } from '@/src/hooks/useAuth';
import { useTheme } from '@/src/hooks/useTheme';
import { apiClient } from '@/src/lib/api/client';
import { API_ENDPOINTS } from '@/src/lib/api/endpoints';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

export default function ChangePasswordScreen() {
  const { isDark } = useTheme();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Show/hide password state
  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword.trim()) {
      Alert.alert('Error', 'Please enter your current password');
      return;
    }

    if (!newPassword.trim()) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }

    if (!confirmPassword.trim()) {
      Alert.alert('Error', 'Please confirm your new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword === currentPassword) {
      Alert.alert('Error', 'New password must be different from current password');
      return;
    }

    // Check password requirements
    if (!validatePasswordRequirements(newPassword)) {
      Alert.alert('Weak Password', 'Please ensure your password meets all requirements');
      return;
    }

    try {
      setLoading(true);

      await apiClient.post(API_ENDPOINTS.USERS.CHANGE_PASSWORD, {
        currentPassword,
        newPassword,
      });

      Alert.alert(
        'Password Changed',
        'Your password has been updated successfully. Please login with your new password.',
        [
          {
            text: 'OK',
            onPress: async () => {
              // Logout user
              await logout();
              // Navigate to login
              // router.replace("/(auth)/login");
            },
          },
        ],
        { cancelable: false },
      );
    } catch (error: any) {
      Alert.alert(
        'Change Password Failed',
        error?.response?.data?.message || 'Failed to change password. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <ScreenHeader title="Change Password" />

      <ScrollView
        className="flex-1 px-5 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 200 }}
      >
        <Card variant="elevated" className="p-5 mb-6">
          <Text variant="body" color="secondary" className="mb-4">
            Your new password must be different from your current password and meet all security
            requirements.
          </Text>

          {/* Current Password */}
          <View className="mb-4">
            <Text variant="bodyMedium" weight="semibold" className="text-gray-600 mb-1">
              Current Password
            </Text>
            <View className="relative">
              <Input
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                leftIcon="lock-closed-outline"
              />
            </View>
          </View>

          {/* New Password */}
          <View className="mb-4">
            <Text variant="bodyMedium" weight="semibold" className="text-gray-600 mb-1">
              New Password
            </Text>
            <View className="relative">
              <Input
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                leftIcon="lock-closed-outline"
              />
            </View>

            {/* Password Strength Indicator */}
            {newPassword.length > 0 && (
              <PasswordStrengthIndicator password={newPassword} showRequirements />
            )}
          </View>

          {/* Confirm Password */}
          <View className="mb-4">
            <Text variant="bodyMedium" weight="semibold" className="text-gray-600 mb-1">
              Confirm New Password
            </Text>
            <View className="relative">
              <Input
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                leftIcon="lock-closed-outline"
              />
            </View>
            {confirmPassword.length > 0 && confirmPassword !== newPassword && (
              <View className="flex-row items-center mt-2">
                <Ionicons name="close-circle" size={16} color="#EF4444" />
                <Text variant="caption" className="text-red-600 ml-1">
                  Passwords do not match
                </Text>
              </View>
            )}
            {confirmPassword.length > 0 && confirmPassword === newPassword && (
              <View className="flex-row items-center mt-2">
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text variant="caption" className="text-green-600 ml-1">
                  Passwords match
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Warning */}
        <Card variant="outlined" className="p-4 mb-6 border-orange-300 bg-orange-50">
          <View className="flex-row items-start">
            <Ionicons name="warning" size={20} color="#F59E0B" className="mr-2" />
            <View className="flex-1 ml-2">
              <Text variant="caption" className="text-orange-800 font-semibold mb-1">
                You will be logged out
              </Text>
              <Text variant="caption" className="text-orange-700">
                After changing your password, you will be logged out and need to login again with
                your new password.
              </Text>
            </View>
          </View>
        </Card>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleChangePassword}
          loading={loading}
          disabled={
            !currentPassword ||
            !newPassword ||
            !confirmPassword ||
            newPassword !== confirmPassword ||
            !validatePasswordRequirements(newPassword)
          }
          className="mb-8"
        >
          Change Password
        </Button>
      </ScrollView>
    </View>
  );
}
