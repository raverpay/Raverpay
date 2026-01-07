// app/fund-wallet.tsx
import {
  ActiveVirtualAccount,
  RequestVirtualAccount,
  VirtualAccountLoading,
} from "@/components/fund-wallet";
import { SentryErrorBoundary } from "@/src/components/SentryErrorBoundary";
import { Button, Card, Input, ScreenHeader, Text } from "@/src/components/ui";
import { config } from "@/src/constants/config";
import { useTheme } from "@/src/hooks/useTheme";
import { apiClient } from "@/src/lib/api/client";
import { API_ENDPOINTS } from "@/src/lib/api/endpoints";
import { formatCurrency } from "@/src/lib/utils/formatters";
import { toast } from "@/src/lib/utils/toast";
import {
  getMyVirtualAccount,
  requeryVirtualAccount,
} from "@/src/services/virtual-account.service";
import { useWalletStore } from "@/src/store/wallet.store";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

const API_BASE_URL = config.API_BASE_URL?.replace("/api", "") || "";

// Helper function to get quick amounts based on limit
const getQuickAmounts = (singleTransactionLimit: number): number[] => {
  if (singleTransactionLimit >= 100000) {
    return [10000, 50000, 100000]; // TIER_1+
  } else if (singleTransactionLimit >= 50000) {
    return [5000, 10000, 50000]; // TIER_0 high
  } else {
    return [1000, 5000, 10000]; // TIER_0 default
  }
};

type PaymentTab = "card" | "transfer";

interface FundCardResponse {
  reference: string;
  authorizationUrl: string;
  accessCode: string;
}

export default function FundWalletScreen() {
  return (
    <SentryErrorBoundary>
      <FundWalletContent />
    </SentryErrorBoundary>
  );
}

