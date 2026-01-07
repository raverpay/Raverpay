// app/buy-waec-result.tsx

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
  usePurchaseWAECResult,
  useWAECResultVariations,
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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { TransactionDetail } from "./transaction-success";

export default function BuyWAECResultScreen() {
  const { isDark } = useTheme();
  const { balance } = useWalletStore();
  const { hasPinSet } = useUserStore();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [phone, setPhone] = useState("");
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showPINModal, setShowPINModal] = useState(false);
  const [pendingCashback, setPendingCashback] = useState<{
    use: boolean;
    amount: number;
  }>({ use: false, amount: 0 });

  const { data: variationsData, isPending: loadingVariations } =
    useWAECResultVariations();

  const { mutate: purchaseResult, isPending: isPurchasing } =
    usePurchaseWAECResult();

  const variations = variationsData || [];
  // console.log(variations, "variations");
  const product = variations[0]; // waecdirect
  const amount = product ? parseFloat(product.variation_amount) : 0;

  // console.log(product, "product");

  // Cashback hooks
  const { data: cashbackWallet } = useCashbackWallet();
  const { mutate: calculateCashback } = useCalculateCashback();
  const cashbackAvailable = cashbackWallet?.availableBalance || 0;
  const [cashbackToEarn, setCashbackToEarn] = React.useState(0);

  // Calculate cashback
  React.useEffect(() => {
    if (amount > 0) {
      calculateCashback(
        {
          serviceType: "WAEC_RESULT",
          provider: "WAEC",
          amount: amount,
        },
        {
          onSuccess: (data) => {
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
    }
  }, [amount, calculateCashback]);

  const handlePhoneChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "").slice(0, 11);
    setPhone(numericValue);
  };

  const isValidPhone = /^0[7-9][0-1]\d{8}$/.test(phone);

  const handlePayment = () => {
    if (!isValidPhone) {
      Alert.alert(
        "Invalid Phone",
        "Please enter a valid Nigerian phone number"
      );
      return;
    }

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
    purchaseResult(
      {
        phone,
        pin,
        variationCode: product?.variation_code || "waecdirect",
        useCashback: pendingCashback.use,
        cashbackAmount: pendingCashback.amount,
      },
      {
        onSuccess: async (data) => {
          setShowPINModal(false);

          // Parse cards from serialized JSON
          let parsedCards = [];
          try {
            parsedCards = JSON.parse(data.cards);
            // setPurchasedCards(parsedCards);
          } catch {
            parsedCards = [{ Serial: "N/A", Pin: data.cards }];
            //ssetPurchasedCards(parsedCards);
          }

          queryClient.invalidateQueries({ queryKey: ["wallet"] });
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
          queryClient.invalidateQueries({ queryKey: ["vtu-orders"] });
          queryClient.invalidateQueries({ queryKey: ["cashback-wallet"] });
          queryClient.invalidateQueries({ queryKey: ["cashback", "wallet"] });
          queryClient.invalidateQueries({ queryKey: ["cashback", "history"] });

          await handleSuccessfulTransaction();

          // Navigate to success screen
          const successDetails: TransactionDetail[] = [
            {
              label: "Service",
              value: "WAEC Result Checker",
            },
            {
              label: "Phone Number",
              value: phone,
            },
            {
              label: "Cards Purchased",
              value: parsedCards.length.toString(),
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
              serviceType: "WAEC Result Checker",
              amount: amount.toString(),
              reference: data.reference || "",
              cashbackEarned: (data.cashbackEarned || 0).toString(),
              cashbackRedeemed: pendingCashback.use
                ? pendingCashback.amount.toString()
                : "0",
              details: JSON.stringify(successDetails),
              waecCards: JSON.stringify(parsedCards),
            },
          });
        },
        onError: () => {
          setShowPINModal(false);
        },
      }
    );
  };

  const isFormValid = isValidPhone && !isPurchasing && product;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? "#000000" : "#FFFFFF",
      }}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <ScreenHeader title="WAEC Result Checker" subtitle={balance} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 100,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Product Info */}
          {loadingVariations ? (
            <Skeleton className="h-24 w-full my-4" />
          ) : product ? (
            <Card className="my-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 p-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="document-text" size={24} color="#22c55e" />
                <View className="flex-row ">
                  <Text className="ml-2" variant="h4">
                    {product.name} {" - "}
                  </Text>
                  <Text className="font-bold text-green-600" variant="h4">
                    {formatCurrency(amount)}
                  </Text>
                </View>
              </View>
            </Card>
          ) : null}

          {/* Phone Input */}
          <Card className="my-2 p-4">
            <Text className="font-semibold mb-3">Phone Number</Text>
            <Input
              placeholder="08012345678"
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              maxLength={11}
            />
            {phone.length === 11 && !isValidPhone && (
              <Text className="text-sm text-red-500 mt-2">
                Invalid Nigerian phone number
              </Text>
            )}
          </Card>

          {/* Cashback Section */}
          {/* {cashbackToEarn > 0 && isValidPhone && (
            <Card className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
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
          )} */}

          {/* {cashbackAvailable > 0 && isValidPhone && !pendingCashback.use && (
            <Card className="mb-4">
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
            <Card className="mb-4 bg-green-50 dark:bg-green-900/20">
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

          {/* Purchased Cards Display */}
          {/* {purchasedCards && Array.isArray(purchasedCards) && (
            <Card className="mb-4 bg-primary/10 border-primary">
              <View className="flex-row items-center mb-3">
                <Ionicons name="card" size={24} color="#3b82f6" />
                <Text className="ml-2 font-bold text-lg text-primary">
                  Your Result Checker PIN{purchasedCards.length > 1 ? "s" : ""}
                </Text>
              </View>
              <View className="space-y-3">
                {purchasedCards.map((card: any, index: number) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleCopyCard(card.Serial, card.Pin)}
                    className="bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-dashed border-primary"
                  >
                    <View className="space-y-2">
                      <View className="flex-row justify-between">
                        <Text className="text-sm text-gray-500">Serial:</Text>
                        <Text className="font-mono font-bold">
                          {card.Serial}
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-sm text-gray-500">PIN:</Text>
                        <Text className="font-mono font-bold text-primary">
                          {card.Pin}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center justify-center mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <Ionicons name="copy-outline" size={14} color="#3b82f6" />
                      <Text className="ml-1 text-xs text-primary">
                        Tap to copy
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
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
            Buy WAEC Result Checker
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
        serviceType="WAEC Result Checker"
        details={[
          { label: "Service", value: "WAEC Result Checker" },
          { label: "Phone Number", value: phone },
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
        subtitle="Confirm WAEC Result Checker purchase"
      />
    </View>
  );
}
