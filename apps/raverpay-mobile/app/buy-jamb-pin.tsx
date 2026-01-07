// app/buy-jamb-pin.tsx

import {
  Button,
  Card,
  ConfirmationModal,
  Input,
  PINModal,
  ScreenHeader,
  Skeleton,
  Text,
} from "@/src/components/ui";
import {
  useCalculateCashback,
  useCashbackWallet,
} from "@/src/hooks/useCashback";
import {
  useJAMBVariations,
  usePurchaseJAMBPin,
  useVerifyJAMBProfile,
} from "@/src/hooks/useEducation";
import { useTheme } from "@/src/hooks/useTheme";
import { formatCurrency } from "@/src/lib/utils/formatters";
import { checkPinSetOrPrompt } from "@/src/lib/utils/pin-helper";
import { handleSuccessfulTransaction } from "@/src/lib/utils/rating-helper";
import { useUserStore } from "@/src/store/user.store";
import { useWalletStore } from "@/src/store/wallet.store";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { TransactionDetail } from "./transaction-success";

export default function BuyJAMBPinScreen() {
  const { isDark } = useTheme();
  const { balance } = useWalletStore();
  const { hasPinSet } = useUserStore();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [profileId, setProfileId] = useState("");
  const [selectedVariation, setSelectedVariation] = useState<string | null>(
    null
  );
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showPINModal, setShowPINModal] = useState(false);
  const [pendingCashback, setPendingCashback] = useState<{
    use: boolean;
    amount: number;
  }>({ use: false, amount: 0 });

  const { data: variationsData, isPending: loadingVariations } =
    useJAMBVariations();
  const { mutate: verifyProfile, isPending: isVerifying } =
    useVerifyJAMBProfile();
  const { mutate: purchasePin, isPending: isPurchasing } = usePurchaseJAMBPin();

  const variations = variationsData || [];

  // Cashback hooks
  const { data: cashbackWallet } = useCashbackWallet();
  const { mutate: calculateCashback } = useCalculateCashback();
  const cashbackAvailable = cashbackWallet?.availableBalance || 0;
  const [cashbackToEarn, setCashbackToEarn] = React.useState(0);

  // Get selected variation details
  const selectedVariationData = variations.find(
    (v: any) => v.variation_code === selectedVariation
  );
  const amount = selectedVariationData
    ? parseFloat(selectedVariationData.variation_amount)
    : 0;

  // Calculate cashback when variation changes
  React.useEffect(() => {
    if (selectedVariation && amount > 0) {
      calculateCashback(
        {
          serviceType: "JAMB",
          provider: "JAMB",
          amount: amount,
        },
        {
          onSuccess: (data: any) => {
            if (data.isEligible) {
              setCashbackToEarn(data.cashbackAmount);
            } else {
              setCashbackToEarn(0);
            }
          },
          onError: () => {
            setCashbackToEarn(0);
          },
        }
      );
    } else {
      setCashbackToEarn(0);
    }
  }, [amount, selectedVariation, calculateCashback]);

  const handleProfileIdChange = (value: string) => {
    // Only allow numbers and max 10 digits
    const numericValue = value.replace(/[^0-9]/g, "").slice(0, 10);
    const previousLength = profileId.length;
    setProfileId(numericValue);

    // Clear customer info if profile ID changes
    if (customerInfo) {
      setCustomerInfo(null);
    }

    // Auto-verify when user enters the 10th digit
    if (
      numericValue.length === 10 &&
      numericValue.length > previousLength &&
      !customerInfo &&
      selectedVariation
    ) {
      handleVerify(numericValue);
    }
  };

  const handleVariationChange = (variationCode: string) => {
    setSelectedVariation(variationCode);
    setCustomerInfo(null);

    // Auto-verify if profile ID is already complete
    if (profileId.length === 10) {
      handleVerify(profileId, variationCode);
    }
  };

  const handleVerify = (profileIdValue?: string, variationCode?: string) => {
    const idToVerify = profileIdValue || profileId;
    const codeToVerify = variationCode || selectedVariation;

    if (idToVerify.length !== 10) {
      Alert.alert(
        "Invalid Profile ID",
        "JAMB Profile ID must be exactly 10 digits"
      );
      return;
    }

    if (!codeToVerify) {
      Alert.alert("Select Plan", "Please select a JAMB plan first");
      return;
    }

    verifyProfile(
      {
        profileId: idToVerify,
        variationCode: codeToVerify,
      },
      {
        onSuccess: (data: any) => {
          setCustomerInfo({
            name: data.customerName,
            profileId: data.profileId,
          });
        },
      }
    );
  };

  const handlePayment = () => {
    // Calculate amount after cashback discount
    const amountToPay = pendingCashback.use
      ? amount - pendingCashback.amount
      : amount;

    if (amountToPay > balance) {
      Alert.alert(
        "Insufficient Balance",
        "Please fund your wallet to continue"
      );
      return;
    }

    setShowConfirmationModal(true);
  };

  const handleConfirm = async () => {
    setShowConfirmationModal(false);
    const hasPIN = await checkPinSetOrPrompt(hasPinSet);
    if (!hasPIN) return;
    setShowPINModal(true);
  };

  const handlePINSubmit = (pin: string) => {
    purchasePin(
      {
        profileId,
        variationCode: selectedVariation!,
        pin,
        useCashback: pendingCashback.use,
        cashbackAmount: pendingCashback.amount,
      },
      {
        onSuccess: async (data: any) => {
          setShowPINModal(false);
          setPurchasedPin(data.pin);

          // Refresh wallet and transactions
          queryClient.invalidateQueries({ queryKey: ["wallet"] });
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
          queryClient.invalidateQueries({ queryKey: ["vtu-orders"] });
          queryClient.invalidateQueries({ queryKey: ["cashback-wallet"] });
          queryClient.invalidateQueries({ queryKey: ["cashback", "wallet"] });
          queryClient.invalidateQueries({ queryKey: ["cashback", "history"] });

          // Handle rating prompt
          await handleSuccessfulTransaction();

          // Navigate to success screen with transaction data
          const successDetails: TransactionDetail[] = [
            {
              label: "Plan",
              value: selectedVariationData?.name || "",
            },
            {
              label: "Profile ID",
              value: profileId,
            },
            {
              label: "Customer Name",
              value: customerInfo?.name || "-",
            },
            {
              label: "Amount",
              value: formatCurrency(amount),
              highlight: true,
            },
          ];

          router.push({
            pathname: "/transaction-success",
            params: {
              serviceType: "JAMB PIN Purchase",
              amount: amount.toString(),
              reference: data.reference || "",
              cashbackEarned: (data.cashbackEarned || 0).toString(),
              cashbackRedeemed: pendingCashback.use
                ? pendingCashback.amount.toString()
                : "0",
              details: JSON.stringify(successDetails),
              jambPin: data.pin || "",
            },
          });
        },
        onError: () => {
          setShowPINModal(false);
        },
      }
    );
  };

  const isFormValid =
    selectedVariation &&
    profileId.length === 10 &&
    customerInfo &&
    !isPurchasing;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? "#000000" : "#FFFFFF",
      }}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <ScreenHeader title="Buy JAMB PIN" subtitle={balance} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 100,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Variation Selection */}
          <Card className="p-4 my-6 ">
            <Text className="font-semibold mb-3">Select Plan</Text>
            {loadingVariations ? (
              <View className="space-y-2 gap-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </View>
            ) : (
              <View className="space-y-2">
                {variations.map((variation: any) => (
                  <TouchableOpacity
                    key={variation.variation_code}
                    onPress={() =>
                      handleVariationChange(variation.variation_code)
                    }
                    className={`p-4 mb-4 rounded-lg border-2 ${
                      selectedVariation === variation.variation_code
                        ? "border-2 border-[#5B55F6]"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <View className="flex-row justify-between items-center">
                      <View className="flex-1">
                        <Text className="font-medium">{variation.name}</Text>
                      </View>
                      <Text className="font-bold text-primary">
                        {formatCurrency(parseFloat(variation.variation_amount))}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card>

          {/* Profile ID Input */}
          {selectedVariation && (
            <Card className="mb-4 p-4">
              <Text className="font-semibold mb-3">JAMB Profile ID</Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Enter your 10-digit JAMB Profile ID (from JAMB website)
              </Text>
              <Input
                placeholder="1234567890"
                value={profileId}
                onChangeText={handleProfileIdChange}
                keyboardType="number-pad"
                maxLength={10}
                editable={!isVerifying}
              />
              {isVerifying && (
                <View className="mt-3 flex-row items-center">
                  <Ionicons
                    name="hourglass-outline"
                    size={16}
                    color={isDark ? "#9ca3af" : "#6b7280"}
                  />
                  <Text className="ml-2 text-sm text-gray-500">
                    Verifying profile...
                  </Text>
                </View>
              )}
            </Card>
          )}

          {/* Customer Info */}
          {customerInfo && (
            <Card className="mb-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 p-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                <Text className="ml-2 font-semibold text-green-700 dark:text-green-400">
                  Profile Verified
                </Text>
              </View>
              <View className="space-y-1">
                <View className="flex-row justify-between">
                  <Text
                    className=" text-gray-600 dark:text-gray-400"
                    variant="h5"
                  >
                    Name:
                  </Text>
                  <Text className=" font-medium" variant="h5">
                    {customerInfo.name}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text
                    className=" text-gray-600 dark:text-gray-400"
                    variant="h5"
                  >
                    Profile ID:
                  </Text>
                  <Text className=" font-medium" variant="h5">
                    {customerInfo.profileId}
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {/* Cashback Section */}
          {cashbackToEarn > 0 && customerInfo && (
            <Card className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 p-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="gift" size={20} color="#f59e0b" />
                <Text className="ml-2 font-semibold text-yellow-700 dark:text-yellow-400">
                  Cashback Reward
                </Text>
              </View>
              <Text className="text-sm">
                Earn {formatCurrency(cashbackToEarn)} cashback on this purchase
              </Text>
            </Card>
          )}

          {/* {cashbackAvailable > 0 && customerInfo && !pendingCashback.use && (
            <Card className="mb-4 p-4">
              <View className="flex-row items-center justify-between mb-2">
                <View>
                  <Text className="font-semibold">Use Cashback?</Text>
                  <Text className="text-sm text-gray-500">
                    Available: {formatCurrency(cashbackAvailable)}
                  </Text>
                </View>
                <Button
                  onPress={() => {
                    const maxCashback = Math.min(cashbackAvailable, amount);
                    handleCashbackToggle(maxCashback);
                  }}
                  variant="outline"
                  size="sm"
                >
                  Use Cashback
                </Button>
              </View>
            </Card>
          )} */}

          {/* {pendingCashback.use && (
            <Card className="mb-4 bg-green-50 dark:bg-green-900/20 p-4">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="font-semibold text-green-700 dark:text-green-400">
                    Cashback Applied
                  </Text>
                  <Text className="text-sm">
                    -{formatCurrency(pendingCashback.amount)}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleClearCashback}>
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </Card>
          )} */}

          {/* Purchased PIN Display */}
          {/* {purchasedPin && (
            <Card className="mb-4 bg-primary/10 border-primary">
              <View className="flex-row items-center mb-3">
                <Ionicons name="key" size={24} color="#3b82f6" />
                <Text className="ml-2 font-bold text-lg text-primary">
                  Your JAMB PIN
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleCopyPin}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-dashed border-primary"
              >
                <Text className="text-center text-2xl font-mono font-bold text-primary tracking-widest">
                  {purchasedPin}
                </Text>
                <View className="flex-row items-center justify-center mt-2">
                  <Ionicons name="copy-outline" size={16} color="#3b82f6" />
                  <Text className="ml-1 text-sm text-primary">Tap to copy</Text>
                </View>
              </TouchableOpacity>
            </Card>
          )} */}
        </ScrollView>

        {/* Floating Purchase Button */}
        <View
          className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-5 pt-4"
          style={{ paddingBottom: Math.max(insets.bottom, 24) }}
        >
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={handlePayment}
            disabled={!isFormValid}
          >
            Buy JAMB PIN
          </Button>
        </View>
      </KeyboardAvoidingView>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        onConfirm={(useCashback: boolean, cashbackAmount: number) => {
          setPendingCashback({ use: useCashback, amount: cashbackAmount });
          handleConfirm();
        }}
        serviceType="JAMB PIN Purchase"
        details={[
          { label: "Plan", value: selectedVariationData?.name || "" },
          { label: "Profile ID", value: profileId },
          { label: "Customer Name", value: customerInfo?.name || "-" },
          { label: "Amount", value: formatCurrency(amount), highlight: true },
        ]}
        amount={amount}
        currentBalance={balance}
        cashbackAvailable={cashbackAvailable}
        cashbackToEarn={cashbackToEarn}
      />

      {/* PIN Modal */}
      <PINModal
        visible={showPINModal}
        onClose={() => setShowPINModal(false)}
        onSubmit={handlePINSubmit}
        loading={isPurchasing}
        title="Enter PIN"
        subtitle="Confirm JAMB PIN purchase"
      />
    </View>
  );
}
