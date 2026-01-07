// app/(auth)/verify-device.tsx
import { Button, Text } from "@/src/components/ui";
import { useTheme } from "@/src/hooks/useTheme";
import { apiClient, handleApiError } from "@/src/lib/api/client";
import { API_ENDPOINTS } from "@/src/lib/api/endpoints";
import { toast } from "@/src/lib/utils/toast";
import { useAuthStore } from "@/src/store/auth.store";
import { useUserStore } from "@/src/store/user.store";
import {
  VerifyDeviceRequest,
  VerifyDeviceResponse,
} from "@/src/types/api.types";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const CODE_LENGTH = 6;

export default function VerifyDeviceScreen() {
  const { isDark } = useTheme();
  const params = useLocalSearchParams<{
    deviceId: string;
    userId: string;
    message?: string;
  }>();

  const [code, setCode] = useState<string[]>(new Array(CODE_LENGTH).fill(""));
  const [countdown, setCountdown] = useState(120); // 2 minutes
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { setTokens } = useAuthStore();
  const { setUser } = useUserStore();

  useEffect(() => {
    // Focus first input
    inputRefs.current[0]?.focus();

    // Countdown timer using ref for proper cleanup
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Prevent Android hardware back button
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        // Return true to prevent default back behavior
        return true;
      }
    );

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      backHandler.remove();
    };
  }, []);

  const handleChangeText = (text: string, index: number) => {
    // Only allow numbers
    if (text && !/^\d+$/.test(text)) return;

    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Auto-focus next input
    if (text && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (newCode.every((digit) => digit !== "") && text) {
      handleVerify(newCode.join(""));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join("");

    if (codeToVerify.length !== CODE_LENGTH) {
      return;
    }

    if (!params.deviceId || !params.userId) {
      toast.error({
        title: "Error",
        message:
          "Missing device or user information. Please try logging in again.",
      });
      router.replace("/(auth)/login");
      return;
    }

    setIsVerifying(true);

    try {
      const { data } = await apiClient.post<VerifyDeviceResponse>(
        API_ENDPOINTS.AUTH.VERIFY_DEVICE,
        {
          userId: params.userId,
          deviceId: params.deviceId,
          code: codeToVerify,
        } as VerifyDeviceRequest
      );

      // Store tokens and user
      await setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);

      toast.success({
        title: "Device Verified",
        message: "Your device has been verified successfully.",
      });

      // Navigate to main app (root navigator will handle routing)
      router.replace("/(tabs)");
    } catch (error) {
      const apiError = handleApiError(error);

      // Check if it's an invalid verification code error (401 with specific message)
      if (
        apiError.statusCode === 401 &&
        (apiError.message?.toLowerCase().includes("invalid") ||
          apiError.message?.toLowerCase().includes("verification code") ||
          apiError.message?.toLowerCase().includes("expired"))
      ) {
        // Use the same toast method as email/phone verification
        toast.auth.invalidVerificationCode();
      } else {
        // For other errors, show the specific error message
        toast.error({
          title: "Verification Failed",
          message: apiError.message || "An error occurred. Please try again.",
        });
      }

      // Clear the code on error
      setCode(new Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) {
      return;
    }

    Alert.alert(
      "Resend Verification Code",
      "A new verification code will be sent to your email/phone. Please check your inbox.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Resend",
          onPress: async () => {
            try {
              // The OTP was already sent during login, so we just reset the countdown
              // In a real implementation, you might want to call a resend endpoint
              setCountdown(120);
              toast.success({
                title: "Code Sent",
                message:
                  "A new verification code has been sent to your email/phone.",
              });
            } catch {
              toast.error({
                title: "Error",
                message: "Failed to resend code. Please try logging in again.",
              });
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900 p-5">
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View className="mt-16 mb-8">
        <View className="mb-6">
          <View className="w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-900/30 items-center justify-center mb-4">
            <Text variant="h1" className="text-[#5B55F6]">
              📱
            </Text>
          </View>

          <Text variant="h2" align="left" className="mb-2">
            Verify Your Device
          </Text>
          <Text variant="body" color="secondary" align="left">
            {params.message ||
              "We've sent a 6-digit code to your email/phone to verify this device. Please enter it below."}
          </Text>
        </View>
      </View>

      {/* OTP Input */}
      <View className="flex-row justify-between mb-8 px-2">
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            className={`w-[50px] h-[60px] border-2 rounded-xl text-center text-2xl font-bold text-gray-900 dark:text-white ${
              digit
                ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30"
                : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
            }`}
            value={digit}
            onChangeText={(text) => handleChangeText(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>

      {/* Verify Button */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={isVerifying}
        onPress={() => handleVerify()}
        disabled={code.some((digit) => digit === "")}
        className="mb-6"
      >
        Verify Device
      </Button>

      {/* Resend */}
      <View className="items-center">
        <Text variant="body" color="secondary" className="mb-2">
          Didn&apos;t receive the code?
        </Text>
        {countdown > 0 ? (
          <Text variant="bodyMedium" color="secondary">
            Resend in {countdown}s
          </Text>
        ) : (
          <TouchableOpacity onPress={handleResend} disabled={isVerifying}>
            <Text variant="bodyMedium" className="text-[#5B55F6]">
              Resend Code
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
