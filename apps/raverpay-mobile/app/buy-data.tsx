// app/buy-data.tsx
import {
  BottomSheet,
  Button,
  Card,
  ConfirmationModal,
  ContactPicker,
  Input,
  PINModal,
  ScreenHeader,
  Skeleton,
  Text,
  TransactionDetail,
} from "@/src/components/ui";
import { detectNetwork } from "@/src/constants/network-prefixes";
import { NETWORK_PROVIDERS } from "@/src/constants/vtu";
import {
  useCalculateCashback,
  useCashbackConfig,
  useCashbackWallet,
} from "@/src/hooks/useCashback";
import { useTheme } from "@/src/hooks/useTheme";
import {
  useDataPlans,
  usePurchaseData,
  useSMEDataPlans,
  useSavedRecipients,
  type SavedRecipient,
} from "@/src/hooks/useVTU";
import {
  categorizePlans,
  getAvailableCategories,
  type PlanCategory,
} from "@/src/lib/utils/data-plan-helper";
import { formatCurrency } from "@/src/lib/utils/formatters";
import { checkPinSetOrPrompt } from "@/src/lib/utils/pin-helper";
import { handleSuccessfulTransaction } from "@/src/lib/utils/rating-helper";
import { useUserStore } from "@/src/store/user.store";
import { useWalletStore } from "@/src/store/wallet.store";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useQueryClient } from "@tanstack/react-query";
import * as Contacts from "expo-contacts";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useRef, useState } from "react";
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

