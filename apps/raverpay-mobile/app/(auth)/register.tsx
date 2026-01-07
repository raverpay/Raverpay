// app/(auth)/register.tsx
import { Button, Input, Text } from "@/src/components/ui";
import { useAuth } from "@/src/hooks/useAuth";
import { useTheme } from "@/src/hooks/useTheme";
import {
  emailSchema,
  getPasswordStrength,
  passwordSchema,
  phoneSchema,
} from "@/src/lib/utils/validators";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { z } from "zod";

const registerSchema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

type Step = 1 | 2 | 3;

export default function RegisterScreen() {
  const { isDark } = useTheme();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const { register, isRegistering } = useAuth();

  const {
    control,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password");
  const passwordStrength = getPasswordStrength(password);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const { confirmPassword, ...registerData } = data;
      await register(registerData);
      // After successful registration, redirect to email verification
      // Using replace() to prevent back navigation to registration form
      router.replace("/(auth)/verify-email");
    } catch {
      // Error is already logged in useAuth hook
      // No additional logging needed here
    }
  };

  const handleNext = async () => {
    let fieldsToValidate: (keyof RegisterFormData)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = ["firstName", "lastName"];
    } else if (currentStep === 2) {
      fieldsToValidate = ["email", "phone"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    } else {
      router.back();
    }
  };

  const getStepIndicatorColor = (step: Step) => {
    if (step < currentStep) return "bg-[#5B55F6]";
    if (step === currentStep) return "bg-[#5B55F6]";
    return "bg-gray-300 dark:bg-gray-700";
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
          <TouchableOpacity
            onPress={handleBack}
            className="mb-6 w-10 h-10 rounded-full bg-white dark:bg-gray-800 items-center justify-center"
          >
            <Text>←</Text>
          </TouchableOpacity>

          <Text variant="h3" className="mb-2">
            Create Account
          </Text>
          <Text variant="body" color="secondary">
            Step {currentStep} of 3
          </Text>
        </View>

        {/* Step Indicator */}
        <View className="flex-row gap-2 mb-8">
          {[1, 2, 3].map((step) => (
            <View
              key={step}
              className={`flex-1 h-1 rounded-full ${getStepIndicatorColor(step as Step)}`}
            />
          ))}
        </View>

        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <View className="gap-4 mb-6">
            <Text variant="h3" className="mb-2">
              Personal Information
            </Text>

            <Controller
              control={control}
              name="firstName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="First Name"
                  placeholder="Enter your first name"
                  autoCapitalize="words"
                  autoComplete="given-name"
                  leftIcon="person-outline"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.firstName?.message}
                  required
                />
              )}
            />

            <Controller
              control={control}
              name="lastName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Last Name"
                  placeholder="Enter your last name"
                  autoCapitalize="words"
                  autoComplete="family-name"
                  leftIcon="person-outline"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.lastName?.message}
                  required
                />
              )}
            />
          </View>
        )}

        {/* Step 2: Contact Information */}
        {currentStep === 2 && (
          <View className="gap-4 mb-6">
            <Text variant="h3" className="mb-2">
              Contact Information
            </Text>

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
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Phone Number"
                  placeholder="08012345678"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  leftIcon="call-outline"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.phone?.message}
                  hint="Enter your Nigerian phone number"
                  required
                />
              )}
            />
          </View>
        )}

        {/* Step 3: Security */}
        {currentStep === 3 && (
          <View className="gap-4 mb-6">
            <Text variant="h3" className="mb-2">
              Security
            </Text>

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Input
                    label="Password"
                    placeholder="Create a password"
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
                      <Text
                        variant="caption"
                        color="secondary"
                        className="mb-1"
                      >
                        Password Strength: {passwordStrength.level}
                      </Text>
                      <View className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <View
                          className={`h-full ${
                            passwordStrength.level === "Weak"
                              ? "bg-red-500 w-1/3"
                              : passwordStrength.level === "Medium"
                                ? "bg-yellow-500 w-2/3"
                                : "bg-green-500 w-full"
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
                  label="Confirm Password"
                  placeholder="Re-enter your password"
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

            <Text variant="caption" color="secondary" className="mt-2">
              By creating an account, you agree to our Terms of Service and
              Privacy Policy
            </Text>
          </View>
        )}

        {/* Navigation Buttons */}
        {currentStep < 3 ? (
          <Button variant="primary" size="lg" fullWidth onPress={handleNext}>
            Continue
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={isRegistering}
            onPress={handleSubmit(onSubmit)}
          >
            Create Account
          </Button>
        )}

        {/* Footer */}
        <View className="flex-row justify-center items-center mt-8">
          <Text variant="body" color="secondary">
            Already have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
            <Text variant="bodyMedium" className="text-[#5B55F6]">
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
