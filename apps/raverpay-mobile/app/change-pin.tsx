// app/change-pin.tsx
import { Button, Card, Input, ScreenHeader, Text } from "@/src/components/ui";
import { useChangePin } from "@/src/hooks/usePin";
import { useTheme } from "@/src/hooks/useTheme";
import { useUserStore } from "@/src/store/user.store";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { Alert, ScrollView, View } from "react-native";

const WEAK_PINS = [
  "0000",
  "1111",
  "2222",
  "3333",
  "4444",
  "5555",
  "6666",
  "7777",
  "8888",
  "9999",
  "1234",
  "4321",
];

export default function ChangePinScreen() {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const { updateUser } = useUserStore();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmNewPin, setShowConfirmNewPin] = useState(false);

  const { mutate: changePinMutation, isPending } = useChangePin();

  const validatePin = (): string | null => {
    if (!currentPin || currentPin.length !== 4) {
      return "Current PIN must be exactly 4 digits";
    }

    if (!newPin || newPin.length !== 4) {
      return "New PIN must be exactly 4 digits";
    }

    if (!/^\d{4}$/.test(newPin)) {
      return "PIN must contain only digits";
    }

    if (WEAK_PINS.includes(newPin)) {
      return "PIN is too weak. Please choose a more secure PIN";
    }

    if (currentPin === newPin) {
      return "New PIN must be different from current PIN";
    }

    if (!confirmNewPin || confirmNewPin.length !== 4) {
      return "Please confirm your new PIN";
    }

    if (newPin !== confirmNewPin) {
      return "New PINs do not match";
    }

    return null;
  };

  const handleChangePin = () => {
    const error = validatePin();
    if (error) {
      Alert.alert("Invalid PIN", error);
      return;
    }

    changePinMutation(
      { currentPin, newPin, confirmNewPin },
      {
        onSuccess: (data) => {
          // Update user store with new pinSetAt timestamp
          updateUser({
            pinSetAt: data.pinSetAt || new Date().toISOString(),
          });

          // Invalidate pin-status query
          queryClient.invalidateQueries({ queryKey: ["pin-status"] });

          // Clear form
          setCurrentPin("");
          setNewPin("");
          setConfirmNewPin("");

          // Show success and go back
          Alert.alert(
            "Success!",
            "Your transaction PIN has been changed successfully",
            [
              {
                text: "OK",
                onPress: () => router.back(),
              },
            ]
          );
        },
      }
    );
  };

  const isPinValid =
    currentPin.length === 4 &&
    newPin.length === 4 &&
    confirmNewPin.length === 4 &&
    newPin === confirmNewPin &&
    currentPin !== newPin;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <ScreenHeader title="Change Transaction PIN" />

      <ScrollView
        className="flex-1 px-5 pt-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Info Card */}
        <Card variant="elevated" className="p-4 mb-6 bg-amber-50">
          <View className="flex-row items-start">
            <Ionicons name="warning" size={20} color="#F59E0B" />
            <View className="ml-3 flex-1">
              <Text variant="caption" color="secondary">
                You&apos;ll need your current PIN to change to a new one. If
                you&apos;ve forgotten your PIN, please contact support.
              </Text>
            </View>
          </View>
        </Card>

        {/* Current PIN Input */}
        <View className="mb-4">
          <Input
            label="Current PIN"
            placeholder="Enter current 4-digit PIN"
            value={currentPin}
            onChangeText={setCurrentPin}
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry={!showCurrentPin}
            leftIcon="lock-closed-outline"
            rightIcon={showCurrentPin ? "eye-off-outline" : "eye-outline"}
            onRightIconPress={() => setShowCurrentPin(!showCurrentPin)}
          />
        </View>

        {/* New PIN Input */}
        <View className="mb-4">
          <Input
            label="New PIN"
            placeholder="Enter new 4-digit PIN"
            value={newPin}
            onChangeText={setNewPin}
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry={!showNewPin}
            leftIcon="lock-closed-outline"
            rightIcon={showNewPin ? "eye-off-outline" : "eye-outline"}
            onRightIconPress={() => setShowNewPin(!showNewPin)}
          />
        </View>

        {/* Confirm New PIN Input */}
        <View className="mb-6">
          <Input
            label="Confirm New PIN"
            placeholder="Re-enter new 4-digit PIN"
            value={confirmNewPin}
            onChangeText={setConfirmNewPin}
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry={!showConfirmNewPin}
            leftIcon="lock-closed-outline"
            rightIcon={showConfirmNewPin ? "eye-off-outline" : "eye-outline"}
            onRightIconPress={() => setShowConfirmNewPin(!showConfirmNewPin)}
          />
        </View>

        {/* PIN Requirements */}
        <Card variant="elevated" className="p-4 mb-6">
          <Text variant="body" weight="semibold" className="mb-3">
            New PIN Requirements:
          </Text>
          <View className="space-y-2">
            <View className="flex-row items-center mb-2">
              <Ionicons
                name={
                  newPin.length === 4 ? "checkmark-circle" : "ellipse-outline"
                }
                size={16}
                color={newPin.length === 4 ? "#10B981" : "#9CA3AF"}
              />
              <Text variant="caption" color="secondary" className="ml-2">
                Must be exactly 4 digits
              </Text>
            </View>
            <View className="flex-row items-center mb-2">
              <Ionicons
                name={
                  newPin && /^\d+$/.test(newPin)
                    ? "checkmark-circle"
                    : "ellipse-outline"
                }
                size={16}
                color={newPin && /^\d+$/.test(newPin) ? "#10B981" : "#9CA3AF"}
              />
              <Text variant="caption" color="secondary" className="ml-2">
                Only numbers allowed
              </Text>
            </View>
            <View className="flex-row items-center mb-2">
              <Ionicons
                name={
                  newPin && !WEAK_PINS.includes(newPin)
                    ? "checkmark-circle"
                    : "ellipse-outline"
                }
                size={16}
                color={
                  newPin && !WEAK_PINS.includes(newPin) ? "#10B981" : "#9CA3AF"
                }
              />
              <Text variant="caption" color="secondary" className="ml-2">
                Avoid weak PINs (0000, 1234, etc.)
              </Text>
            </View>
            <View className="flex-row items-center mb-2">
              <Ionicons
                name={
                  currentPin && newPin && currentPin !== newPin
                    ? "checkmark-circle"
                    : "ellipse-outline"
                }
                size={16}
                color={
                  currentPin && newPin && currentPin !== newPin
                    ? "#10B981"
                    : "#9CA3AF"
                }
              />
              <Text variant="caption" color="secondary" className="ml-2">
                Different from current PIN
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons
                name={
                  newPin && confirmNewPin && newPin === confirmNewPin
                    ? "checkmark-circle"
                    : "ellipse-outline"
                }
                size={16}
                color={
                  newPin && confirmNewPin && newPin === confirmNewPin
                    ? "#10B981"
                    : "#9CA3AF"
                }
              />
              <Text variant="caption" color="secondary" className="ml-2">
                New PINs must match
              </Text>
            </View>
          </View>
        </Card>

        {/* Change PIN Button */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleChangePin}
          disabled={!isPinValid || isPending}
          loading={isPending}
          className="mb-8"
        >
          Change PIN
        </Button>
      </ScrollView>
    </View>
  );
}