export default function BuyDataScreen() {
  const { isDark } = useTheme();
  const { balance } = useWalletStore();
  const { hasPinSet } = useUserStore();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isSME, setIsSME] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showPINModal, setShowPINModal] = useState(false);
  const [showRecipientsSheet, setShowRecipientsSheet] = useState(false);
  const [showContactsSheet, setShowContactsSheet] = useState(false);
  // const [deviceContacts, setDeviceContacts] = useState<any[]>([]);
  // const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<PlanCategory>("All Plans");
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

  const { data: regularPlans, isPending: loadingRegular } = useDataPlans(
    selectedNetwork || "",
    !!selectedNetwork && !isSME
  );

  const { data: smePlans, isPending: loadingSME } = useSMEDataPlans(
    selectedNetwork || "",
    !!selectedNetwork && isSME
  );

  const { mutate: purchaseData, isPending: isPurchasing } = usePurchaseData();

  const { data: savedRecipients = [] } = useSavedRecipients("DATA");

  // Cashback hooks
  const { data: cashbackWallet } = useCashbackWallet();
  const { data: cashbackConfig } = useCashbackConfig();
  const { mutate: calculateCashback } = useCalculateCashback();
  const cashbackAvailable = cashbackWallet?.availableBalance || 0;
  const [cashbackToEarn, setCashbackToEarn] = useState(0);

  // Get plans and filter out null values
  const allPlans = useMemo(() => {
    const sourcePlans = isSME ? smePlans?.plans : regularPlans?.plans;
    return Array.isArray(sourcePlans)
      ? sourcePlans.filter((plan) => plan && (plan.code || plan.variation_code))
      : [];
  }, [isSME, smePlans?.plans, regularPlans?.plans]);
  const isLoadingPlans = isSME ? loadingSME : loadingRegular;

  // Categorize plans
  const categorizedPlans = useMemo(() => {
    return categorizePlans(allPlans);
  }, [allPlans]);

  // Get available categories
  const availableCategories = useMemo(() => {
    return getAvailableCategories(categorizedPlans);
  }, [categorizedPlans]);

  // Get current plans based on selected category
  const currentPlans = useMemo(() => {
    return categorizedPlans[selectedCategory] || [];
  }, [categorizedPlans, selectedCategory]);

  // Calculate cashback when plan is selected
  React.useEffect(() => {
    if (selectedPlan && selectedNetwork) {
      const planAmount = parseFloat(
        selectedPlan.variation_amount || selectedPlan.amount || 0
      );

      calculateCashback(
        {
          serviceType: "DATA",
          provider: selectedNetwork.toUpperCase(),
          amount: planAmount,
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
  }, [selectedPlan, selectedNetwork, calculateCashback]);

  const handleSelectContact = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to contacts to use this feature"
        );
        return;
      }

      //setIsLoadingContacts(true);
      setShowContactsSheet(true);
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      if (data.length === 0) {
        Alert.alert("No Contacts", "No contacts found on your device");
        //setIsLoadingContacts(false);
        return;
      }

      // Find contacts with phone numbers
      const contactsWithPhones = data.filter(
        (contact) => contact.phoneNumbers && contact.phoneNumbers.length > 0
      );

      if (contactsWithPhones.length === 0) {
        Alert.alert("No Phone Numbers", "No contacts with phone numbers found");
        // setIsLoadingContacts(false);
        return;
      }

      // Sort contacts alphabetically by name
      // const sortedContacts = contactsWithPhones.sort((a, b) => {
      //   const nameA = a.name || "";
      //   const nameB = b.name || "";
      //   return nameA.localeCompare(nameB);
      // });

      // setDeviceContacts(sortedContacts);
      // setIsLoadingContacts(false);
    } catch (error) {
      console.error("Error selecting contact:", error);
      Alert.alert("Error", "Failed to access contacts");
      // setIsLoadingContacts(false);
    }
  };

  const handleContactSelect = (contact: any) => {
    // Get the first phone number
    const phoneNumber =
      contact.phoneNumbers?.[0]?.number?.replace(/\D/g, "") || "";

    // Normalize phone number (remove country code if present)
    let normalized = phoneNumber;
    if (normalized.startsWith("234")) {
      normalized = "0" + normalized.substring(3);
    } else if (normalized.startsWith("+234")) {
      normalized = "0" + normalized.substring(4);
    } else if (normalized.length === 10 && !normalized.startsWith("0")) {
      normalized = "0" + normalized;
    }

    // Only use first 11 digits
    normalized = normalized.substring(0, 11);

    if (normalized.length === 11) {
      setPhoneNumber(normalized);
      setShowContactsSheet(false);
    } else {
      Alert.alert(
        "Invalid Number",
        "Selected contact has an invalid phone number format"
      );
    }
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
          setSelectedPlan(null); // Reset plan when network changes
          setSelectedCategory("All Plans"); // Reset category when network changes

          // Reset SME toggle if switching away from GLO
          if (detected.toLowerCase() !== "glo") {
            setIsSME(false);
          }

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

  const handleNetworkChange = (network: string) => {
    setSelectedNetwork(network);
    setSelectedPlan(null); // Reset plan when network changes
    setSelectedCategory("All Plans"); // Reset category when network changes
    setIsAutoDetected(false); // User manually selected, disable auto-detection
    // Reset SME toggle if switching away from GLO
    if (network.toLowerCase() !== "glo") {
      setIsSME(false);
    }
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

  const handleSMEToggle = () => {
    setIsSME(!isSME);
    setSelectedPlan(null); // Reset plan when toggling SME
    setSelectedCategory("All Plans"); // Reset category when toggling SME
  };

  const handleRecipientSelect = (recipient: SavedRecipient) => {
    setPhoneNumber(recipient.recipient);
    setSelectedNetwork(recipient.provider.toLowerCase());
    setIsAutoDetected(false);
    setShowRecipientsSheet(false);
  };

  const handlePurchase = () => {
    if (!selectedPlan) return;

    const planAmount = parseFloat(
      selectedPlan.variation_amount || selectedPlan.amount || 0
    );

    // Check balance without cashback (modal will handle cashback calculation)
    if (planAmount > balance) {
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

    setShowConfirmationModal(true);
  };

  const handleConfirmTransaction = (
    useCashback: boolean,
    cashbackAmount: number
  ) => {
    // Store the cashback decision for use in handlePINSubmit
    setPendingCashback({ use: useCashback, amount: cashbackAmount });
    setShowConfirmationModal(false);
    setShowPINModal(true);
  };

  const handlePINSubmit = (pin: string) => {
    const productCode = selectedPlan?.variation_code || selectedPlan?.code;

    if (!productCode) {
      Alert.alert(
        "Invalid Plan",
        "We couldn't find the selected plan details. Please select a plan again."
      );
      return;
    }

    purchaseData(
      {
        network: selectedNetwork!,
        phone: phoneNumber,
        productCode,
        isSME,
        pin,
        useCashback: pendingCashback.use,
        cashbackAmount: pendingCashback.use
          ? pendingCashback.amount
          : undefined,
      },
      {
        onSuccess: async (data) => {
          setShowPINModal(false);
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
              label: "Data Plan",
              value: selectedPlan?.name || "",
              highlight: true,
            },
          ];

          // Add SME indicator if applicable
          if (selectedNetwork?.toLowerCase() === "glo" && isSME) {
            successDetails.push({
              label: "Plan Type",
              value: "SME Data",
            });
          }

          router.push({
            pathname: "/transaction-success",
            params: {
              serviceType: "Data Purchase",
              amount: planAmount.toString(),
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
    selectedNetwork && phoneNumber.length === 11 && selectedPlan;

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
      label: "Data Plan",
      value: selectedPlan?.name || "",
      highlight: true,
    },
  ];

  // Add SME indicator if applicable
  if (selectedNetwork?.toLowerCase() === "glo" && isSME) {
    transactionDetails.push({
      label: "Plan Type",
      value: "SME Data",
    });
  }

  const planAmount = selectedPlan
    ? parseFloat(selectedPlan.variation_amount || selectedPlan.amount || 0)
    : 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50 dark:bg-gray-900"
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <ScreenHeader title="Buy Data" subtitle={balance} />

      <ScrollView
        className="flex-1 px-5 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 200 }}
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
        <View className="mb-4">
          <Text variant="h4" className="mb-4">
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
                  onPress={() => handleNetworkChange(provider.code)}
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
                        source={provider.dataImage}
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

        {/* SME Toggle - Only show for GLO network */}

        {selectedNetwork?.toLowerCase() === "glo" && (
          <View className="mb-6">
            <Card variant="elevated" className="p-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-4">
                  <Text variant="bodyMedium">Use SME Data</Text>
                  <Text variant="caption" color="secondary" className="mt-1">
                    Cheaper prices, same validity
                  </Text>
                </View>
                <TouchableOpacity
                  className={`w-14 h-8 rounded-full p-1 ${isSME ? "bg-[#5B55F6]" : "bg-gray-300"}`}
                  onPress={handleSMEToggle}
                >
                  <View
                    className={`w-6 h-6 rounded-full bg-white ${isSME ? "ml-auto" : "ml-0"}`}
                  />
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        )}

        <View className=" w-full">
          {/* Data Plans */}
          {selectedNetwork && (
            <View className="mb-6">
              <Text variant="h4" className="mb-4">
                Select Data Plan
              </Text>

              {/* Category Tabs - Horizontal Scrollable */}
              {availableCategories.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-4"
                  contentContainerStyle={{ paddingRight: 20 }}
                >
                  {availableCategories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      onPress={() => setSelectedCategory(category)}
                      className="mr-3"
                    >
                      <View
                        className={`px-4 py-2 rounded-full ${
                          selectedCategory === category
                            ? "bg-[#5B55F6] dark:bg-[#5B55F6]"
                            : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      >
                        <Text
                          variant="caption"
                          className={`font-medium ${
                            selectedCategory === category
                              ? "text-white"
                              : "text-gray-700"
                          }`}
                        >
                          {category}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {isLoadingPlans ? (
                <View className="gap-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <DataPlanSkeleton key={i} />
                  ))}
                </View>
              ) : currentPlans && currentPlans.length > 0 ? (
                <View style={{ height: 600 }}>
                  <FlashList
                    data={currentPlans}
                    numColumns={3}
                    // estimatedItemSize={120}
                    keyExtractor={(item, index) => {
                      // Use variation_code or code, append index to ensure uniqueness
                      const planCode = item.variation_code || item.code;
                      return `${planCode}-${index}`;
                    }}
                    renderItem={({ item: plan }) => {
                      const planCode = plan.variation_code || plan.code;
                      const planAmount = parseFloat(
                        plan.variation_amount || plan.amount || 0
                      );
                      const selectedPlanCode =
                        selectedPlan?.variation_code || selectedPlan?.code;

                      // Calculate cashback for this plan
                      const planCashbackConfig =
                        cashbackConfig?.DATA?.[
                          selectedNetwork?.toUpperCase() || ""
                        ];
                      let planCashback = 0;

                      if (planCashbackConfig) {
                        const { percentage, minAmount, maxCashback } =
                          planCashbackConfig;
                        if (planAmount >= minAmount) {
                          planCashback = (planAmount * percentage) / 100;
                          if (maxCashback && planCashback > maxCashback) {
                            planCashback = maxCashback;
                          }
                        }
                      }

                      return (
                        <TouchableOpacity
                          onPress={() => setSelectedPlan(plan)}
                          className="mb-3 flex-1 min-h-32 "
                          style={{ maxWidth: "95%", marginHorizontal: "0.5%" }}
                        >
                          <Card
                            variant={
                              selectedPlanCode === planCode
                                ? "filled"
                                : "elevated"
                            }
                            className={`p-3 px-1 h-full ${
                              selectedPlanCode === planCode
                                ? "bg-purple-100 dark:bg-purple-900/30 border-2 border-[#5B55F6]"
                                : ""
                            }`}
                          >
                            <View className="items-center">
                              <Text
                                variant="caption"
                                className="text-center mb-2 min-h-14"
                                numberOfLines={2}
                              >
                                {plan.name}
                              </Text>
                              <Text
                                variant="bodyMedium"
                                className="text-[#5B55F6] font-semibold"
                              >
                                {formatCurrency(planAmount)}
                              </Text>

                              {/* Cashback Badge */}
                              {planCashback > 0 && (
                                <View className=" mt-2 bg-[#5B55F6] rounded-full px-2 py-1">
                                  <Text
                                    variant="h8"
                                    className="text-white"
                                    weight="semibold"
                                  >
                                    {formatCurrency(planCashback)} cashback
                                  </Text>
                                </View>
                              )}
                            </View>
                          </Card>
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>
              ) : (
                <Card variant="elevated" className="p-4">
                  <Text variant="body" color="secondary" align="center">
                    No plans available in this category
                  </Text>
                </Card>
              )}
            </View>
          )}
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
              color="#5B55F6"
            />
            <View className="ml-3 flex-1">
              <Text variant="caption" color="secondary">
                • Data will be sent instantly{"\n"}• SME data is cheaper but
                same validity{"\n"}• Works on all data-enabled SIM cards
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
          Buy Data
        </Button>
      </View>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        onConfirm={handleConfirmTransaction}
        serviceType="Data Purchase"
        details={transactionDetails}
        amount={planAmount}
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
        subtitle="Confirm data purchase"
      />

      {/* Device Contacts Picker */}
      <ContactPicker
        visible={showContactsSheet}
        onClose={() => setShowContactsSheet(false)}
        onSelectContact={handleContactSelect}
      />

      {/* Device Contacts Bottom Sheet */}
      {/* <BottomSheet
        visible={showContactsSheet}
        onClose={() => setShowContactsSheet(false)}
      >
        <Text variant="h3" className="mb-1">
          Select Contact
        </Text>
        <Text variant="caption" color="secondary" className="mb-4">
          Choose a contact to autofill their number
        </Text>

        {isLoadingContacts ? (
          <View className="py-8 items-center">
            <ActivityIndicator size="large" color="#5B55F6" />

            <Text variant="body" color="secondary">
              Loading contacts...
            </Text>
          </View>
        ) : deviceContacts.length === 0 ? (
          <Card variant="elevated" className="p-4">
            <Text variant="body" color="secondary" align="center">
              No contacts found
            </Text>
          </Card>
        ) : (
          <ScrollView className="max-h-[90%] min-h-[90%]">
            <View className="gap-3">
              {deviceContacts.map((contact, index) => {
                const contactName = contact.name || "Unknown";
                const phoneNumbers = contact.phoneNumbers || [];

                return (
                  <View key={`${contact.id}-${index}`}>
                    {phoneNumbers.map((phone: any, phoneIndex: number) => (
                      <TouchableOpacity
                        key={`${contact.id}-${phoneIndex}`}
                        onPress={() => handleContactSelect(contact)}
                      >
                        <Card variant="elevated" className="p-4 mb-2">
                          <View className="flex-row items-center">
                            <View className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 items-center justify-center">
                              <Text
                                variant="bodyMedium"
                                weight="semibold"
                                className="text-[#5B55F6]"
                              >
                                {contactName.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View className="ml-3 flex-1">
                              <Text
                                variant="bodyMedium"
                                weight="semibold"
                                className="text-gray-900"
                                numberOfLines={1}
                              >
                                {contactName}
                              </Text>
                              <Text variant="body" className="text-gray-700">
                                {phone.number}
                              </Text>
                            </View>
                            <Ionicons
                              name="chevron-forward"
                              size={20}
                              color="#9CA3AF"
                            />
                          </View>
                        </Card>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </BottomSheet> */}

      {/* Saved Recipients Bottom Sheet */}
      <BottomSheet
        visible={showRecipientsSheet}
        onClose={() => setShowRecipientsSheet(false)}
      >
        <View className="flex-row justify-between items-start mb-4">
          <View className="flex-1">
            <Text variant="h3" className="mb-1">
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

// Data Plan Skeleton
const DataPlanSkeleton: React.FC = () => (
  <Card variant="elevated" className="p-4">
    <View className="flex-row items-center justify-between">
      <View className="flex-1">
        <Skeleton width="70%" height={16} className="mb-2" />
        <Skeleton width="50%" height={14} />
      </View>
      <Skeleton width={80} height={16} />
    </View>
  </Card>
);
