// app/change-pin-new.tsx
import {
  Card,
  isWeakPin,
  PinPad,
  ScreenHeader,
  Text,
} from "@/src/components/ui";
import { useChangePin } from "@/src/hooks/usePin";
import { useTheme } from "@/src/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { Alert, ScrollView, View } from "react-native";

type Step = "current" | "new" | "confirm";

export default function ChangePinScreen() {
  const { isDark } = useTheme();
  const [step, setStep] = useState<Step>("current");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState(false);

  const { mutate: changePinMutation, isPending } = useChangePin();

  const handleCurrentPinComplete = (pin: string) => {
    if (pin.length === 4) {
      setError(false);
      setStep("new");
    }
  };

  const handleNewPinComplete = (pin: string) => {
    if (pin.length === 4) {
      if (isWeakPin(pin)) {
        setError(true);
        Alert.alert(
          "Weak PIN",
          "This PIN is too weak. Please choose a more secure PIN (avoid 0000, 1234, etc.)"
        );
        return;
      }

      if (pin === currentPin) {
        setError(true);
        Alert.alert("Error", "New PIN must be different from current PIN");
        return;
      }

      setError(false);
      setStep("confirm");
    }
  };

  const handleConfirmPinComplete = (pin: string) => {
    if (pin.length === 4) {
      if (pin !== newPin) {
        setError(true);
        Alert.alert("Error", "PINs do not match. Please try again.");
        setConfirmPin("");
        return;
      }

      // PINs match, proceed with change
      handleChangePin(pin);
    }
  };

  const handleChangePin = (confirmPinValue?: string) => {
    changePinMutation(
      {
        currentPin,
        newPin,
        confirmNewPin: confirmPinValue || confirmPin,
      },
      {
        onSuccess: () => {
          Alert.alert(
            "Success",
            "Your transaction PIN has been changed successfully",
            [
              {
                text: "OK",
                onPress: () => router.back(),
              },
            ]
          );
        },
        onError: (error: any) => {
          setError(true);
          const errorMessage =
            error?.response?.data?.message ||
            "Failed to change PIN. Please try again.";

          Alert.alert("Change PIN Failed", errorMessage, [
            {
              text: "Try Again",
              onPress: () => {
                setCurrentPin("");
                setNewPin("");
                setConfirmPin("");
                setStep("current");
                setError(false);
              },
            },
          ]);
        },
      }
    );
  };

  const currentValue =
    step === "current" ? currentPin : step === "new" ? newPin : confirmPin;
  const currentSetter =
    step === "current"
      ? setCurrentPin
      : step === "new"
        ? setNewPin
        : setConfirmPin;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <ScreenHeader title="  Change Transaction PIN" />

      <ScrollView
        className="flex-1 px-5 pt-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Indicator */}
        <View className="flex-row items-center justify-center mb-8">
          <View className="flex-row items-center">
            <View
              className={`w-8 h-8 rounded-full items-center justify-center ${
                step === "current" ? "bg-[#5B55F6]" : "bg-green-500"
              }`}
            >
              {step !== "current" ? (
                <Ionicons name="checkmark" size={16} color="white" />
              ) : (
                <Text variant="caption" className="text-white font-semibold">
                  1
                </Text>
              )}
            </View>
            <View
              className={`w-12 h-0.5 ${step === "current" ? "bg-gray-300" : "bg-green-500"}`}
            />
            <View
              className={`w-8 h-8 rounded-full items-center justify-center ${
                step === "new"
                  ? "bg-[#5B55F6]"
                  : step === "confirm"
                    ? "bg-green-500"
                    : "bg-gray-300"
              }`}
            >
              {step === "confirm" ? (
                <Ionicons name="checkmark" size={16} color="white" />
              ) : (
                <Text
                  variant="caption"
                  className={`font-semibold ${step === "new" ? "text-white" : "text-gray-500"}`}
                >
                  2
                </Text>
              )}
            </View>
            <View
              className={`w-12 h-0.5 ${step === "confirm" ? "bg-[#5B55F6]" : "bg-gray-300"}`}
            />
            <View
              className={`w-8 h-8 rounded-full items-center justify-center ${
                step === "confirm" ? "bg-[#5B55F6]" : "bg-gray-300"
              }`}
            >
              <Text
                variant="caption"
                className={`font-semibold ${step === "confirm" ? "text-white" : "text-gray-500"}`}
              >
                3
              </Text>
            </View>
          </View>
        </View>

        <Card variant="elevated" className="p-6 mb-6">
          {/* Step Instructions */}
          <View className="items-center mb-8">
            <Text variant="h3" align="center" className="mb-2">
              {step === "current" && "Enter Current PIN"}
              {step === "new" && "Enter New PIN"}
              {step === "confirm" && "Confirm New PIN"}
            </Text>
            <Text variant="body" color="secondary" align="center">
              {step === "current" && "Please enter your current 4-digit PIN"}
              {step === "new" && "Choose a new secure 4-digit PIN"}
              {step === "confirm" && "Re-enter your new PIN to confirm"}
            </Text>
          </View>

          {/* PIN Pad */}
          <PinPad
            value={currentValue}
            onChange={(value) => {
              setError(false);
              currentSetter(value);

              // Auto-proceed when 4 digits entered
              if (value.length === 4) {
                setTimeout(() => {
                  if (step === "current") handleCurrentPinComplete(value);
                  else if (step === "new") handleNewPinComplete(value);
                  else handleConfirmPinComplete(value);
                }, 300);
              }
            }}
            length={4}
            error={error}
            disabled={isPending}
            autoFocus
          />

          {/* Weak PIN Warning for new PIN */}
          {step === "new" && newPin.length > 0 && (
            <View className="mt-6">
              <View className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                <View className="flex-row items-start">
                  <Ionicons name="warning" size={18} color="#F59E0B" />
                  <View className="flex-1 ml-2">
                    <Text variant="caption" className="text-yellow-800">
                      Avoid weak PINs like 0000, 1111, 1234, etc.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Match indicator for confirm step */}
          {step === "confirm" && confirmPin.length > 0 && (
            <View className="mt-6">
              {confirmPin !== newPin ? (
                <View className="flex-row items-center justify-center">
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                  <Text variant="caption" className="text-red-600 ml-2">
                    PINs do not match
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center justify-center">
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text variant="caption" className="text-green-600 ml-2">
                    PINs match!
                  </Text>
                </View>
              )}
            </View>
          )}
        </Card>

        {/* Info */}
        <Card
          variant="outlined"
          className="p-4 mb-8 border-blue-200 bg-blue-50"
        >
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <View className="flex-1 ml-2">
              <Text variant="caption" className="text-blue-800">
                Your transaction PIN is used to authorize payments and
                withdrawals. Keep it secure and don&apos;t share it with anyone.
              </Text>
            </View>
          </View>
        </Card>

        {isPending && (
          <View className="items-center mb-8">
            <Text variant="body" color="secondary">
              Updating your PIN...
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
