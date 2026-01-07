// app/theme-settings.tsx
import { Card, Text } from '@/src/components/ui';
import { useTheme } from '@/src/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';

export default function ThemeSettingsScreen() {
  const { mode, setThemeMode, isDark, theme } = useTheme();

  // Debug: Log current theme state
  React.useEffect(() => {
    console.log('[ThemeSettings] Current state:', {
      mode,
      theme,
      isDark,
    });
  }, [mode, theme, isDark]);

  const handleThemeChange = (newMode: 'light' | 'dark' | 'auto') => {
    console.log('[ThemeSettings] Changing theme from', mode, 'to', newMode);

    // Defer theme change to next frame to avoid navigation context issues
    requestAnimationFrame(() => {
      setThemeMode(newMode);
      console.log('[ThemeSettings] Theme change applied');
    });
  };

  const themeOptions = [
    {
      id: 'light' as const,
      title: 'Light Mode',
      description: 'Always use light theme',
      icon: 'sunny' as const,
    },
    {
      id: 'dark' as const,
      title: 'Dark Mode',
      description: 'Always use dark theme',
      icon: 'moon' as const,
    },
    {
      id: 'auto' as const,
      title: 'System Default',
      description: 'Follow system appearance',
      icon: 'phone-portrait' as const,
    },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <StatusBar style={isDark ? 'light' : 'dark'} />

        {/* Header */}
        <View className="bg-white dark:bg-gray-800 pt-12 pb-6 px-5 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center"
              >
                <Ionicons name="arrow-back" size={20} color={isDark ? '#FFFFFF' : '#111827'} />
              </TouchableOpacity>
              <View>
                <Text variant="h4" color="primary">
                  Theme Settings
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Content */}
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="p-5">
            {/* Preview Section */}

            {/* Theme Options */}
            <View className="mb-6">
              <Text variant="h6" color="primary" className="mb-3">
                Appearance
              </Text>
              <View className="gap-3">
                {themeOptions.map((option) => {
                  const isSelected = mode === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => handleThemeChange(option.id)}
                      activeOpacity={0.7}
                    >
                      <Card
                        variant={isSelected ? 'elevated' : 'outlined'}
                        className={`p-4 ${
                          isSelected ? 'border-2 border-[#5B55F6] dark:border-[#5B55F6]' : ''
                        }`}
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center flex-1">
                            <View
                              className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
                                isSelected
                                  ? 'bg-[#5B55F6] dark:bg-[#5B55F6]'
                                  : 'bg-gray-100 dark:bg-gray-700'
                              }`}
                            >
                              <Ionicons
                                name={option.icon}
                                size={24}
                                color={isSelected ? '#FFFFFF' : isDark ? '#9CA3AF' : '#6B7280'}
                              />
                            </View>
                            <View className="flex-1">
                              <Text variant="bodyMedium" color="primary" className="mb-1">
                                {option.title}
                              </Text>
                              <Text variant="caption" color="secondary">
                                {option.description}
                              </Text>
                            </View>
                          </View>
                          {isSelected && (
                            <View className="w-6 h-6 rounded-full bg-[#5B55F6] dark:bg-[#5B55F6] items-center justify-center">
                              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                            </View>
                          )}
                        </View>
                      </Card>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Debug Info - System Theme Detection */}
            {/* <Card
              variant="filled"
              className="p-4 mb-4 bg-blue-50 dark:bg-blue-900/20"
            >
              <View className="flex-row">
                <Ionicons
                  name="bug"
                  size={20}
                  color={isDark ? "#60A5FA" : "#3B82F6"}
                  style={{ marginRight: 12, marginTop: 2 }}
                />
                <View className="flex-1">
                  <Text variant="bodyMedium" color="primary" className="mb-2">
                    Debug Info
                  </Text>
                  <Text variant="caption" color="secondary" className="mb-1">
                    System Theme Detected:{" "}
                    <Text
                      variant="caption"
                      weight="bold"
                      className="text-blue-600 dark:text-blue-400"
                    >
                      {Appearance.getColorScheme() || "unknown"}
                    </Text>
                  </Text>
                  <Text variant="caption" color="secondary" className="mb-1">
                    Current Mode:{" "}
                    <Text
                      variant="caption"
                      weight="bold"
                      className="text-blue-600 dark:text-blue-400"
                    >
                      {mode}
                    </Text>
                  </Text>
                  <Text variant="caption" color="secondary">
                    Active Theme:{" "}
                    <Text
                      variant="caption"
                      weight="bold"
                      className="text-blue-600 dark:text-blue-400"
                    >
                      {theme}
                    </Text>
                  </Text>
                  {mode === "auto" && Appearance.getColorScheme() !== null && (
                    <View className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                      <Text
                        variant="caption"
                        className="text-blue-700 dark:text-blue-300"
                      >
                        💡 If system theme is wrong, check Expo Go&apos;s own
                        theme setting (shake device → Settings)
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Card> */}

            {/* Information */}
            <Card variant="filled" className="p-4 mb-6">
              <View className="flex-row">
                <Ionicons
                  name="information-circle"
                  size={20}
                  color={isDark ? '#5B55F6' : '#5B55F6'}
                  style={{ marginRight: 12, marginTop: 2 }}
                />
                <View className="flex-1">
                  <Text variant="bodyMedium" color="primary" className="mb-2">
                    About Theme Settings
                  </Text>
                  <Text variant="caption" color="secondary" className="leading-5">
                    The System Default option will automatically switch between light and dark
                    themes based on your device settings. Your preference is saved and will persist
                    across app restarts.
                  </Text>
                </View>
              </View>
            </Card>

            {/* Test Buttons */}
          </View>
        </ScrollView>
      </View>
    </>
  );
}
