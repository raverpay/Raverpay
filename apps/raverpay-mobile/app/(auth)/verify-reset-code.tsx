// app/(auth)/verify-reset-code.tsx
import { Button, Text } from '@/src/components/ui';
import { usePasswordReset } from '@/src/hooks/usePasswordReset';
import { useTheme } from '@/src/hooks/useTheme';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';

const CODE_LENGTH = 6;

export default function VerifyResetCodeScreen() {
  const { isDark } = useTheme();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState<string[]>(new Array(CODE_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const { verifyResetCode, isVerifyingCode, forgotPassword, isRequestingReset } =
    usePasswordReset();

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
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
    if (newCode.every((digit) => digit !== '') && text) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join('');

    if (codeToVerify.length !== CODE_LENGTH) {
      return;
    }

    if (!email) {
      console.error('Email is required for reset code verification');
      return;
    }

    try {
      // Verify code with email and get resetToken
      const response = await verifyResetCode({
        email,
        code: codeToVerify,
      });

      // After successful verification, redirect to reset password screen with resetToken
      router.push({
        pathname: '/(auth)/reset-password',
        params: { resetToken: response.resetToken },
      });
    } catch {
      // Clear the code on error
      setCode(new Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (!email) return;

    try {
      await forgotPassword({ email });
      setCountdown(60);
      // Restart countdown
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      // Error is already logged and toasted in usePasswordReset hook
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900 p-5">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View className="mt-16 mb-8">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mb-6 w-10 h-10 rounded-full bg-white dark:bg-gray-800 items-center justify-center"
        >
          <Text>←</Text>
        </TouchableOpacity>

        <View className="items-center mb-6">
          <View className="w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-900/30 items-center justify-center mb-4">
            <Text variant="h1" className="text-[#5B55F6]">
              🔑
            </Text>
          </View>

          <Text variant="h1" align="center" className="mb-2">
            Verify Reset Code
          </Text>
          <Text variant="body" color="secondary" align="center">
            We&apos;ve sent a 6-digit code to{'\n'}
            {email || 'your email'}
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
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
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
        loading={isVerifyingCode}
        onPress={() => handleVerify()}
        disabled={code.some((digit) => digit === '')}
        className="mb-6"
      >
        Verify Code
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
          <TouchableOpacity onPress={handleResend} disabled={isRequestingReset}>
            <Text variant="bodyMedium" className="text-[#5B55F6]">
              {isRequestingReset ? 'Sending...' : 'Resend Code'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
