// app/buy-airtime.tsx
import { SentryErrorBoundary } from "@/src/components/SentryErrorBoundary";
import {
  BottomSheet,
  Button,
  Card,
  ConfirmationModal,
  ContactPicker,
  Input,
  PINModal,
  ScreenHeader,
  Text,
  TransactionDetail,
} from "@/src/components/ui";
import { detectNetwork } from "@/src/constants/network-prefixes";
import { NETWORK_PROVIDERS } from "@/src/constants/vtu";
import {
  useCalculateCashback,
  useCashbackWallet,
} from "@/src/hooks/useCashback";
import { useTheme } from "@/src/hooks/useTheme";
import {
  usePurchaseAirtime,
  useSavedRecipients,
  type SavedRecipient,
} from "@/src/hooks/useVTU";
import { formatCurrency } from "@/src/lib/utils/formatters";
import { checkPinSetOrPrompt } from "@/src/lib/utils/pin-helper";
import { handleSuccessfulTransaction } from "@/src/lib/utils/rating-helper";
import { useUserStore } from "@/src/store/user.store";
import { useWalletStore } from "@/src/store/wallet.store";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000];

export default function BuyAirtimeScreen() {
  return (
    <SentryErrorBoundary>
      <BuyAirtimeContent />
    </SentryErrorBoundary>
  );
}

