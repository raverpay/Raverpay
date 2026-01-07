// app/(auth)/forgot-password.tsx
import { Button, Input, Text } from "@/src/components/ui";
import { usePasswordReset } from "@/src/hooks/usePasswordReset";
import { useTheme } from "@/src/hooks/useTheme";
import { emailSchema } from "@/src/lib/utils/validators";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const { isDark } = useTheme();
  const { forgotPassword, isRequestingReset } = usePasswordReset();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await forgotPassword(data);
      // Navigate to verify code screen
      router.push({
        pathname: "/(auth)/verify-reset-code",
        params: { email: data.email },
      });
    } catch {
      // Error is already logged and toasted in usePasswordReset hook
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50 dark:bg-gray-900"
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-5"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 200 }}
      >
        {/* Header */}
        <View className="mt-16 mb-8">
          <View className=" mb-6 mt-12">
            <Text variant="h3" align="left" className="mb-2">
              Forgot Password?
            </Text>
            <Text variant="body" color="secondary" align="left">
              Enter your email and we&apos;ll send you a reset code.
            </Text>
          </View>
        </View>

        {/* Form */}
        <View className="gap-4 mb-6">
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email Address"
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                leftIcon="mail-outline"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
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
          loading={isRequestingReset}
          onPress={handleSubmit(onSubmit)}
          className="mb-6"
        >
          Send Reset Code
        </Button>

        {/* Footer */}
        <View className="flex-row justify-center items-center">
          <Text variant="body" color="secondary">
            Remember your password?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text variant="bodyMedium" className="text-[#5B55F6]">
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
