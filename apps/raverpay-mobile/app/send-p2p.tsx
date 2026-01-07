// app/send-p2p.tsx

import { SentryErrorBoundary } from "@/src/components/SentryErrorBoundary";
import {
  Button,
  Card,
  Input,
  PINModal,
  ScreenHeader,
  Text,
  TransactionDetail,
} from "@/src/components/ui";
import { useDebounce } from "@/src/hooks/useDebounce";
import { useP2PPermissions, useSendP2P } from "@/src/hooks/useP2P";
import { useTheme } from "@/src/hooks/useTheme";
import { formatCurrency } from "@/src/lib/utils/formatters";
import { lookupUserByTag } from "@/src/services/p2p.service";
import { useWalletStore } from "@/src/store/wallet.store";
import type { LookupUserResponse } from "@/src/types/api.types";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";

const DEFAULT_AVATAR =
  "https://ui-avatars.com/api/?name=User&background=5B55F6&color=fff";

export default function SendP2PScreen() {
  return (
    <SentryErrorBoundary>
      <SendP2PContent />
    </SentryErrorBoundary>
  );
}

function SendP2PContent() {
  const { isDark } = useTheme();
  const { balance } = useWalletStore();
  const { transactionLimit } = useP2PPermissions();
  const { sendP2P, isSending } = useSendP2P();

  const [recipientTag, setRecipientTag] = useState("");
  const [recipient, setRecipient] = useState<LookupUserResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [showPinModal, setShowPinModal] = useState(false);

  const debouncedTag = useDebounce(recipientTag.toLowerCase().trim(), 500);

  // Auto-search user as they type
  useEffect(() => {
    const searchUser = async () => {
      if (!debouncedTag || debouncedTag.length < 3) {
        setRecipient(null);
        setSearchError("");
        return;
      }

      setIsSearching(true);
      setSearchError("");

      try {
        const user = await lookupUserByTag(debouncedTag);
        setRecipient(user);
        setSearchError("");
      } catch (err: any) {
        setRecipient(null);
        if (err?.response?.status === 404) {
          setSearchError(" Unable to find user with that username.");
        } else {
          setSearchError("Unable to search. Try again.");
        }
      } finally {
        setIsSearching(false);
      }
    };

    searchUser();
  }, [debouncedTag]);

  // Check if user can send P2P
  //   useEffect(() => {
  //     if (!canSendP2P) {
  //       Alert.alert(
  //         "Verification Required",
  //         "Please complete email and phone verification to send money to other users.",
  //         [
  //           { text: "Cancel", onPress: () => router.back() },
  //           {
  //             text: "Verify Now",
  //             onPress: () => {
  //               router.back();
  //               router.push("/tier-details");
  //             },
  //           },
  //         ]
  //       );
  //     }
  //   }, [canSendP2P]);

  const handleProceed = () => {
    const amountValue = parseFloat(amount);

    // Validation
    if (!recipient) {
      Alert.alert("Error", "Please select a recipient");
      return;
    }

    if (!amount || amountValue <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    if (amountValue < 100) {
      Alert.alert("Invalid Amount", "Minimum transfer amount is ₦100");
      return;
    }

    if (amountValue > balance) {
      Alert.alert("Insufficient Balance", "You don't have enough funds");
      return;
    }

    if (amountValue > transactionLimit) {
      Alert.alert(
        "Amount Exceeds Limit",
        `Maximum transfer amount for your account is ${formatCurrency(transactionLimit)}.\n\nUpgrade your KYC tier to increase limits.`
      );
      return;
    }

    // Show PIN modal
    setShowPinModal(true);
  };

  const handleSendP2P = async (pin: string) => {
    if (!recipient) return;

    try {
      const result = await sendP2P({
        recipientTag: recipient.tag,
        amount: parseFloat(amount),
        message: message || undefined,
        pin,
      });

      setShowPinModal(false);

      // Navigate to success screen with transaction data
      const successDetails: TransactionDetail[] = [
        {
          label: "Recipient",
          value: recipient.name,
        },
        {
          label: "Username",
          value: `@${recipient.tag}`,
        },
      ];

      if (message) {
        successDetails.push({
          label: "Message",
          value: message,
        });
      }

      successDetails.push({
        label: "Amount Sent",
        value: formatCurrency(parseFloat(amount)),
        highlight: true,
      });

      router.push({
        pathname: "/transaction-success",
        params: {
          serviceType: "P2P Transfer",
          amount: parseFloat(amount).toString(),
          reference: result.reference || "",
          cashbackEarned: "0",
          cashbackRedeemed: "0",
          details: JSON.stringify(successDetails),
        },
      });
    } catch {
      setShowPinModal(false);
      // Error handled by hook
    }
  };

  const handleTagChange = (value: string) => {
    // Auto-convert to lowercase and remove spaces/@ symbol
    const cleaned = value.toLowerCase().replace(/[@\s]/g, "");
    setRecipientTag(cleaned);
    setRecipient(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50 dark:bg-gray-900"
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <ScreenHeader title="Send to @username" disabled={isSending} />

      <ScrollView
        className="flex-1 px-5 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 200 }}
      >
        {/* Recipient Search */}
        <Card variant="elevated" className="p-5 mb-4">
          <Text variant="h4" className="mb-4">
            Recipient
          </Text>

          <View className="flex-row items-center justify-between w-full ">
            <View className="w-[96%] ">
              <Input
                value={recipientTag}
                onChangeText={handleTagChange}
                placeholder="Username of recipient"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSending}
                leftIcon="at-sharp"
              />
            </View>
            {isSearching && <ActivityIndicator size="small" color="#5B55F6" />}
          </View>

          {/* Recipient Card (when found) */}
          {recipient && (
            <View className="flex-row items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border-2 border-green-200 dark:border-green-700">
              <Image
                source={{ uri: recipient.avatar || DEFAULT_AVATAR }}
                className="w-12 h-12 rounded-full"
              />
              <View className="flex-1 ml-3">
                <Text variant="bodyMedium" weight="bold">
                  {recipient.name}
                </Text>
                <Text
                  variant="caption"
                  className="text-[#5B55F6] dark:text-[#5B55F6]"
                >
                  @{recipient.tag}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            </View>
          )}

          {/* Search Error */}
          {searchError && !isSearching && (
            <View className="flex-row items-start p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
              <Text
                variant="caption"
                className="text-red-600 dark:text-red-400 ml-2 flex-1"
              >
                {searchError}
              </Text>
            </View>
          )}
        </Card>

        {/* Amount Input */}
        {recipient && (
          <>
            <Card variant="elevated" className="p-5 mb-4">
              <Text variant="h4" className="mb-4">
                Amount
              </Text>

              <Input
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="numeric"
                leftIcon="cash-outline"
                editable={!isSending}
              />

              <Text variant="caption" color="secondary" className="mt-2">
                Available: {formatCurrency(balance)}
              </Text>
            </Card>

            {/* Message Input (Optional) */}
            <Card variant="elevated" className="p-5 mb-4">
              <Text variant="h4" className="mb-4">
                Message (Optional)
              </Text>

              <Input
                value={message}
                onChangeText={setMessage}
                placeholder="What's this for?"
                maxLength={100}
                editable={!isSending}
              />

              <Text variant="caption" color="secondary" className="">
                {message.length}/100 characters
              </Text>
            </Card>

            {/* Summary Card */}
            <Card
              variant="elevated"
              className="p-5 mb-4 bg-purple-50 dark:bg-purple-900/20"
            >
              <View className="flex-row items-start mb-3">
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color="#5B55F6"
                />
                <Text
                  variant="bodyMedium"
                  className="ml-3 flex-1 text-purple-800"
                >
                  Transfer Summary
                </Text>
              </View>

              <View className="ml-7 space-y-2">
                <View className="flex-row justify-between mb-2">
                  <Text variant="body" className="text-purple-700">
                    Amount
                  </Text>
                  <Text
                    variant="bodyMedium"
                    weight="bold"
                    className="text-purple-900"
                  >
                    {amount ? formatCurrency(parseFloat(amount)) : "₦0.00"}
                  </Text>
                </View>

                <View className="flex-row justify-between mb-2">
                  <Text variant="body" className="text-purple-700">
                    Fee
                  </Text>
                  <Text variant="bodyMedium" className="text-green-600">
                    FREE
                  </Text>
                </View>

                <View className="border-t border-purple-200 pt-2">
                  <View className="flex-row justify-between">
                    <Text
                      variant="bodyMedium"
                      weight="bold"
                      className="text-purple-900"
                    >
                      Total
                    </Text>
                    <Text variant="h3" className="text-purple-900">
                      {amount ? formatCurrency(parseFloat(amount)) : "₦0.00"}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>

            {/* Send Button */}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleProceed}
              disabled={!recipient || !amount || isSending}
              loading={isSending}
            >
              Continue
            </Button>
          </>
        )}

        <View className="h-8" />
      </ScrollView>

      {/* PIN Modal */}
      <PINModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSubmit={handleSendP2P}
        loading={isSending}
        title="Confirm Transfer"
        subtitle={`Enter your PIN to send ${amount ? formatCurrency(parseFloat(amount)) : "money"} to @${recipient?.tag}`}
      />
    </KeyboardAvoidingView>
  );
}
