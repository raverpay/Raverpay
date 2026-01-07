// app/(auth)/login.tsx
import { SentryErrorBoundary } from "@/src/components/SentryErrorBoundary";
import { Button, Input, Text } from "@/src/components/ui";
import { useAuth } from "@/src/hooks/useAuth";
import { useBiometricAuth } from "@/src/hooks/useBiometricAuth";
import { useTheme } from "@/src/hooks/useTheme";
import { getDeviceFingerprint } from "@/src/lib/device-fingerprint";
import { errorLogger } from "@/src/lib/utils/error-logger";
import { toast } from "@/src/lib/utils/toast";
import { emailSchema, passwordSchema } from "@/src/lib/utils/validators";
import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { z } from "zod";

import { useUserStore } from "@/src/store/user.store";

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  return (
    <SentryErrorBoundary>
      <LoginContent />
    </SentryErrorBoundary>
  );
}

function LoginContent() {
  const { isDark } = useTheme();
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [hasPasswordInput, setHasPasswordInput] = useState(false);
  const { login, isLoggingIn } = useAuth();
  const { user } = useUserStore();
  const {
    isBiometricAvailable,
    isBiometricEnabled,
    biometricType,
    savedEmail,
    enableBiometric,
    authenticateWithBiometric,
  } = useBiometricAuth();

  // console.log("[LoginScreen] 🎬 Rendering with state:", {
  //   userFirstName: user?.firstName || "none",
  //   isLoggingIn,
  //   isBiometricAvailable,
  //   isBiometricEnabled,
  //   biometricType,
  //   hasSavedEmail: !!savedEmail,
  // });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Watch password field to track if user has entered anything
  const password = watch("password");

  useEffect(() => {
    setHasPasswordInput(password.length > 0);
  }, [password]);

  // Auto-fill email if biometric is enabled
  useEffect(() => {
    if (savedEmail) {
      console.log(
        "[LoginScreen] 📧 Auto-filling email from biometric:",
        savedEmail
      );
      setValue("email", savedEmail);
    }
  }, [savedEmail, setValue]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      console.log("[LoginScreen] 🔐 Submitting login form:", {
        email: data.email,
      });
      // Get device fingerprint
      const deviceInfo = await getDeviceFingerprint();
      console.log(
        "[LoginScreen] 📱 Device fingerprint obtained:",
        deviceInfo.deviceId
      );

      // Transform email to identifier for API and include device info
      const response = await login({
        identifier: data.email,
        password: data.password,
        deviceInfo,
      });
      console.log("[LoginScreen] ✅ Login API call completed");

      // Check if device verification is required
      // if (response?.requiresDeviceVerification) {
      //   console.log('[LoginScreen] 🔐 Device verification required - navigating to verify-device');
      //   // Navigate to device verification screen
      //   router.push({
      //     pathname: '/(auth)/verify-device',
      //     params: {
      //       deviceId: response.deviceId || deviceInfo.deviceId,
      //       userId: response.user.id,
      //       message:
      //         response.message ||
      //         'Please verify your device with the OTP sent to your email/phone.',
      //     },
      //   });
      //   return;
      // }

      // Enable biometric automatically on first successful login if available
      if (isBiometricAvailable && !isBiometricEnabled) {
        console.log("[LoginScreen] 👆 Attempting to enable biometric auth");
        try {
          await enableBiometric(data.email, data.password);
          console.log("[LoginScreen] ✅ Biometric auth enabled successfully");
          toast.auth.biometricEnabled();
        } catch (error) {
          // Silently fail - biometric is optional
          console.log(
            "[LoginScreen] ⚠️ Failed to enable biometric (non-critical)"
          );
          errorLogger.warn("Failed to enable biometric", { error });
        }
      }

      console.log(
        "[LoginScreen] 🎯 Login successful - navigating based on verification status"
      );

      // Navigate based on verification status
      if (!response.user.emailVerified) {
        console.log(
          "[LoginScreen] 📧 Email not verified - redirecting to verify-email"
        );
        router.replace("/(auth)/verify-email");
      } else {
        console.log(
          "[LoginScreen] ✅ All verifications complete - redirecting to tabs"
        );
        router.replace("/(tabs)");
      }
    } catch (error: any) {
      // Handle locked account error specially
      if (
        error?.message?.includes("locked") ||
        error?.message?.includes("Locked")
      ) {
        toast.error({
          title: "Account Locked",
          message:
            error.message ||
            "Your account is temporarily locked due to multiple failed login attempts.",
        });
      }
      // Other errors are already logged and toasted in useAuth hook
    }
  };

  const handleBiometricLogin = async () => {
    try {
      console.log("[LoginScreen] 👆 Biometric login initiated");
      setIsBiometricLoading(true);

      const result = await authenticateWithBiometric();
      console.log("[LoginScreen] 👆 Biometric result:", {
        success: result.success,
        hasEmail: !!result.email,
      });

      if (result.success && result.email && result.password) {
        console.log(
          "[LoginScreen] ✅ Biometric auth successful - logging in with saved credentials"
        );
        // Auto-login with saved credentials
        const response = await login({
          identifier: result.email,
          password: result.password,
        });

        // Navigate based on verification status
        if (response?.requiresDeviceVerification) {
          console.log("[LoginScreen] 🔐 Device verification required");
          // Device verification navigation will be handled above
          return;
        }

        if (!response?.user.emailVerified) {
          console.log(
            "[LoginScreen] 📧 Email not verified - redirecting to verify-email"
          );
          router.replace("/(auth)/verify-email");
        } else {
          console.log(
            "[LoginScreen] ✅ All verifications complete - redirecting to tabs"
          );
          router.replace("/(tabs)");
        }
      } else {
        console.log("[LoginScreen] ❌ Biometric auth failed:", result.error);
        toast.error({
          title: "Authentication Failed",
          message: result.error || "Please try again with your password",
        });
      }
    } catch (error) {
      console.log("[LoginScreen] ❌ Biometric error:", error);
      errorLogger.logAuthError(error as Error, "biometric_login");
      toast.error({
        title: "Biometric Error",
        message: "Failed to authenticate. Please use your password.",
      });
    } finally {
      setIsBiometricLoading(false);
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
          {/* <TouchableOpacity
            onPress={() => router.back()}
            className="mb-6 w-10 h-10 rounded-full bg-white dark:bg-gray-800 items-center justify-center"
          >
            <Text>←</Text>
          </TouchableOpacity> */}

          <Text variant="h3" className="mb-2 mt-12">
            {user?.firstName
              ? `Welcome back, ${user.firstName}!`
              : "Welcome Back"}
          </Text>
          {/* {user?.firstName && (
            <TouchableOpacity
              onPress={() => {
                console.log(
                  "[LoginScreen] 🔄 Switch account pressed - navigating to welcome"
                );
                router.push("/(auth)/welcome");
              }}
              className="mb-2"
            >
              <Text
                variant="caption"
                className="text-[#5B55F6] dark:text-purple-400"
              >
                Not {user.firstName}? Switch account
              </Text>
            </TouchableOpacity>
          )} */}
          <Text variant="body" color="secondary">
            Sign in to continue to your account
          </Text>
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

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="Enter your password"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                leftIcon="lock-closed-outline"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                required
              />
            )}
          />

          <TouchableOpacity
            onPress={() => router.push("/(auth)/forgot-password")}
            className="self-end"
          >
            <Text
              variant="bodyMedium"
              className="text-[#5B55F6] dark:text-[#5B55F6]"
            >
              Forgot Password?
            </Text>
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoggingIn}
          disabled={isBiometricLoading}
          onPress={handleSubmit(onSubmit)}
          className="mb-6"
        >
          Sign In
        </Button>

        {/* Biometric Login - Only show if available and enabled */}
        {isBiometricAvailable && isBiometricEnabled && (
          <>
            {/* <View className="flex-row items-center mb-6">
              <View className="flex-1 h-[1px] bg-gray-300" />
              <Text variant="caption" color="secondary" className="mx-4">
                OR
              </Text>
              <View className="flex-1 h-[1px] bg-gray-300" />
            </View> */}

            <Button
              variant="ghost"
              size="lg"
              fullWidth
              loading={isBiometricLoading}
              disabled={hasPasswordInput || isLoggingIn}
              onPress={handleBiometricLogin}
              className="mb-8"
              showLoadingIndicator={false}
            >
              {biometricType === "Face ID" ? (
                // <Ionicons
                //   name="  ios-face-id"
                //   size={24}
                //   color={
                //     hasPasswordInput || isLoggingIn ? "#9CA3AF" : "#C4B5FD"
                //   }
                // />
                <MaterialCommunityIcons
                  name="face-recognition"
                  size={24}
                  color={
                    hasPasswordInput || isLoggingIn ? "#9CA3AF" : "#5B55F6"
                  }
                />
              ) : (
                <Ionicons
                  name="finger-print"
                  size={24}
                  color={
                    hasPasswordInput || isLoggingIn ? "#9CA3AF" : "#C4B5FD"
                  }
                />
              )}

              {/* {biometricType === "Face ID" ? "Face ID" : "Fingerprint"} */}
            </Button>
          </>
        )}

        {/* Footer */}
        <View className="flex-row justify-center items-center">
          <Text variant="body" color="secondary">
            Don&apos;t have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
            <Text
              variant="bodyMedium"
              className="text-[#5B55F6] dark:text-[#5B55F6]"
            >
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
