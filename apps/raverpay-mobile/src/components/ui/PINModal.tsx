// src/components/ui/PINModal.tsx
import { Button, Text } from "@/src/components/ui";
import { biometrics } from "@/src/lib/auth/biometrics";
import { SECURE_KEYS, secureStorage } from "@/src/lib/storage/secure-store";
import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface PINModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void;
  loading?: boolean;
  title?: string;
  subtitle?: string;
  pinLength?: number; // Allow custom PIN length (default 4 for regular transactions, 6 for crypto)
}

const DEFAULT_PIN_LENGTH = 4;
const BIOMETRIC_ENABLED_KEY = "biometric_enabled";

export const PINModal: React.FC<PINModalProps> = ({
  visible,
  onClose,
  onSubmit,
  loading = false,
  title = "Enter Transaction PIN",
  subtitle = "Please enter your 4-digit PIN to confirm",
  pinLength = DEFAULT_PIN_LENGTH,
}) => {
  const [pin, setPin] = useState<string[]>(new Array(pinLength).fill(""));
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<string>("Biometric");
  const [biometricAuthInProgress, setBiometricAuthInProgress] = useState(false);
  const [hasSavedPin, setHasSavedPin] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [hasAutoTriggered, setHasAutoTriggered] = useState(false);

  // Check biometric availability and settings
  useEffect(() => {
    const checkBiometric = async () => {
      const available = await biometrics.isAvailable();
      // console.log(`[PINModal] Biometric available: ${available}`);
      setIsBiometricAvailable(available);

      if (available) {
        const type = await biometrics.getBiometricName();
        // console.log(`[PINModal] Biometric type: ${type}`);
        setBiometricType(type);
      }

      // Check if user has enabled biometric for transactions
      const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      //  console.log(`[PINModal] Biometric enabled: ${enabled}`);
      setIsBiometricEnabled(enabled === "true");

      // Check if PIN is already saved
      if (enabled === "true" && available) {
        const savedPin = await secureStorage.getItem(
          SECURE_KEYS.BIOMETRIC_TRANSACTION_PIN
        );
        const pinSaved = !!savedPin;
        // console.log(`[PINModal] PIN already saved: ${pinSaved}`);
        setHasSavedPin(pinSaved);
      }
    };

    checkBiometric();
  }, []);

  useEffect(() => {
    if (visible) {
      // Reset PIN when modal opens
      setPin(new Array(pinLength).fill(""));
      // Reset auto-trigger flag
      setHasAutoTriggered(false);
      // Reset manual entry flag
      setShowManualEntry(false);
      // Focus first input (only if not in biometric-only mode)
      if (!(isBiometricEnabled && isBiometricAvailable && hasSavedPin)) {
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      }
    }
  }, [
    visible,
    pinLength,
    isBiometricEnabled,
    isBiometricAvailable,
    hasSavedPin,
  ]);

  const handleChangeText = (text: string, index: number) => {
    // Only allow numbers
    if (text && !/^\d+$/.test(text)) return;

    const newPin = [...pin];
    newPin[index] = text;
    setPin(newPin);

    // Auto-focus next input
    if (text && index < pinLength - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (newPin.every((digit) => digit !== "") && text) {
      // Use handleSubmit to ensure PIN is saved for biometric auth
      const pinValue = newPin.join("");
      // console.log(
      //   "[PINModal] Auto-submitting PIN (length: " + pinValue.length + ")"
      // );
      handleSubmitWithValue(pinValue);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleBiometricAuth = React.useCallback(async () => {
    if (biometricAuthInProgress || loading) return;

    try {
      setBiometricAuthInProgress(true);

      // Prompt for biometric authentication
      const authenticated = await biometrics.authenticate(
        `Use ${biometricType} to confirm transaction`
      );

      if (!authenticated) {
        setBiometricAuthInProgress(false);
        return;
      }

      // Retrieve stored PIN
      const storedPin = await secureStorage.getItem(
        SECURE_KEYS.BIOMETRIC_TRANSACTION_PIN
      );

      if (!storedPin) {
        Alert.alert(
          "PIN Not Found",
          "Please enter your PIN manually this time. Your PIN will be saved for future biometric authentication.",
          [{ text: "OK" }]
        );
        setBiometricAuthInProgress(false);
        return;
      }

      // Auto-submit with stored PIN
      onSubmit(storedPin);
    } catch {
      // console.error("Error authenticating with biometric:", error);
      Alert.alert(
        "Authentication Error",
        "Failed to authenticate. Please try again or use your PIN.",
        [{ text: "OK" }]
      );
    } finally {
      setBiometricAuthInProgress(false);
    }
  }, [biometricAuthInProgress, loading, biometricType, onSubmit]);

  // Auto-trigger biometric when modal opens if PIN is saved (only once per modal open)
  // useEffect(() => {
  //   if (
  //     visible &&
  //     isBiometricEnabled &&
  //     isBiometricAvailable &&
  //     hasSavedPin &&
  //     !showManualEntry &&
  //     !hasAutoTriggered
  //   ) {
  //     // console.log("[PINModal] Auto-triggering biometric authentication...");
  //     setHasAutoTriggered(true);
  //     // Small delay to let modal animation complete
  //     setTimeout(() => {
  //       handleBiometricAuth();
  //     }, 300);
  //   }
  // }, [
  //   visible,
  //   isBiometricEnabled,
  //   isBiometricAvailable,
  //   hasSavedPin,
  //   showManualEntry,
  //   hasAutoTriggered,
  //   handleBiometricAuth,
  // ]);

  const handleSubmitWithValue = async (pinValue: string) => {
    // console.log(
    //   "[PINModal] handleSubmitWithValue called, PIN length:",
    //   pinValue.length,
    //   "Expected:",
    //   pinLength
    // );

    if (pinValue.length === pinLength) {
      // console.log(
      //   "[PINModal] PIN valid. Biometric enabled:",
      //   isBiometricEnabled,
      //   "Available:",
      //   isBiometricAvailable
      // );

      // If biometric is enabled but no PIN is stored yet, save it
      if (isBiometricEnabled && isBiometricAvailable) {
        try {
          // console.log("[PINModal] Checking if PIN is already stored...");
          const storedPin = await secureStorage.getItem(
            SECURE_KEYS.BIOMETRIC_TRANSACTION_PIN
          );
          // console.log("[PINModal] Existing stored PIN found:", !!storedPin);
          if (!storedPin) {
            // console.log("[PINModal] Saving new PIN to secure storage...");
            await secureStorage.setItem(
              SECURE_KEYS.BIOMETRIC_TRANSACTION_PIN,
              pinValue
            );
            //  console.log("[PINModal] ✅ PIN saved successfully!");

            // Verify it was saved
            await secureStorage.getItem(SECURE_KEYS.BIOMETRIC_TRANSACTION_PIN);
            // console.log(
            //   "[PINModal] Verification - PIN retrieved:",
            //   !!verifyPin,
            //   "Length:",
            //   verifyPin?.length || 0
            // );
          } else {
            // console.log("[PINModal] PIN already stored, skipping save");
          }
        } catch {
          //console.error("[PINModal] ❌ Error saving PIN for biometric:", error);
        }
      } else {
        // console.log(
        //   "[PINModal] Skipping PIN save - Biometric enabled:",
        //   isBiometricEnabled,
        //   "Available:",
        //   isBiometricAvailable
        // );
      }

      //  console.log("[PINModal] Submitting PIN to parent component");
      onSubmit(pinValue);
    } else {
      // console.log(
      //   "[PINModal] PIN length invalid:",
      //   pinValue.length,
      //   "expected:",
      //   pinLength
      // );
    }
  };

  const handleSubmit = async () => {
    const pinValue = pin.join("");
    // console.log("[PINModal] Manual submit button pressed");
    await handleSubmitWithValue(pinValue);
  };

  const isComplete = pin.every((digit) => digit !== "");
  const showBiometricButton =
    isBiometricAvailable && isBiometricEnabled && !loading;
  const showBiometricOnly =
    showBiometricButton && hasSavedPin && !showManualEntry;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <BlurView
          intensity={20}
          className="flex-1 justify-center items-center px-5"
        >
          {/* Backdrop */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={onClose}
            className="absolute inset-0"
            disabled={loading || biometricAuthInProgress}
          />

          {/* Modal Content */}
          <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-sm">
            {/* Close Button */}
            <TouchableOpacity
              disabled={loading}
              onPress={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center z-10"
            >
              <Ionicons
                name="close"
                size={20}
                color={loading ? "#6B7280" : "#5b55f6"}
              />
            </TouchableOpacity>

            {/* Icon */}
            <View className="items-center mb-4">
              <View className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 items-center justify-center mb-4">
                <Ionicons name="lock-closed" size={32} color="#5b55f6" />
              </View>
            </View>

            {/* Title */}
            <Text variant="h4" align="center" className="mb-2">
              {title}
            </Text>
            <Text
              variant="body"
              color="secondary"
              align="center"
              className="mb-6"
            >
              {showBiometricOnly ? `Use ${biometricType} to confirm` : subtitle}
            </Text>

            {/* PIN Input - Only show if not biometric-only mode */}
            {!showBiometricOnly && (
              <View className="flex-row justify-center gap-3 mb-6">
                {pin.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref: any) => (inputRefs.current[index] = ref)}
                    className={`w-14 h-14 border-2 rounded-xl text-center text-2xl font-bold text-gray-900 dark:text-white ${
                      digit
                        ? "border-[#5b55f6] dark:border-[#5B55F6] bg-purple-50 dark:bg-purple-900/30"
                        : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                    }`}
                    value={digit}
                    onChangeText={(text) => handleChangeText(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    secureTextEntry
                    editable={!loading}
                  />
                ))}
              </View>
            )}

            {/* Divider */}
            {/* {showBiometricButton && (
              <View className="flex-row items-center mb-6">
                <View className="flex-1 h-px bg-gray-300" />
                <Text variant="caption" color="secondary" className="mx-3">
                  or use {biometricType}
                </Text>
                <View className="flex-1 h-px bg-gray-300" />
              </View>
            )} */}

            {/* Biometric Button */}
            {showBiometricButton && (
              <Button
                variant={showBiometricOnly ? "primary" : "ghost"}
                size="lg"
                fullWidth
                disabled={biometricAuthInProgress}
                onPress={handleBiometricAuth}
                className={showBiometricOnly ? "mb-4" : "mb-8"}
                icon={
                  biometricType === "Face ID" ? (
                    <MaterialCommunityIcons
                      name="face-recognition"
                      size={24}
                      color={
                        biometricAuthInProgress
                          ? "#9CA3AF"
                          : showBiometricOnly
                            ? "#FFFFFF"
                            : "#5B55F6"
                      }
                    />
                  ) : (
                    <Ionicons
                      name="finger-print"
                      size={24}
                      color={
                        biometricAuthInProgress
                          ? "#9CA3AF"
                          : showBiometricOnly
                            ? "#FFFFFF"
                            : "#5B55F6"
                      }
                    />
                  )
                }
              >
                {biometricAuthInProgress
                  ? "Authenticating..."
                  : `Use ${biometricType}`}
              </Button>
            )}

            {/* Use PIN Instead Button - Only show in biometric-only mode */}
            {showBiometricOnly && (
              <TouchableOpacity
                className="py-3"
                onPress={() => {
                  // console.log("[PINModal] Switching to manual PIN entry");
                  setShowManualEntry(true);
                  setTimeout(() => {
                    inputRefs.current[0]?.focus();
                  }, 100);
                }}
                disabled={loading || biometricAuthInProgress}
              >
                <Text
                  variant="caption"
                  align="center"
                  className="text-gray-600"
                >
                  Use PIN instead
                </Text>
              </TouchableOpacity>
            )}

            {/* Submit Button - Only show when PIN input is visible */}
            {!showBiometricOnly && (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onPress={handleSubmit}
                disabled={!isComplete}
                loading={loading}
              >
                Confirm
              </Button>
            )}

            {/* Forgot PIN - Only show when PIN input is visible */}
            {!showBiometricOnly && (
              <TouchableOpacity
                className="mt-4 py-2"
                onPress={() => router.push("/(tabs)/profile")}
                disabled={loading}
              >
                <Text
                  variant="caption"
                  align="center"
                  className={`text-[#5b55f6] ${loading ? "opacity-50" : ""}`}
                >
                  Forgot PIN?
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
};
