// app/(auth)/verify-email.tsx
import { Button, Text } from "@/src/components/ui";
import { useTheme } from "@/src/hooks/useTheme";
import { useVerification } from "@/src/hooks/useVerification";
import { useOtpStore } from "@/src/store/otp.store";
import { router, Stack } from "expo-router";
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

export default function VerifyEmailScreen() {
  const { isDark } = useTheme();
  const [code, setCode] = useState<string[]>(new Array(CODE_LENGTH).fill(""));
  const [countdown, setCountdown] = useState(120); // 2 minutes
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    verifyEmail,
    isVerifyingEmail,
    sendEmailVerification,
    isSendingEmail,
  } = useVerification();

  const { canSendEmailOtp, setEmailOtpSent, clearEmailOtp, emailOtp } =
    useOtpStore();

  useEffect(() => {
    // Smart send logic: only send if no recent OTP
    const sendOtpIfNeeded = async () => {
      if (canSendEmailOtp()) {
        try {
          const result = await sendEmailVerification();
          // Store the canResendAt timestamp from backend
          if (result?.canResendAt) {
            setEmailOtpSent(result.canResendAt);
          }
        } catch (error) {
          console.error("Auto-send failed:", error);
        }
      } else {
        // Calculate remaining time from stored canResendAt
        const canResendAt = emailOtp.canResendAt
          ? new Date(emailOtp.canResendAt)
          : new Date();
        const now = new Date();
        const remainingSeconds = Math.max(
          0,
          Math.ceil((canResendAt.getTime() - now.getTime()) / 1000)
        );
        setCountdown(remainingSeconds);
      }
    };

    sendOtpIfNeeded();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    try {
      await verifyEmail({ code: codeToVerify });
      // Clear OTP state on successful verification
      clearEmailOtp();
      // After successful email verification, redirect to phone verification
      // Using replace() to prevent back navigation
      // router.replace("/(auth)/verify-phone");
      router.replace("/(tabs)");
    } catch {
      // Clear the code on error
      setCode(new Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    }
  };

  const showSpamCheckDialog = () => {
    Alert.alert(
      "Check Your Spam Folder",
      "Before we resend the code, please check your spam or junk folder. Sometimes verification emails end up there.\n\nIf you've checked and still haven't received it, tap 'Resend' to get a new code.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Resend Code",
          onPress: handleResendConfirmed,
        },
      ]
    );
  };

  const handleResendConfirmed = async () => {
    if (!canSendEmailOtp()) {
      return;
    }

    try {
      // Clear old timer before creating new one
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      const result = await sendEmailVerification();

      if (result?.canResendAt) {
        setEmailOtpSent(result.canResendAt);
      }

      setCountdown(120); // Reset to 2 minutes

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
    } catch (error) {
      console.error("Resend error:", error);
      // Error toast already shown by useVerification hook
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: false, // Disable swipe back gesture
        }}
      />
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 p-5">
        <StatusBar style={isDark ? "light" : "dark"} />

        {/* Header */}
        <View className="mt-16 mb-8">
          {/* Back button removed - users cannot bypass verification */}

          <View className=" mb-6">
            <View className="w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-900/30 items-center justify-center mb-4">
              <Text variant="h1" className="text-[#5B55F6]">
                📧
              </Text>
            </View>

            <Text variant="h2" align="left" className="mb-2">
              Verify Your Email
            </Text>
            <Text variant="body" color="secondary" align="left">
              We&apos;ve sent a 6-digit code to your email.{"\n"}Please enter it
              below.
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
          loading={isVerifyingEmail}
          onPress={() => handleVerify()}
          disabled={code.some((digit) => digit === "")}
          className="mb-6"
        >
          Verify Email
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
            <TouchableOpacity
              onPress={showSpamCheckDialog}
              disabled={isSendingEmail}
            >
              <Text variant="bodyMedium" className="text-[#5B55F6]">
                {isSendingEmail ? "Sending..." : "Resend Code"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );
}
