// app/crypto/setup.tsx
import { Button, Card, PinPad, ScreenHeader, Text } from "@/src/components/ui";
import { useInitializeCryptoWallet } from "@/src/hooks/useCryptoWallet";
import { useTheme } from "@/src/hooks/useTheme";
import { validateCryptoPin } from "@/src/lib/utils/crypto-pin";
import { toast } from "@/src/lib/utils/toast";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CryptoSetupScreen() {
  const { isDark } = useTheme();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const { mutateAsync: initializeWallet, isPending: isLoadingWallet } =
    useInitializeCryptoWallet();
  const insets = useSafeAreaInsets();
  const handleSetup = async () => {
    setError("");

    // Validation - Crypto wallet uses 6-digit PIN
    const pinValidation = validateCryptoPin(pin);
    if (!pinValidation.isValid) {
      const errorMsg = pinValidation.error || "Invalid PIN";
      setError(errorMsg);
      toast.error({
        title: "Invalid PIN",
        message: errorMsg,
      });
      return;
    }

    if (pin !== confirmPin) {
      const errorMsg = "PINs do not match";
      setError(errorMsg);
      toast.error({
        title: "PIN Mismatch",
        message: errorMsg,
      });
      return;
    }

    try {
      await initializeWallet(pin);
      toast.success({
        title: "Wallet Created!",
        message: "Your crypto wallet has been set up successfully",
      });
      router.back();
    } catch (err: any) {
      toast.error({
        title: "Setup Failed",
        message: `${err.message || "Failed to setup wallet"}`,
      });
      // Error is already handled in useCryptoWallet hook
      setError(err.message || "Failed to setup wallet");
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900 px-4">
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <ScreenHeader
        title="Setup Crypto Wallet"
        subtitleText="Create a secure 6-digit PIN"
      />

      <ScrollView
        className=""
        contentContainerStyle={{
          paddingBottom: insets.bottom + 400,
        }}
      >
        <View className="py-6">
          {/* PIN Input */}
          <Card variant="elevated" className="p-6 mb-6">
            <Text variant="h7" weight="semibold" className="mb-4">
              Enter 6-digit PIN
            </Text>
            <PinPad value={pin} onChange={setPin} length={6} autoFocus />

            <Text variant="h7" weight="semibold" className="mb-4 mt-6">
              Confirm PIN
            </Text>
            <PinPad value={confirmPin} onChange={setConfirmPin} length={6} />
          </Card>

          {/* Features */}
          <Card variant="elevated" className="p-6 mb-6">
            <Text variant="h6" weight="bold" className="mb-4">
              What you&apos;ll get:
            </Text>

            <View className="mb-3">
              <Text variant="body" color="secondary">
                ✓ Your own crypto wallet address
              </Text>
            </View>
            <View className="mb-3">
              <Text variant="body" color="secondary">
                ✓ Send & receive USDT, USDC, MATIC
              </Text>
            </View>
            <View className="mb-3">
              <Text variant="body" color="secondary">
                ✓ Convert crypto to Naira instantly
              </Text>
            </View>
            <View>
              <Text variant="body" color="secondary">
                ✓ Secure transactions with PIN
              </Text>
            </View>
          </Card>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleSetup}
            disabled={
              isLoadingWallet || pin.length !== 6 || confirmPin.length !== 6
            }
            loading={isLoadingWallet}
          >
            Setup Wallet
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
