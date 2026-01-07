// app/crypto/send.tsx
import {
  Button,
  Card,
  Input,
  PINModal,
  ScreenHeader,
  Text,
} from "@/src/components/ui";
import { useCryptoWallet, useSendCrypto } from "@/src/hooks/useCryptoWallet";
import { useTheme } from "@/src/hooks/useTheme";
import { toast } from "@/src/lib/utils/toast";
import { TokenSymbol } from "@/src/types/crypto.types";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOKENS: TokenSymbol[] = ["USDT", "USDC", "MATIC"];

export default function SendCryptoScreen() {
  const { isDark } = useTheme();
  const { data: wallet } = useCryptoWallet();
  const { isPending: isPurchasing, mutateAsync: sendCrypto } = useSendCrypto();
  const balances = wallet?.balances || [];

  const [selectedToken, setSelectedToken] = useState<TokenSymbol>("USDT");
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [showPinModal, setShowPinModal] = useState(false);
  const insets = useSafeAreaInsets();
  const selectedBalance = balances.find((b) => b.tokenSymbol === selectedToken);

  const handleSend = () => {
    // Validation
    if (!toAddress || toAddress.length !== 42 || !toAddress.startsWith("0x")) {
      toast.error({
        title: "Invalid Address",
        message: "Please enter a valid wallet address (0x...)",
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error({
        title: "Invalid Amount",
        message: "Please enter a valid amount",
      });
      return;
    }

    if (
      selectedBalance &&
      parseFloat(amount) > parseFloat(selectedBalance.balance)
    ) {
      toast.error({
        title: "Insufficient Balance",
        message: "You don't have enough balance for this transaction",
      });
      return;
    }

    setShowPinModal(true);
  };

  const handlePinSubmit = async (pin: string) => {
    try {
      await sendCrypto({
        tokenSymbol: selectedToken,
        toAddress,
        amount,
        pin,
        memo: memo || undefined,
      });

      toast.success({
        title: "Transaction Submitted",
        message: `Sending ${amount} ${selectedToken}...`,
      });
      setShowPinModal(false);
      router.back();
    } catch {
      // Error handled in hook
      setShowPinModal(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <ScreenHeader title="Send Stablecoin" />

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 300,
          paddingVertical: 16,
        }}
      >
        <View className="px-4">
          {/* Token Selection */}
          <Text variant="h4" weight="semibold" className="mb-2">
            Select Token
          </Text>
          <View className="flex-row mb-6 gap-2">
            {TOKENS.map((token) => (
              <Button
                key={token}
                variant={selectedToken === token ? "primary" : "outline"}
                size="md"
                onPress={() => setSelectedToken(token)}
                className="flex-1"
              >
                {token}
              </Button>
            ))}
          </View>

          {/* Available Balance */}
          {selectedBalance && (
            <Card variant="filled" className="py-4 mb-6">
              <Text variant="caption" color="secondary" className="mb-1">
                Available Balance
              </Text>
              <Text variant="h4" weight="bold">
                {parseFloat(selectedBalance.balance).toFixed(4)} {selectedToken}
              </Text>
              <Text variant="caption" color="secondary">
                ≈ ${parseFloat(selectedBalance.usdValue).toFixed(2)}
              </Text>
            </Card>
          )}

          {/* Recipient Address */}
          <Input
            label="Recipient Address"
            placeholder="0x..."
            value={toAddress}
            onChangeText={setToAddress}
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon="wallet-outline"
          />

          {/* Amount */}
          <Input
            label="Amount"
            placeholder="0.00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            leftIcon="cash-outline"
          />

          {/* Memo (Optional) */}
          <Input
            label="Memo (Optional)"
            placeholder="Add a note..."
            value={memo}
            onChangeText={setMemo}
            multiline
            numberOfLines={3}
            leftIcon="document-text-outline"
          />

          {/* Transaction Fee Notice */}
          <Card variant="filled" className="p-4 mb-6 bg-yellow-50">
            <View className="flex-row items-start">
              <Ionicons name="warning-outline" size={20} color="#F59E0B" />
              <Text variant="caption" color="secondary" className="ml-2 flex-1">
                Network fees (gas) will be deducted from your MATIC balance
              </Text>
            </View>
          </Card>

          {/* Send Button */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleSend}
            disabled={!toAddress || !amount}
          >
            Continue
          </Button>
        </View>
      </ScrollView>

      <PINModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSubmit={handlePinSubmit}
        title="Confirm Transaction"
        subtitle={`Enter your 6-digit crypto PIN to send ${amount} ${selectedToken}`}
        pinLength={6}
        loading={isPurchasing}
      />
    </View>
  );
}
