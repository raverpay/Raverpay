// app/(auth)/reset-password.tsx
import { Button, Input, Text } from '@/src/components/ui';
import { usePasswordReset } from '@/src/hooks/usePasswordReset';
import { useTheme } from '@/src/hooks/useTheme';
import { getPasswordStrength, passwordSchema } from '@/src/lib/utils/validators';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { z } from 'zod';

const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordScreen() {
  const { isDark } = useTheme();
  const { resetToken } = useLocalSearchParams<{ resetToken: string }>();
  const { resetPassword, isResettingPassword } = usePasswordReset();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');
  const passwordStrength = getPasswordStrength(password);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!resetToken) {
      console.error('Reset token is missing');
      return;
    }

    try {
      await resetPassword({
        resetToken,
        newPassword: data.password,
      });
      // After successful reset, redirect to login
      router.replace('/(auth)/login');
    } catch {
      // Error is already logged and toasted in usePasswordReset hook
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50 dark:bg-gray-900"
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-5"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 200 }}
      >
        {/* Header */}
        <View className="mt-16 mb-8">
          <View className=" mb-6">
            <View className="w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-900/30 items-center justify-center mb-4">
              <Text variant="h1" className="text-[#5B55F6]">
                🔐
              </Text>
            </View>

            <Text variant="h2" align="left" className="mb-2">
              Reset Password
            </Text>
            <Text variant="body" color="secondary" align="left">
              Enter your new password below
            </Text>
          </View>
        </View>

        {/* Form */}
        <View className="gap-4 mb-6">
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <Input
                  label="New Password"
                  placeholder="Create a new password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                  leftIcon="lock-closed-outline"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  required
                />
                {value.length > 0 && (
                  <View className="mt-2">
                    <Text variant="caption" color="secondary" className="mb-1">
                      Password Strength: {passwordStrength.level}
                    </Text>
                    <View className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <View
                        className={`h-full ${
                          passwordStrength.level === 'Weak'
                            ? 'bg-red-500 w-1/3'
                            : passwordStrength.level === 'Medium'
                              ? 'bg-yellow-500 w-2/3'
                              : 'bg-green-500 w-full'
                        }`}
                      />
                    </View>
                  </View>
                )}
              </View>
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Confirm New Password"
                placeholder="Re-enter your new password"
                secureTextEntry
                autoCapitalize="none"
                leftIcon="lock-closed-outline"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirmPassword?.message}
                required
              />
            )}
          />
        </View>

        {/* Submit Button */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={isResettingPassword}
          onPress={handleSubmit(onSubmit)}
          className="mb-6"
        >
          Reset Password
        </Button>

        {/* Info */}
        <View className="bg-[#EDE9FE] dark:bg-purple-900/20 p-4 rounded-xl">
          <Text variant="caption" color="secondary">
            Your password must be at least 8 characters long and include uppercase letters,
            lowercase letters, numbers, and special characters.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
