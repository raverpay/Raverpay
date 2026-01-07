// src/components/crypto/QRCodeDisplay.tsx
import { Card, Text } from "@/src/components/ui";
import { toast } from "@/src/lib/utils/toast";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React from "react";
import { View } from "react-native";
import QRCode from "react-native-qrcode-svg";

interface QRCodeDisplayProps {
  address: string;
  size?: number;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  address,
  size = 250,
}) => {
  const copyToClipboard = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    toast.success({
      title: "Copied!",
      message: "Wallet address copied to clipboard",
    });
  };

  if (!address) {
    return (
      <View className="items-center">
        <Text variant="body" className="text-gray-500">
          No address available
        </Text>
      </View>
    );
  }

  return (
    <View className="items-center">
      <Card variant="elevated" className="p-4 mb-4">
        <QRCode value={address} size={size} />
      </Card>

      <Card
        variant="outlined"
        pressable
        onPress={copyToClipboard}
        className="mb-3"
      >
        <View className="flex-row items-center justify-center px-4 py-3">
          <Text variant="body" className="font-mono text-center">
            {address.slice(0, 6)}...{address.slice(-4)}
          </Text>
          <Ionicons
            name="copy-outline"
            size={18}
            color="#6B7280"
            style={{ marginLeft: 8 }}
          />
        </View>
      </Card>
    </View>
  );
};