function BuyAirtimeContent() {
  const { isDark } = useTheme();
  const { balance } = useWalletStore();
  const { hasPinSet } = useUserStore();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showPINModal, setShowPINModal] = useState(false);
  const [showRecipientsSheet, setShowRecipientsSheet] = useState(false);
  const [showContactsSheet, setShowContactsSheet] = useState(false);
  const [autoDetectedNetwork, setAutoDetectedNetwork] = useState<string | null>(
    null
  );

  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [pendingCashback, setPendingCashback] = useState<{
    use: boolean;
    amount: number;
  }>({ use: false, amount: 0 });

  // Animation values for auto-detection
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { mutate: purchaseAirtime, isPending: isPurchasing } =
    usePurchaseAirtime();

  const { data: savedRecipients = [] } = useSavedRecipients("AIRTIME");

  // Cashback hooks
  const { data: cashbackWallet } = useCashbackWallet();
  const { mutate: calculateCashback } = useCalculateCashback();
  const cashbackAvailable = cashbackWallet?.availableBalance || 0;
  const [cashbackToEarn, setCashbackToEarn] = useState(0);

  const handleSelectContact = () => {
    setShowContactsSheet(true);
  };

  const handleContactSelect = (phoneNumber: string) => {
    setPhoneNumber(phoneNumber);
  };

  const handlePhoneNumberChange = (text: string) => {
    setPhoneNumber(text);

    // Auto-detect network when user types at least 4 digits
    if (text.length >= 4) {
      const detected = detectNetwork(text);
      if (detected) {
        setAutoDetectedNetwork(detected);

        // Only auto-select if user hasn't manually selected a different network
        if (!selectedNetwork || isAutoDetected) {
          setSelectedNetwork(detected);
          setIsAutoDetected(true);

          // Trigger animations
          triggerAutoDetectAnimation();
        }
      } else {
        setAutoDetectedNetwork(null);
        if (isAutoDetected) {
          setSelectedNetwork(null);
          setIsAutoDetected(false);
        }
      }
    } else {
      setAutoDetectedNetwork(null);
      if (isAutoDetected) {
        setSelectedNetwork(null);
        setIsAutoDetected(false);
      }
    }
  };

  const handleNetworkSelect = (network: string) => {
    setSelectedNetwork(network);
    setIsAutoDetected(false); // User manually selected, disable auto-detection
  };

  const triggerAutoDetectAnimation = () => {
    // Pulse animation
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Fade in badge
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleRecipientSelect = (recipient: SavedRecipient) => {
    setPhoneNumber(recipient.recipient);
    setSelectedNetwork(recipient.provider.toLowerCase());
    setIsAutoDetected(false);
    setShowRecipientsSheet(false);
  };

  // Calculate cashback when amount or network changes
  React.useEffect(() => {
    if (selectedNetwork && amount && parseFloat(amount) >= 50) {
      const amountValue = parseFloat(amount);

      calculateCashback(
        {
          serviceType: "AIRTIME",
          provider: selectedNetwork.toUpperCase(),
          amount: amountValue,
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
    } else {
      setCashbackToEarn(0);
    }
  }, [amount, selectedNetwork, calculateCashback]);

  const handlePurchase = () => {
    const amountValue = parseFloat(amount);

    // Validation
    if (amountValue < 50) {
      Alert.alert("Invalid Amount", "Minimum amount is ₦50");
      return;
    }

    if (amountValue > 50000) {
      Alert.alert("Invalid Amount", "Maximum amount is ₦50,000");
      return;
    }

    // Calculate amount after cashback discount
    const amountToPay = pendingCashback.use
      ? amountValue - pendingCashback.amount
      : amountValue;

    if (amountToPay > balance) {
      Alert.alert(
        "Insufficient Balance",
        "Please fund your wallet to continue"
      );
      return;
    }

    // Check if user has set a PIN
    if (!checkPinSetOrPrompt(hasPinSet)) {
      return;
    }

    // Show confirmation modal
    setShowConfirmationModal(true);
  };

  const handleConfirmTransaction = (
    useCashback: boolean,
    cashbackAmount: number
  ) => {
    setPendingCashback({ use: useCashback, amount: cashbackAmount });
    setShowConfirmationModal(false);
    setShowPINModal(true);
  };

  const handlePINSubmit = (pin: string) => {
    purchaseAirtime(
      {
        network: selectedNetwork!,
        phone: phoneNumber,
        amount: parseFloat(amount),
        pin,
        useCashback: pendingCashback.use,
        cashbackAmount: pendingCashback.use
          ? pendingCashback.amount
          : undefined,
      },
      {
        onSuccess: async (data) => {
          setShowPINModal(false);
          // Invalidate wallet and transactions queries
          queryClient.invalidateQueries({ queryKey: ["wallet"] });
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
          queryClient.invalidateQueries({ queryKey: ["cashback", "wallet"] });
          queryClient.invalidateQueries({ queryKey: ["cashback", "history"] });

          // Check if user is eligible for rating prompt
          await handleSuccessfulTransaction();

          // Navigate to success screen with transaction data
          const successDetails: TransactionDetail[] = [
            {
              label: "Network",
              value:
                NETWORK_PROVIDERS.find(
                  (p) => p.code === selectedNetwork?.toLowerCase()
                )?.name ||
                selectedNetwork ||
                "",
            },
            {
              label: "Phone Number",
              value: phoneNumber,
            },
            {
              label: "Amount",
              value: formatCurrency(parseFloat(amount)),
              highlight: true,
            },
          ];

          router.push({
            pathname: "/transaction-success",
            params: {
              serviceType: "Airtime Purchase",
              amount: parseFloat(amount).toString(),
              reference: data.reference || "",
              cashbackEarned: cashbackToEarn.toString(),
              cashbackRedeemed: pendingCashback.use
                ? pendingCashback.amount.toString()
                : "0",
              details: JSON.stringify(successDetails),
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
    selectedNetwork && phoneNumber.length === 11 && parseFloat(amount) >= 50;

  // Prepare transaction details for confirmation modal
  const transactionDetails: TransactionDetail[] = [
    {
      label: "Network",
      value:
        NETWORK_PROVIDERS.find((p) => p.code === selectedNetwork)?.name ||
        selectedNetwork ||
        "",
    },
    {
      label: "Phone Number",
      value: phoneNumber,
    },
    {
      label: "Airtime Amount",
      value: formatCurrency(parseFloat(amount) || 0),
      highlight: true,
    },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50 dark:bg-gray-900"
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}

      <ScreenHeader title="Buy Airtime" subtitle={balance} />

      <ScrollView
        className="flex-1 px-5 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Phone Number */}
        <View className="mb-2">
          <View className="flex-row items-end gap-2">
            <View className="flex-1  h-24">
              <Input
                label="Phone Number"
                placeholder="08012345678"
                value={phoneNumber}
                onChangeText={handlePhoneNumberChange}
                keyboardType="phone-pad"
                maxLength={11}
                leftIcon="call-outline"
              />
            </View>
            <View className=" h-24 flex-row justify-end items-end gap-2 pb-2">
              <TouchableOpacity
                onPress={handleSelectContact}
                className="w-12 h-14 rounded-lg bg-gray-100 dark:bg-gray-700 items-center justify-center mb-1"
              >
                <Ionicons name="people" size={20} color="#6B7280" />
              </TouchableOpacity>
              {savedRecipients.length > 0 && (
                <TouchableOpacity
                  onPress={() => setShowRecipientsSheet(true)}
                  className="w-12 h-14 rounded-xl bg-gray-100 dark:bg-gray-700 items-center justify-center mb-1"
                >
                  <Ionicons name="time-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Network Selection */}
        <View className="mb-6">
          <Text variant="h4" className="mb-2">
            Select Network
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            {NETWORK_PROVIDERS.map((provider) => {
              const isSelected = selectedNetwork === provider.code;
              const isAutoSelected =
                isAutoDetected && autoDetectedNetwork === provider.code;

              return (
                <TouchableOpacity
                  key={provider.code}
                  style={{ width: 100 }}
                  onPress={() => handleNetworkSelect(provider.code)}
                >
                  <Animated.View
                    style={{
                      transform: [{ scale: isAutoSelected ? pulseAnim : 1 }],
                    }}
                  >
                    {isAutoSelected && (
                      <Animated.View
                        style={{ opacity: fadeAnim }}
                        className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1 z-10"
                      >
                        <Ionicons name="checkmark" size={12} color="white" />
                      </Animated.View>
                    )}
                    <Card
                      variant={isSelected ? "filled" : "elevated"}
                      className={`p-4 items-center relative ${
                        isSelected
                          ? "bg-purple-100 dark:bg-purple-900/30 border-2 border-[#5B55F6]"
                          : ""
                      }`}
                    >
                      <Image
                        source={provider.airtimeImage}
                        className="w-8 h-8 mb-2 rounded-full border-2 border-gray-300"
                        resizeMode="contain"
                      />
                      <Text variant="caption" align="center" weight="semibold">
                        {provider.name}
                      </Text>
                    </Card>
                  </Animated.View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Amount */}
        <View className="mb-6">
          <Input
            label="Amount"
            placeholder="Enter amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            leftIcon="cash-outline"
          />

          {/* Quick Amount Buttons */}
          <View className="flex-row flex-wrap justify-between  mt-3 ">
            {QUICK_AMOUNTS.map((value) => (
              <TouchableOpacity
                key={value}
                className={`px-4 py-2 w-[18%]  rounded-lg ${
                  amount === value.toString()
                    ? "bg-[#5B55F6]"
                    : "bg-gray-100 dark:bg-gray-700"
                }`}
                onPress={() => handleQuickAmount(value)}
              >
                <Text
                  variant="caption"
                  weight="semibold"
                  className={
                    amount === value.toString() ? "text-white" : "text-gray-700"
                  }
                >
                  ₦{value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Info Card */}
        <Card
          variant="elevated"
          className="p-4 mb-6 bg-purple-50 dark:bg-purple-900/20"
        >
          <View className="flex-row items-start">
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#8B5CF6"
            />
            <View className="ml-3 flex-1">
              <Text variant="caption" color="secondary">
                • Minimum amount: ₦50{"\n"}• Maximum amount: ₦50,000{"\n"}•
                Airtime will be sent instantly
              </Text>
            </View>
          </View>
        </Card>
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
          onPress={handlePurchase}
          disabled={!isFormValid}
        >
          Buy Airtime
        </Button>
      </View>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        onConfirm={handleConfirmTransaction}
        serviceType="Airtime Purchase"
        details={transactionDetails}
        amount={parseFloat(amount) || 0}
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
        subtitle="Confirm airtime purchase"
      />

      {/* Device Contacts Picker */}
      <ContactPicker
        visible={showContactsSheet}
        onClose={() => setShowContactsSheet(false)}
        onSelectContact={handleContactSelect}
      />

      {/* Saved Recipients Bottom Sheet */}
      <BottomSheet
        visible={showRecipientsSheet}
        onClose={() => setShowRecipientsSheet(false)}
      >
        <View className="flex-row justify-between items-start mb-4">
          <View className="flex-1">
            <Text variant="h4" className="mb-1">
              Recent Numbers
            </Text>
            <Text variant="caption" color="secondary">
              Tap a contact to autofill their number
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowRecipientsSheet(false)}
            className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg"
          >
            <Ionicons
              name="close"
              size={24}
              color={isDark ? "#9CA3AF" : "#6B7280"}
            />
          </TouchableOpacity>
        </View>

        {savedRecipients.length === 0 ? (
          <Card variant="elevated" className="p-4">
            <Text variant="body" color="secondary" align="center">
              No recent numbers yet.
            </Text>
          </Card>
        ) : (
          <View className="gap-3">
            {savedRecipients.map((recipient: SavedRecipient) => (
              <TouchableOpacity
                key={recipient.id}
                onPress={() => handleRecipientSelect(recipient)}
              >
                <Card variant="elevated" className="p-4">
                  <View className="flex-row items-center">
                    <Ionicons
                      name="person-circle-outline"
                      size={32}
                      color="#6B7280"
                    />
                    <View className="ml-3 flex-1">
                      {recipient.recipientName && (
                        <Text
                          variant="bodyMedium"
                          weight="semibold"
                          className="text-gray-900"
                          numberOfLines={1}
                        >
                          {recipient.recipientName}
                        </Text>
                      )}
                      <Text variant="body" className="text-gray-700">
                        {recipient.recipient}
                      </Text>
                      <Text
                        variant="caption"
                        color="secondary"
                        className="mt-1"
                      >
                        {
                          NETWORK_PROVIDERS.find(
                            (p) => p.code === recipient.provider.toLowerCase()
                          )?.name
                        }
                      </Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}
