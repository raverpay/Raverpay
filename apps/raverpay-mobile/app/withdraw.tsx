// app/withdraw.tsx
import { SentryErrorBoundary } from "@/src/components/SentryErrorBoundary";
import {
  Button,
  Card,
  ConfirmationModal,
  Input,
  PINModal,
  ScreenHeader,
  Skeleton,
  Text,
  TransactionDetail,
} from "@/src/components/ui";
import { useTheme } from "@/src/hooks/useTheme";
import {
  useBanks,
  useResolveAccount,
  useWithdrawFunds,
  useWithdrawalConfig,
  useWithdrawalPreview,
  type Bank,
} from "@/src/hooks/useWithdrawal";
import { formatCurrency } from "@/src/lib/utils/formatters";
import { checkPinSetOrPrompt } from "@/src/lib/utils/pin-helper";
import { useUserStore } from "@/src/store/user.store";
import { useWalletStore } from "@/src/store/wallet.store";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const QUICK_AMOUNTS = [1000, 5000, 10000];

export default function WithdrawScreen() {
  return (
    <SentryErrorBoundary>
      <WithdrawContent />
    </SentryErrorBoundary>
  );
}

function WithdrawContent() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { balance = 0 } = useWalletStore();
  const { hasPinSet, user } = useUserStore(); // Bank withdrawal form state
  const [amount, setAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountName, setAccountName] = useState("");
  const [showBankModal, setShowBankModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showPINModal, setShowPINModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // API hooks - Bank Withdrawal
  const { data: config, isPending: loadingConfig } = useWithdrawalConfig();
  const { data: banksData, isLoading: loadingBanks } = useBanks();
  const { mutate: previewFee, data: preview } = useWithdrawalPreview();
  const { mutate: resolveAccount, isPending: isResolving } =
    useResolveAccount();
  const { mutate: withdrawFunds, isPending: isWithdrawing } =
    useWithdrawFunds();

  const banks = banksData?.banks || [];

  // Auto-preview fee when amount changes (Bank Withdrawal)
  React.useEffect(() => {
    const amountValue = parseFloat(amount);
    if (amountValue && config) {
      if (
        amountValue >= config.minWithdrawal &&
        amountValue <= config.maxWithdrawal
      ) {
        previewFee(amountValue);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, config]);

  // Auto-resolve account when account number and bank are set (Bank Withdrawal)
  React.useEffect(() => {
    if (accountNumber.length === 10 && selectedBank) {
      resolveAccount(
        {
          accountNumber,
          bankCode: selectedBank.code,
        },
        {
          onSuccess: (data) => {
            setAccountName(data.accountName);
          },
          onError: () => {
            setAccountName("");
          },
        }
      );
    } else {
      setAccountName("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountNumber, selectedBank]);

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleBankSelect = (bank: Bank) => {
    setSelectedBank(bank);
    setShowBankModal(false);
    setSearchQuery("");
  };

  const handleWithdraw = () => {
    const amountValue = parseFloat(amount);

    // Validations
    if (!config) {
      Alert.alert("Error", "Unable to load withdrawal configuration");
      return;
    }

    if (!amountValue || amountValue < config.minWithdrawal) {
      Alert.alert(
        "Invalid Amount",
        `Minimum withdrawal is ${formatCurrency(config.minWithdrawal)}`
      );
      return;
    }

    if (amountValue > config.maxWithdrawal) {
      Alert.alert(
        "Invalid Amount",
        `Maximum withdrawal is ${formatCurrency(config.maxWithdrawal)}`
      );
      return;
    }

    if (!preview) {
      Alert.alert("Error", "Please wait for fee calculation");
      return;
    }

    if (preview.totalDebit > balance) {
      Alert.alert(
        "Insufficient Balance",
        `You need ${formatCurrency(preview.totalDebit)} (including fee) but have ${formatCurrency(balance)}`
      );
      return;
    }

    if (!selectedBank) {
      Alert.alert("Error", "Please select a bank");
      return;
    }

    if (accountNumber.length !== 10) {
      Alert.alert("Error", "Please enter a valid 10-digit account number");
      return;
    }

    if (!accountName) {
      Alert.alert("Error", "Account name could not be verified");
      return;
    }

    // Check if user has set a PIN
    if (!checkPinSetOrPrompt(hasPinSet)) {
      return;
    }

    // Show confirmation modal
    setShowConfirmationModal(true);
  };

  const handleConfirmTransaction = () => {
    setShowConfirmationModal(false);
    setShowPINModal(true);
  };

  const handlePINSubmit = (pin: string) => {
    if (!selectedBank || !preview) return;

    withdrawFunds(
      {
        amount: parseFloat(amount),
        accountNumber,
        accountName,
        bankCode: selectedBank.code,
        pin,
      },
      {
        onSuccess: (data) => {
          setShowPINModal(false);

          // Navigate to success screen with transaction data
          const successDetails: TransactionDetail[] = [
            {
              label: "Bank",
              value: selectedBank.name,
            },
            {
              label: "Account Number",
              value: accountNumber,
            },
            {
              label: "Account Name",
              value: accountName,
            },
            {
              label: "Withdrawal Amount",
              value: formatCurrency(parseFloat(amount)),
              highlight: true,
            },
            {
              label: "Processing Fee",
              value: formatCurrency(preview.fee),
            },
            {
              label: "Total Debit",
              value: formatCurrency(preview.totalDebit),
              highlight: true,
            },
          ];

          router.push({
            pathname: "/transaction-success",
            params: {
              serviceType: "Bank Withdrawal",
              amount: preview.totalDebit.toString(),
              reference: data.reference || "",
              cashbackEarned: "0",
              cashbackRedeemed: "0",
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

  const filteredBanks = banks.filter((bank) =>
    bank.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isFormValid =
    amount &&
    parseFloat(amount) >= (config?.minWithdrawal || 100) &&
    parseFloat(amount) <= (config?.maxWithdrawal || 50000) &&
    selectedBank &&
    accountNumber.length === 10 &&
    accountName;

  // Prepare transaction details for confirmation modal
  const transactionDetails: TransactionDetail[] = [
    {
      label: "Bank",
      value: selectedBank?.name || "",
    },
    {
      label: "Account Number",
      value: accountNumber,
    },
    {
      label: "Account Name",
      value: accountName,
    },
    {
      label: "Withdrawal Amount",
      value: formatCurrency(parseFloat(amount) || 0),
      highlight: true,
    },
    {
      label: "Processing Fee",
      value: formatCurrency(preview?.fee || 0),
    },
    {
      label: "Total Debit",
      value: formatCurrency(preview?.totalDebit || 0),
      highlight: true,
    },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50 dark:bg-gray-900"
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      <ScreenHeader title="Withdraw" subtitle={balance} />

      {/* Header */}
      {/* <View
        className="bg-white dark:bg-gray-800 pt-16 pb-6 px-5 border-b border-gray-200 dark:border-gray-700"
        style={{ paddingTop: insets.top }}
      >
      <View className="flex-row items-center mb-4">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <Ionicons
                name="arrow-back"
                size={24}
                color={isDark ? "#FFFFFF" : "#111827"}
              />
            </TouchableOpacity>

            <View className="">
              <Text variant="h3">Transfer</Text>
              <Text variant="caption" color="secondary" className="mt-1">
                Balance: {formatCurrency(balance)}
              </Text>
            </View>
          </View>
        </View>
      </View> */}

      <ScrollView
        className="flex-1 px-5 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 200 }}
      >
        {/* Segmented Control */}
        <View className="flex-row bg-gray-200 dark:bg-gray-700 rounded-xl p-1 mb-6">
          <TouchableOpacity className="flex-1">
            <View className="py-3 rounded-lg bg-white dark:bg-gray-800">
              <Text
                variant="bodyMedium"
                weight="semibold"
                className="text-center text-[#5B55F6]"
              >
                To Bank
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              // Check if user has set tag
              if (!user?.tag) {
                Alert.alert(
                  "Set Your @username",
                  "Choose your @username to send money to other users",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Set Username",
                      onPress: () => router.push("/set-tag"),
                    },
                  ]
                );
                return;
              }
              // Navigate to the existing send-p2p screen
              router.push("/send-p2p");
            }}
            className="flex-1"
          >
            <View className="py-3 rounded-lg">
              <Text
                variant="bodyMedium"
                weight="regular"
                className="text-center text-gray-600 dark:text-gray-400"
              >
                To @username
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        {/* <BankWithdrawalContent /> */}
        <>
          {/* Amount Input */}
          <View className="mb-2">
            <Input
              label={`Amount to Withdraw: ${config && ` Min: ${formatCurrency(config.minWithdrawal)} • Max: ${formatCurrency(config.maxWithdrawal)}`}`}
              placeholder="0"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              leftIcon="cash-outline"
            />
            {/* {config && (
              <Text variant="caption" color="secondary" className="mt-2">
                Min: {formatCurrency(config.minWithdrawal)} • Max:{" "}
                {formatCurrency(config.maxWithdrawal)}
              </Text>
            )} */}
          </View>

          {/* Quick Amount Buttons */}
          <View className="flex-row flex-wrap gap-2 mb-6">
            {QUICK_AMOUNTS.map((value) => (
              <TouchableOpacity
                key={value}
                onPress={() => handleQuickAmount(value)}
                className="flex-1 min-w-[30%]"
              >
                <Card
                  variant={amount === value.toString() ? "filled" : "elevated"}
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

          {/* Fee Preview Card */}
          {preview && (
            <Card variant="elevated" className="p-4 mb-6 bg-blue-50">
              <View className="flex-row items-center mb-3">
                <Ionicons name="information-circle" size={20} color="#3B82F6" />
                <Text variant="bodyMedium" className="ml-2 text-blue-900">
                  Fee Breakdown
                </Text>
              </View>
              <View className="space-y-2">
                <View className="flex-row justify-between">
                  <Text variant="caption" color="secondary">
                    Withdrawal Amount
                  </Text>
                  <Text variant="bodyMedium">
                    {formatCurrency(preview.amount)}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text variant="caption" color="secondary">
                    Processing Fee
                  </Text>
                  <Text variant="bodyMedium" className="text-orange-600">
                    {formatCurrency(preview.fee)}
                  </Text>
                </View>
                <View className="h-px bg-gray-200 my-2" />
                <View className="flex-row justify-between">
                  <Text variant="bodyMedium" weight="semibold">
                    Total Debit
                  </Text>
                  <Text variant="h4" className="text-[#5B55F6]">
                    {formatCurrency(preview.totalDebit)}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text variant="caption" className="text-green-600">
                    You will receive
                  </Text>
                  <Text variant="bodyMedium" className="text-green-600">
                    {formatCurrency(preview.amountToReceive)}
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {/* Bank Selection */}
          <View className="mb-6">
            <Text variant="bodyMedium" weight="semibold" className="mb-3">
              Select Bank
            </Text>
            <TouchableOpacity onPress={() => setShowBankModal(true)}>
              <Card variant="elevated" className="p-4">
                {loadingBanks ? (
                  <Skeleton width="60%" height={18} />
                ) : selectedBank ? (
                  <View className="flex-row items-center justify-between">
                    <Text variant="bodyMedium">{selectedBank.name}</Text>
                    <Ionicons name="chevron-down" size={20} color="#6B7280" />
                  </View>
                ) : (
                  <View className="flex-row items-center justify-between">
                    <Text variant="body" color="secondary">
                      Choose your bank
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#6B7280" />
                  </View>
                )}
              </Card>
            </TouchableOpacity>
          </View>

          {/* Account Number */}
          <View className="mb-6">
            <Input
              label="Account Number"
              placeholder="0123456789"
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="numeric"
              maxLength={10}
              leftIcon="card-outline"
            />
            {isResolving && (
              <View className="mt-2 flex-row items-center">
                <Text variant="caption" color="secondary">
                  Verifying account...
                </Text>
              </View>
            )}
          </View>

          {/* Account Name (Auto-filled) */}
          {accountName && (
            <Card variant="elevated" className="p-4 mb-6 bg-green-50">
              <View className="flex-row items-start">
                <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                <View className="ml-3 flex-1">
                  <Text variant="caption" color="secondary">
                    Account Name
                  </Text>
                  <Text variant="bodyMedium" className="mt-1">
                    {accountName}
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {/* Info Card */}
          {/* <Card variant="elevated" className="p-4 mb-6 bg-purple-50">
            <View className="flex-row items-start">
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#5B55F6"
              />
              <View className="ml-3 flex-1">
                <Text variant="caption" color="secondary">
                  • Withdrawals are processed within 5-30 minutes{"\n"}• Ensure
                  account details are correct{"\n"}• A processing fee will be
                  charged{"\n"}• Funds cannot be reversed once sent
                </Text>
              </View>
            </View>
          </Card> */}
        </>
      </ScrollView>

      {/* Floating Action Button */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-5 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 24) }}
      >
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleWithdraw}
          disabled={!isFormValid || loadingConfig}
        >
          {isFormValid && preview && preview.amountToReceive
            ? `Withdraw ${formatCurrency(preview.amountToReceive)}`
            : "Withdraw"}
        </Button>
      </View>

      {/* Bank Selection Modal */}
      <Modal
        visible={showBankModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBankModal(false)}
      >
        <View className="flex-1 bg-gray-50 dark:bg-gray-900">
          <View className="bg-white dark:bg-gray-800 px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <View className="flex-row items-center justify-between mb-4">
              <Text variant="h3">Select Bank</Text>
              <TouchableOpacity onPress={() => setShowBankModal(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={isDark ? "#FFFFFF" : "#111827"}
                />
              </TouchableOpacity>
            </View>

            <Input
              placeholder="Search banks..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              leftIcon="search-outline"
            />
          </View>

          <FlatList
            data={filteredBanks}
            keyExtractor={(item, index) => `${item.code}-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => handleBankSelect(item)}>
                <View className="bg-white dark:bg-gray-800  px-5 py-4 border-b border-gray-100">
                  <Text variant="bodyMedium">{item.name}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View className="py-12 items-center">
                <Text variant="body" color="secondary">
                  No banks found
                </Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        onConfirm={handleConfirmTransaction}
        serviceType="Bank Withdrawal"
        details={transactionDetails}
        amount={preview?.totalDebit || 0}
        currentBalance={balance}
        cashbackAvailable={0}
        cashbackToEarn={0}
      />

      {/* PIN Modal - Bank Withdrawal */}
      <PINModal
        visible={showPINModal}
        onClose={() => setShowPINModal(false)}
        onSubmit={handlePINSubmit}
        loading={isWithdrawing}
        title="Enter PIN"
        subtitle="Confirm withdrawal to bank account"
      />
    </KeyboardAvoidingView>
  );
}