function FundWalletContent() {
  const { isDark } = useTheme();
  const { balance, dailyRemaining, singleTransactionLimit, kycTier } =
    useWalletStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<PaymentTab>("card");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [authUrl, setAuthUrl] = useState("");
  const [paymentReference, setPaymentReference] = useState("");

  // Fetch virtual account
  const { data: virtualAccount, isPending: isLoadingVirtualAccount } = useQuery(
    {
      queryKey: ["virtual-account"],
      queryFn: getMyVirtualAccount,
      enabled: activeTab === "transfer",
    }
  );

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleFundWithCard = async () => {
    const amountValue = parseFloat(amount);

    // Validation
    if (!amount || amountValue <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    if (amountValue < 100) {
      Alert.alert("Invalid Amount", "Minimum funding amount is ₦100");
      return;
    }

    // Check single transaction limit
    const maxAmount = parseFloat(singleTransactionLimit.toString());
    if (amountValue > maxAmount) {
      Alert.alert(
        "Amount Exceeds Limit",
        `Maximum funding amount for your account (${kycTier}) is ${formatCurrency(maxAmount)}.\n\nUpgrade your KYC tier to increase limits.`
      );
      return;
    }

    // Check daily remaining limit
    const dailyRemainingValue = parseFloat(dailyRemaining.toString());
    if (amountValue > dailyRemainingValue) {
      Alert.alert(
        "Daily Limit Exceeded",
        `You have ${formatCurrency(dailyRemainingValue)} remaining in your daily limit.\n\nTry again tomorrow or upgrade your KYC tier.`
      );
      return;
    }

    setIsLoading(true);
    try {
      // PRODUCTION: Uncomment this when app is installed on device
      // const callbackUrl = "raverpay://funding/callback";

      // DEVELOPMENT: Use ngrok URL for Expo Go testing
      const callbackUrl = `${API_BASE_URL}/api/payments/funding/callback`;

      const response = await apiClient.post<FundCardResponse>(
        API_ENDPOINTS.TRANSACTIONS.FUND_CARD,
        {
          amount: amountValue,
          callbackUrl,
        }
      );

      setPaymentReference(response.data.reference);
      setAuthUrl(response.data.authorizationUrl);
      setShowWebView(true);
    } catch (error: any) {
      Alert.alert(
        "Payment Error",
        error?.response?.data?.message || "Failed to initialize payment"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleWebViewNavigationChange = (navState: any) => {
    const { url } = navState;

    // Detect callback URL (works for both ngrok and deep link)
    if (url.includes("funding/callback")) {
      // Extract reference from URL
      const urlObj = new URL(url);
      const reference =
        urlObj.searchParams.get("reference") ||
        urlObj.searchParams.get("trxref") || // Paystack uses 'trxref'
        paymentReference;

      if (reference) {
        handleVerifyPayment(reference);
      }
    }
  };

  const handleVerifyPayment = async (reference: string) => {
    setShowWebView(false);
    setIsVerifying(true);

    try {
      const response = await apiClient.get(
        API_ENDPOINTS.TRANSACTIONS.VERIFY(reference)
      );

      // Invalidate wallet and transaction queries
      await queryClient.invalidateQueries({ queryKey: ["wallet"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });

      Alert.alert(
        "Payment Successful!",
        `Your wallet has been funded with ${formatCurrency(parseFloat(response.data.amount))}`,
        [
          {
            text: "Done",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Verification Failed",
        error?.response?.data?.message ||
          "Failed to verify payment. Please contact support if money was deducted."
      );
    } finally {
      setIsVerifying(false);
      setAmount("");
      setPaymentReference("");
      setAuthUrl("");
    }
  };

  const handleCopyAccountNumber = async () => {
    if (virtualAccount) {
      await Clipboard.setString(virtualAccount.accountNumber);
      toast.success({
        title: "Copied!",
        message: "Account number copied to clipboard",
      });
    }
  };

  const handleShareAccount = async () => {
    if (virtualAccount) {
      try {
        await Share.share({
          message: `My Raverpay Account Details:\n\nBank: ${virtualAccount.bankName}\nAccount Number: ${virtualAccount.accountNumber}\nAccount Name: ${virtualAccount.accountName}`,
        });
      } catch {
        // User cancelled share
      }
    }
  };

  const handleRequeryAccount = async () => {
    try {
      await requeryVirtualAccount();
      toast.success({
        title: "Checking...",
        message: "Checking for pending transactions",
      });
      // Refetch wallet to show updated balance
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["wallet"] });
      }, 3000);
    } catch (error: any) {
      toast.error({
        title: "Failed",
        message:
          error.response?.data?.message || "Failed to check for transactions",
      });
    }
  };

  const handleRequestVirtualAccount = () => {
    router.push("/virtual-account/consent");
  };

  const handleCancelPayment = async () => {
    Alert.alert(
      "Cancel Payment",
      "Are you sure you want to cancel this payment?",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            if (paymentReference) {
              try {
                await apiClient.post(
                  API_ENDPOINTS.TRANSACTIONS.CANCEL(paymentReference)
                );
              } catch (error) {
                // Silently fail - transaction will be cancelled or verified later
                console.log("Failed to cancel transaction:", error);
              }
            }
            setShowWebView(false);
            setAuthUrl("");
            setPaymentReference("");
          },
        },
      ]
    );
  };

  // Show WebView for payment
  if (showWebView && authUrl) {
    return (
      <View className="flex-1 bg-white dark:bg-gray-800">
        <StatusBar style={isDark ? "light" : "dark"} />

        {/* Header */}
        <ScreenHeader
          title="Complete Payment"
          backIcon="close"
          onBack={handleCancelPayment}
          disabled={isVerifying}
          withPadding={true}
        />

        <WebView
          source={{ uri: authUrl }}
          onNavigationStateChange={handleWebViewNavigationChange}
          startInLoadingState={true}
          renderLoading={() => (
            <View className="flex-1 items-center justify-center bg-white dark:bg-gray-800">
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text variant="body" color="secondary" className="mt-4">
                Loading payment page...
              </Text>
            </View>
          )}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50 dark:bg-gray-900"
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <ScreenHeader
        title="Fund Wallet"
        disabled={isLoading || isVerifying}
        subtitle={balance}
      />

      <ScrollView
        className="flex-1 px-5 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 200 }}
      >
        {/* Balance Card */}
        {/* <Card variant="primary" className="p-5 mb-6 bg-[#5B55F6]">
          <Text variant="caption" className="text-purple-100 mb-2">
            Current Balance
          </Text>
          <Text variant="h2" className="text-white">
            {formatCurrency(balance)}
          </Text>
          <Text variant="caption" className=" mt-2">
            Daily remaining:{" "}
            {formatCurrency(parseFloat(dailyRemaining.toString()))}
          </Text>
        </Card> */}

        {/* Tabs */}
        <View className="flex-row mb-6 bg-gray-200 dark:bg-gray-700 rounded-xl p-1">
          <TouchableOpacity
            className={`flex-1 py-3 rounded-lg ${activeTab === "card" ? "bg-white dark:bg-gray-800" : ""}`}
            onPress={() => setActiveTab("card")}
          >
            <Text
              variant="bodyMedium"
              align="center"
              className={
                activeTab === "card"
                  ? "text-[#5B55F6] dark:text-[#5B55F6]"
                  : "text-gray-600 dark:text-gray-400"
              }
            >
              Pay with Card
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 py-3 rounded-lg ${activeTab === "transfer" ? "bg-white dark:bg-gray-800" : ""}`}
            onPress={() => setActiveTab("transfer")}
          >
            <Text
              variant="bodyMedium"
              align="center"
              className={
                activeTab === "transfer"
                  ? "text-[#5B55F6] dark:text-[#5B55F6]"
                  : "text-gray-600 dark:text-gray-400"
              }
            >
              Bank Transfer
            </Text>
          </TouchableOpacity>
        </View>

        {/* Card Tab Content */}
        {activeTab === "card" && (
          <>
            {/* Amount Input */}
            <Card variant="elevated" className="p-5 mb-4">
              <Text variant="h5" className="mb-4">
                Enter Amount
              </Text>

              <Input
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />

              {/* Quick Amounts */}
              <View className="flex-row justify-between mt-4 gap-2">
                {getQuickAmounts(
                  parseFloat(singleTransactionLimit.toString())
                ).map((value) => (
                  <TouchableOpacity
                    key={value}
                    onPress={() => handleQuickAmount(value)}
                    className="flex-1 min-w-[30%]"
                  >
                    <Card
                      variant={
                        amount === value.toString() ? "filled" : "elevated"
                      }
                      className={`p-3 items-center ${
                        amount === value.toString()
                          ? "bg-purple-100 border-2 border-[#5B55F6]"
                          : ""
                      }`}
                    >
                      <Text variant="caption" weight="semibold">
                        {formatCurrency(value)}
                      </Text>
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            {/* Limit Info */}
            <Card variant="elevated" className="p-4 mb-4 bg-purple-50">
              <View className="flex-row items-start">
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color="#5B55F6"
                />
                <View className="ml-3 flex-1">
                  <Text variant="bodyMedium" className="text-purple-800 mb-1">
                    Your Limits ({kycTier})
                  </Text>
                  <Text variant="caption" className="text-purple-700">
                    Max per transaction:{" "}
                    {formatCurrency(
                      parseFloat(singleTransactionLimit.toString())
                    )}
                  </Text>
                  <Text variant="caption" className="text-purple-700">
                    Daily remaining:{" "}
                    {formatCurrency(parseFloat(dailyRemaining.toString()))}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Fee Info */}
            {/* <Card variant="elevated" className="p-4 mb-6 bg-blue-50">
              <View className="flex-row items-start">
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color="#3B82F6"
                />
                <View className="ml-3 flex-1">
                  {(() => {
                    const amountValue = parseFloat(amount) || 0;
                    let fee = 0;

                    if (amountValue < 2500) {
                      // ₦100 fee waived, only charge 1.5%
                      fee = amountValue * 0.015;
                    } else {
                      // Full fee: 1.5% + ₦100, capped at ₦2,000
                      fee = Math.min(amountValue * 0.015 + 100, 2000);
                    }

                    const totalCharge = amountValue + fee;

                    return (
                      <>
                        <Text
                          variant="bodyMedium"
                          className="text-blue-800 mb-1"
                        >
                          Payment Summary
                        </Text>
                        {amountValue === 0 ? (
                          <Text variant="caption" className="text-blue-700">
                            Under ₦2,500: Only 1.5% • ₦2,500+: 1.5% + ₦100
                          </Text>
                        ) : (
                          <>
                            <View className="space-y-1">
                              <Text variant="caption" className="text-blue-700">
                                Amount to add: {formatCurrency(amountValue)}
                              </Text>
                              <Text variant="caption" className="text-blue-700">
                                Processing fee: {formatCurrency(fee)}{" "}
                                {amountValue < 2500
                                  ? "(1.5% only, ₦100 waived)"
                                  : "(1.5% + ₦100)"}
                              </Text>
                              <View className="border-t border-blue-200 mt-2 pt-2">
                                <Text
                                  variant="bodyMedium"
                                  className="text-blue-900 font-semibold"
                                >
                                  Total to pay: {formatCurrency(totalCharge)}
                                </Text>
                              </View>
                            </View>
                          </>
                        )}
                      </>
                    );
                  })()}
                </View>
              </View>
            </Card> */}

            {/* Fund Button */}
            <Button
              variant="primary"
              onPress={handleFundWithCard}
              loading={isLoading}
              disabled={isLoading || isVerifying || !amount}
            >
              Fund Wallet
            </Button>
          </>
        )}

        {/* Bank Transfer Tab Content */}
        {activeTab === "transfer" && (
          <>
            {isLoadingVirtualAccount ? (
              <VirtualAccountLoading />
            ) : virtualAccount && virtualAccount.isActive ? (
              <ActiveVirtualAccount
                virtualAccount={virtualAccount}
                onCopyAccountNumber={handleCopyAccountNumber}
                onShareAccount={handleShareAccount}
                onRequeryAccount={handleRequeryAccount}
              />
            ) : (
              <RequestVirtualAccount
                onRequestAccount={handleRequestVirtualAccount}
              />
            )}
          </>
        )}

        <View className="h-8" />
      </ScrollView>

      {/* Payment Verification Overlay */}
      {isVerifying && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center z-50">
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-8 mx-8 items-center">
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text variant="h3" className="mt-6 mb-2">
              Verifying Payment
            </Text>
            <Text variant="body" color="secondary" align="center">
              Please wait while we confirm your transaction...
            </Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
