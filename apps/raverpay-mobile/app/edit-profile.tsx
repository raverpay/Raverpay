// app/edit-profile.tsx
import { Button, Card, Input, ScreenHeader, Text } from '@/src/components/ui';
import { apiClient } from '@/src/lib/api/client';
import { API_ENDPOINTS } from '@/src/lib/api/endpoints';
import { useUserStore } from '@/src/store/user.store';
import { Gender } from '@/src/types/api.types';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';

import { useTheme } from '@/src/hooks/useTheme';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';

export default function EditProfileScreen() {
  const { isDark } = useTheme();
  const { user, updateUser } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Form state
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(
    user?.dateOfBirth ? new Date(user.dateOfBirth) : undefined,
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState<Gender | undefined>(user?.gender as Gender);
  const [address, setAddress] = useState(user?.address || '');
  const [city, setCity] = useState(user?.city || '');
  const [state, setState] = useState(user?.state || '');
  const [tempAvatar, setTempAvatar] = useState<string | null>(null);

  const handlePickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera roll permissions to upload a profile picture.',
      );
      return;
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setTempAvatar(result.assets[0].uri);
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera permissions to take a profile picture.',
      );
      return;
    }

    // Take photo
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setTempAvatar(result.assets[0].uri);
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    try {
      setUploadingAvatar(true);

      // Create form data
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri,
        name: filename,
        type,
      } as any);

      // Upload to backend
      const response = await apiClient.post<{ avatarUrl: string }>(
        API_ENDPOINTS.USERS.UPLOAD_AVATAR,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      // Update user store
      updateUser({ avatar: response.data.avatarUrl });

      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error: any) {
      Alert.alert(
        'Upload Failed',
        error?.response?.data?.message || 'Failed to upload profile picture',
      );
      setTempAvatar(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    Alert.alert('Remove Profile Picture', 'Are you sure you want to remove your profile picture?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            setUploadingAvatar(true);
            await apiClient.delete(API_ENDPOINTS.USERS.DELETE_AVATAR);
            updateUser({ avatar: undefined });
            setTempAvatar(null);
            Alert.alert('Success', 'Profile picture removed successfully!');
          } catch (error: any) {
            Alert.alert(
              'Error',
              error?.response?.data?.message || 'Failed to remove profile picture',
            );
          } finally {
            setUploadingAvatar(false);
          }
        },
      },
    ]);
  };

  const handleImageOptions = () => {
    Alert.alert('Profile Picture', 'Choose an option', [
      { text: 'Take Photo', onPress: handleTakePhoto },
      { text: 'Choose from Library', onPress: handlePickImage },
      ...(user?.avatar || tempAvatar
        ? [
            {
              text: 'Remove Photo',
              onPress: handleRemoveAvatar,
              style: 'destructive' as const,
            },
          ]
        : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const handleSave = async () => {
    // Check if profile was already edited
    if (user?.profileEditedOnce) {
      Alert.alert(
        'Profile Already Edited',
        'You have already edited your profile once. Please contact support if you need to make changes.',
        [{ text: 'OK' }],
      );
      return;
    }

    // Show confirmation modal before first edit
    Alert.alert(
      '⚠️ Important Warning',
      'You can only edit your profile information ONCE.\n\nPlease make sure all the information you provided is accurate and correct.\n\nThis cannot be undone without contacting support.\n\nAre you sure you want to proceed?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes, I Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

              const updateData: any = {
                dateOfBirth: dateOfBirth?.toISOString(),
                gender,
                address: address.trim() || undefined,
                city: city.trim() || undefined,
                state: state.trim() || undefined,
              };

              const response = await apiClient.put(API_ENDPOINTS.USERS.PROFILE, updateData);

              updateUser(response.data);

              Alert.alert('Success', 'Profile updated successfully!', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error: any) {
              Alert.alert(
                'Update Failed',
                error?.response?.data?.message || 'Failed to update profile',
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const displayAvatar = tempAvatar || user?.avatar;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50 dark:bg-gray-900"
    >
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <StatusBar style={isDark ? 'light' : 'dark'} />

        {/* Header */}
        <ScreenHeader title="Edit Profile" />

        <ScrollView
          className="flex-1 px-5 pt-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 200 }}
        >
          {/* Profile Picture */}
          <View className="items-center mb-6">
            <Pressable
              onPress={handleImageOptions}
              disabled={uploadingAvatar || user?.profileEditedOnce}
              className="relative"
            >
              {displayAvatar ? (
                <Image
                  source={{ uri: displayAvatar }}
                  className="w-32 h-32 rounded-full bg-gray-200"
                />
              ) : (
                <View className="w-32 h-32 rounded-full bg-purple-100 dark:bg-purple-900/30 items-center justify-center">
                  <Text variant="h1" className="text-[#5B55F6] text-4xl">
                    {user?.firstName?.charAt(0) || 'U'}
                  </Text>
                </View>
              )}
              <View className="absolute bottom-0 right-0 bg-[#5B55F6] rounded-full p-2 border-4 border-white">
                {uploadingAvatar ? (
                  <Ionicons name="hourglass" size={20} color="white" />
                ) : (
                  <Ionicons name="camera" size={20} color="white" />
                )}
              </View>
            </Pressable>
            <Text variant="caption" color="secondary" className="mt-2">
              Tap to change profile picture
            </Text>
          </View>

          {/* Warning Banner for One-Time Edit */}
          {user?.profileEditedOnce ? (
            <Card variant="elevated" className="p-4 mb-4 bg-red-50 border-2 border-red-200">
              <View className="flex-row items-start">
                <Ionicons name="lock-closed" size={20} color="#EF4444" className="mr-2" />
                <View className="flex-1">
                  <Text variant="body" className="text-red-800 font-semibold mb-1">
                    Profile Locked
                  </Text>
                  <Text variant="caption" className="text-red-700">
                    You have already edited your profile once. All fields are now locked. Please
                    contact support if you need to make changes.
                  </Text>
                </View>
              </View>
            </Card>
          ) : (
            <Card variant="elevated" className="p-4 mb-4 bg-amber-50 border-2 border-amber-300">
              <View className="flex-row items-start">
                <Ionicons name="warning" size={20} color="#F59E0B" className="mr-2" />
                <View className="flex-1">
                  <Text variant="body" className="text-amber-800 font-semibold mb-1">
                    One-Time Edit Only
                  </Text>
                  <Text variant="caption" className="text-amber-700">
                    You can only edit your profile information once. Make sure all details are
                    correct before saving.
                  </Text>
                </View>
              </View>
            </Card>
          )}

          <Card variant="elevated" className="p-5 mb-6">
            {/* Read-only fields */}
            <View className="mb-4">
              <Text variant="caption" className="text-gray-600 mb-1">
                First Name
              </Text>
              <View className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                <Text variant="bodyMedium" className="text-gray-500" weight="semibold">
                  {user?.firstName}
                </Text>
              </View>
              <Text variant="caption" className="text-gray-500 mt-1">
                Cannot be changed
              </Text>
            </View>

            <View className="mb-4">
              <Text variant="caption" className="text-gray-600 mb-1">
                Last Name
              </Text>
              <View className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                <Text variant="bodyMedium" className="text-gray-500" weight="semibold">
                  {user?.lastName}
                </Text>
              </View>
              <Text variant="caption" className="text-gray-500 mt-1">
                Cannot be changed
              </Text>
            </View>

            <View className="mb-4">
              <Text variant="caption" className="text-gray-600 mb-1">
                Email
              </Text>
              <View className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg flex-row items-center">
                <Text variant="bodyMedium" className="text-gray-500 flex-1" weight="semibold">
                  {user?.email}
                </Text>
                {user?.emailVerified && (
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                )}
              </View>
            </View>

            <View className="mb-4">
              <Text variant="caption" className="text-gray-600 mb-1">
                Phone
              </Text>
              <View className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg flex-row items-center">
                <Text variant="bodyMedium" className="text-gray-500 flex-1" weight="semibold">
                  {user?.phone}
                </Text>
                {user?.phoneVerified && (
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                )}
              </View>
            </View>

            {/* Editable fields */}
            <View className="mb-4">
              <Text variant="caption" className="text-gray-600 dark:text-gray-400 mb-1">
                Date of Birth
              </Text>
              <Pressable
                onPress={() => setShowDatePicker(!showDatePicker)}
                disabled={user?.profileEditedOnce}
                className={`border rounded-lg p-3 ${
                  user?.profileEditedOnce
                    ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                }`}
              >
                <Text
                  variant="caption"
                  className={
                    dateOfBirth
                      ? user?.profileEditedOnce
                        ? 'text-gray-500 dark:text-gray-400'
                        : 'text-gray-900 dark:text-gray-100'
                      : 'text-gray-400 dark:text-gray-500'
                  }
                >
                  {dateOfBirth ? dateOfBirth.toLocaleDateString() : 'Select date of birth'}
                </Text>
              </Pressable>
            </View>

            <View className="">
              {showDatePicker && !user?.profileEditedOnce && (
                <DateTimePicker
                  value={dateOfBirth || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  themeVariant="light"
                />
              )}
            </View>

            <View className="mb-4">
              <Text variant="caption" className="text-gray-600 dark:text-gray-400 mb-1">
                Gender
              </Text>
              <View className="flex-row gap-2">
                {(['MALE', 'FEMALE', 'OTHER'] as Gender[]).map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => setGender(g)}
                    disabled={user?.profileEditedOnce}
                    className={`flex-1 p-3 rounded-lg border ${
                      gender === g
                        ? user?.profileEditedOnce
                          ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                          : 'bg-purple-50 dark:bg-purple-900/30 border-[#5B55F6] dark:border-[#5B55F6]'
                        : user?.profileEditedOnce
                          ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <Text
                      variant="caption"
                      className={`text-center ${
                        user?.profileEditedOnce
                          ? 'text-gray-500 dark:text-gray-400'
                          : gender === g
                            ? 'text-[#5B55F6] dark:text-purple-400 font-semibold'
                            : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {g.charAt(0) + g.slice(1).toLowerCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Input
              label="Address"
              value={address}
              onChangeText={setAddress}
              placeholder="Enter your address"
              multiline
              numberOfLines={2}
              editable={!user?.profileEditedOnce}
            />

            <Input
              label="City"
              value={city}
              onChangeText={setCity}
              placeholder="Enter your city"
              editable={!user?.profileEditedOnce}
            />

            <Input
              label="State"
              value={state}
              onChangeText={setState}
              placeholder="Enter your state"
              editable={!user?.profileEditedOnce}
            />
          </Card>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleSave}
            loading={loading}
            disabled={uploadingAvatar || user?.profileEditedOnce}
            className="mb-8"
          >
            {user?.profileEditedOnce ? 'Profile Locked' : 'Save Changes'}
          </Button>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
