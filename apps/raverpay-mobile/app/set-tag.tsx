// app/set-tag.tsx
import { Button, Card, Input, Text } from '@/src/components/ui';
import { useDebounce } from '@/src/hooks/useDebounce';
import { useP2PPermissions, useSetTag } from '@/src/hooks/useP2P';
import { lookupUserByTag } from '@/src/services/p2p.service';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';

import { useTheme } from '@/src/hooks/useTheme';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SetTagScreen() {
  const { isDark } = useTheme();
  const { userTag, remainingTagChanges } = useP2PPermissions();
  const { setTag, isSettingTag } = useSetTag();

  const [tag, setTagInput] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [error, setError] = useState('');

  const debouncedTag = useDebounce(tag.toLowerCase().trim(), 500);

  // Validate tag format
  const validateTag = (value: string): boolean => {
    if (value.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }
    if (value.length > 20) {
      setError('Username must not exceed 20 characters');
      return false;
    }
    if (!/^[a-z0-9_]+$/.test(value)) {
      setError('Only lowercase letters, numbers, and underscores allowed');
      return false;
    }
    return true;
  };

  // Check availability when user stops typing
  useEffect(() => {
    const checkAvailability = async () => {
      if (!debouncedTag || debouncedTag === userTag) {
        setIsAvailable(false);
        setError('');
        return;
      }

      if (!validateTag(debouncedTag)) {
        setIsAvailable(false);
        return;
      }

      setIsChecking(true);
      try {
        // Try to lookup the tag
        await lookupUserByTag(debouncedTag);
        // If successful, tag is taken
        setError('This username is already taken');
        setIsAvailable(false);
      } catch (err: any) {
        // 404 means tag is available
        if (err?.response?.status === 404) {
          setError('');
          setIsAvailable(true);
        } else {
          setError('Unable to check availability');
          setIsAvailable(false);
        }
      } finally {
        setIsChecking(false);
      }
    };

    checkAvailability();
  }, [debouncedTag, userTag]);

  const handleSetTag = async () => {
    if (!isAvailable || isSettingTag) return;

    try {
      await setTag(debouncedTag);
      router.back();
    } catch {
      // Error handled by hook
    }
  };

  const handleTagChange = (value: string) => {
    // Auto-convert to lowercase and remove spaces
    const cleaned = value.toLowerCase().replace(/\s/g, '');
    setTagInput(cleaned);
    setIsAvailable(false);
    setError('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50 dark:bg-gray-900"
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View className="bg-white dark:bg-gray-800 pt-12 pb-6 px-5 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4" disabled={isSettingTag}>
            <Ionicons name="arrow-back" size={24} color={isSettingTag ? '#9CA3AF' : '#111827'} />
          </TouchableOpacity>
          <Text variant="h3">{userTag ? 'Change Username' : 'Set Username'}</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 200 }}
      >
        {/* Current Tag (if exists) */}
        {userTag && (
          <Card variant="elevated" className="p-5 mb-4">
            <Text variant="caption" color="secondary" className="mb-1">
              Current Username
            </Text>
            <Text variant="h3" className="text-[#5B55F6]">
              @{userTag}
            </Text>
          </Card>
        )}

        {/* Input Section */}
        <Card variant="elevated" className="p-5 mb-4">
          <Text variant="h4" className="mb-4">
            Choose Your Username
          </Text>

          <View className=" mb-3">
            <View className="flex-row items-center justify-between">
              <View className="w-[95%]">
                <Input
                  value={tag}
                  onChangeText={handleTagChange}
                  placeholder="username"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                  className="flex-1 ml-2 bg-transparent border-0 h-full"
                  editable={!isSettingTag}
                />
              </View>
              {isChecking && <ActivityIndicator size="small" color="#5B55F6" />}
            </View>

            {/* {isAvailable && !isChecking && (
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            )} */}
          </View>

          {/* Validation/Status Messages */}
          {error && (
            <View className="flex-row items-start mb-3">
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text variant="caption" className="text-red-500 ml-2 flex-1">
                {error}
              </Text>
            </View>
          )}

          {isAvailable && (
            <View className="flex-row items-start mb-3">
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text variant="caption" className="text-green-600 ml-2 flex-1">
                Available! This username is yours.
              </Text>
            </View>
          )}

          <Text variant="caption" color="secondary" className="mb-2">
            • 3-20 characters
          </Text>
          <Text variant="caption" color="secondary" className="mb-2">
            • Lowercase letters, numbers, and underscores only
          </Text>
          <Text variant="caption" color="secondary">
            • Cannot be changed once others start sending you money
          </Text>
        </Card>

        {/* Remaining Changes Warning */}
        {userTag && remainingTagChanges <= 1 && (
          <Card variant="elevated" className="p-4 mb-4 bg-amber-50 border border-amber-200">
            <View className="flex-row items-start">
              <Ionicons name="warning-outline" size={20} color="#F59E0B" />
              <View className="ml-3 flex-1">
                <Text variant="bodyMedium" className="text-amber-800 mb-1">
                  Limited Changes Remaining
                </Text>
                <Text variant="caption" className="text-amber-700">
                  You can only change your username {remainingTagChanges} more{' '}
                  {remainingTagChanges === 1 ? 'time' : 'times'}. Choose carefully!
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Benefits Card */}
        <Card variant="elevated" className="p-5 mb-4 bg-purple-50 dark:bg-purple-900/20">
          <View className="flex-row items-start mb-3">
            <Ionicons name="information-circle-outline" size={20} color="#5B55F6" />
            <Text variant="bodyMedium" className="ml-3 flex-1 text-purple-800">
              Why set a username?
            </Text>
          </View>
          <View className="ml-7 space-y-2">
            <Text variant="caption" className="text-purple-700 mb-2">
              • Receive money instantly from other users
            </Text>
            <Text variant="caption" className="text-purple-700 mb-2">
              • No need to share account numbers
            </Text>
            <Text variant="caption" className="text-purple-700">
              • Easy to remember and share
            </Text>
          </View>
        </Card>

        {/* Set Button */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleSetTag}
          disabled={!isAvailable || isSettingTag || isChecking}
          loading={isSettingTag}
        >
          {userTag ? 'Update Username' : 'Set Username'}
        </Button>

        <View className="h-8" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
