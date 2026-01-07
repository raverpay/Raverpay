// app/circle/bridge.tsx
import { BlockchainSelector, CircleWalletCard } from "@/src/components/circle";
import {
  Button,
  Card,
  ConfirmationModal,
  Input,
  PINModal,
  ScreenHeader,
  Text,
} from "@/src/components/ui";
import {
  useCCTPChains,
  useCCTPTransfer,
  useCircleWalletBalance,
  useCircleWallets,
  useEstimateCCTPFee,
} from "@/src/hooks/useCircleWallet";
import { useTheme } from "@/src/hooks/useTheme";
import { useCircleStore } from "@/src/store/circle.store";
import {
  CCTPTransferType,
  CircleBlockchain,
  CircleFeeLevel,
} from "@/src/types/circle.types";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TRANSFER_TYPES: {
  type: CCTPTransferType;
  label: string;
  description: string;
  time: string;
}[] = [
  {
    type: "FAST",
    label: "Fast Transfer",
    description: "Higher fee, instant finality",
    time: "~1-5 min",
  },
  {
    type: "STANDARD",
    label: "Standard Transfer",
    description: "Lower fee, normal speed",
    time: "~15-30 min",
  },
];

export default function CircleBridgeScreen() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: wallets, isLoading: isLoadingWallets } = useCircleWallets();
  const { data: supportedChains, isLoading: isLoadingChains } = useCCTPChains();
  const { selectedWallet, getUsdcBalance } = useCircleStore();
  const { mutateAsync: bridgeTransfer, isPending: isBridging } =
    useCCTPTransfer();
  const { mutateAsync: estimateFee } = useEstimateCCTPFee();

  // Load balance for selected wallet
  useCircleWalletBalance(selectedWallet?.id || "");

  const [sourceWallet] = useState(selectedWallet);
  const [destinationChain, setDestinationChain] = useState<
    CircleBlockchain | undefined
  >();
  const [destinationAddress, setDestinationAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [transferType, setTransferType] = useState<CCTPTransferType>("FAST");
  const [estimatedFee, setEstimatedFee] = useState<{
    totalFee: string;
    estimatedTime: number;
  } | null>(null);

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [useOwnAddress, setUseOwnAddress] = useState(true);

  // Update destination address when toggling "use own address"
  useEffect(() => {
    if (useOwnAddress && destinationChain && wallets) {
      const destWallet = wallets.find((w) => w.blockchain === destinationChain);
      if (destWallet) {
        setDestinationAddress(destWallet.address);
      }
    } else if (!useOwnAddress) {
      setDestinationAddress("");
    }
  }, [useOwnAddress, destinationChain, wallets]);

  // Estimate fee when parameters change
  useEffect(() => {
    const estimate = async () => {
      if (
        sourceWallet &&
        destinationChain &&
        amount &&
        parseFloat(amount) > 0
      ) {
        try {
          const result = await estimateFee({
            sourceChain: sourceWallet.blockchain,
            destinationChain,
            amount,
            transferType,
          });
          setEstimatedFee({
            totalFee: result.data.totalFee,
            estimatedTime: result.data.estimatedTime,
          });
        } catch {
          setEstimatedFee(null);
        }
      }
    };
    estimate();
  }, [sourceWallet, destinationChain, amount, transferType, estimateFee]);

  const currentBalance = sourceWallet ? getUsdcBalance(sourceWallet.id) : "0";

  const totalFee = estimatedFee ? parseFloat(estimatedFee.totalFee) : 0;

  const handleMaxAmount = () => {
    // If we have a fee estimate, subtract it from the max balance
    // This is approximate because fee might change with amount, but it's a good start
    // Ideally we would loop this or have the API tell us max transfer, but simpler for now:
    const maxPossbile = Math.max(0, parseFloat(currentBalance) - totalFee);
    setAmount(maxPossbile.toString());
  };

  const handleBridge = async () => {
    if (!sourceWallet || !destinationChain || !destinationAddress || !amount)
      return;

    try {
      const result = await bridgeTransfer({
        sourceWalletId: sourceWallet.id,
        destinationAddress,
        destinationChain,
        amount,
        transferType,
        feeLevel: "MEDIUM" as CircleFeeLevel,
      });
      setShowPinModal(false);

      console.log("Bridge result", result);

      if (result?.data?.transferId) {
        router.replace(
          `/circle/transaction-status?transactionId=${result.data.transferId}&type=CCTP`
        );
      } else {
        router.replace("/circle/transactions");
      }
    } catch {
      // Error handled in hook
    }
  };

  const totalNeeded = parseFloat(amount || "0") + totalFee;
  const hasInsufficientBalance = totalNeeded > parseFloat(currentBalance);

  const canSubmit =
    sourceWallet &&
    destinationChain &&
    destinationAddress &&
    amount &&
    parseFloat(amount) > 0 &&
    !hasInsufficientBalance &&
    sourceWallet.blockchain !== destinationChain;

  if (isLoadingWallets || isLoadingChains) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 justify-center items-center">
        <ActivityIndicator size="large" color="#2775CA" />
      </View>
    );
  }

  // Filter out current source chain from destination options
  const availableDestinations =
    supportedChains?.filter((chain) => chain !== sourceWallet?.blockchain) ||
    [];

  const handleReviewTransaction = () => {
    setShowConfirmationModal(true);
  };

  const handleConfirmTransaction = () => {
    setShowConfirmationModal(false);
    setShowPinModal(true);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50 dark:bg-gray-900"
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <ScreenHeader
        title="Bridge USDC"
        subtitleText="Transfer across blockchains"
      />

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* CCTP Info Banner */}
        <Card variant="filled" className="p-4 mb-6 bg-[#2775CA]/10">
          <View className="flex-row items-start">
            <Ionicons name="git-compare" size={20} color="#2775CA" />
            <View className="ml-3 flex-1">
              <Text
                variant="bodyMedium"
                weight="semibold"
                className="text-[#2775CA] mb-1"
              >
                Cross-Chain Transfer Protocol
              </Text>
              <Text variant="caption" color="secondary">
                Move native USDC between blockchains with no slippage. Your USDC
                is burned on the source chain and minted on the destination
                chain.
              </Text>
            </View>
          </View>
        </Card>

        {/* Source Wallet */}
        <Text
          variant="bodyMedium"
          weight="semibold"
          className="mb-2 dark:text-white"
        >
          From
        </Text>
        {sourceWallet && (
          <CircleWalletCard
            wallet={sourceWallet}
            usdcBalance={currentBalance}
            isSelected
          />
        )}

        {/* Arrow */}
        <View className="items-center my-4">
          <View className="w-10 h-10 bg-[#2775CA] rounded-full items-center justify-center">
            <Ionicons name="arrow-down" size={20} color="white" />
          </View>
        </View>

        {/* Destination Chain */}
        <Card variant="elevated" className="p-4 mb-4">
          <Text
            variant="bodyMedium"
            weight="semibold"
            className="mb-3 dark:text-white"
          >
            To Network
          </Text>
          <BlockchainSelector
            chains={availableDestinations}
            selectedChain={destinationChain}
            onSelect={setDestinationChain}
          />
        </Card>

        {/* Destination Address */}
        <Card variant="elevated" className="p-4 mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text
              variant="bodyMedium"
              weight="semibold"
              className="dark:text-white"
            >
              Destination Address
            </Text>
            <TouchableOpacity
              onPress={() => setUseOwnAddress(!useOwnAddress)}
              className="flex-row items-center"
            >
              <Ionicons
                name={useOwnAddress ? "checkbox" : "square-outline"}
                size={20}
                color="#2775CA"
              />
              <Text variant="caption" className="ml-1 text-[#2775CA]">
                My wallet
              </Text>
            </TouchableOpacity>
          </View>
          <Input
            value={destinationAddress}
            onChangeText={setDestinationAddress}
            placeholder="Enter destination address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!useOwnAddress}
            className={`font-mono ${useOwnAddress ? "opacity-60" : ""}`}
            multiline
          />
          {useOwnAddress && destinationChain && (
            <Text variant="caption" color="tertiary" className="mt-2">
              Funds will be sent to your {destinationChain} wallet
            </Text>
          )}
        </Card>

        {/* Amount */}
        <Card variant="elevated" className="p-4 mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text
              variant="bodyMedium"
              weight="semibold"
              className="dark:text-white"
            >
              Amount
            </Text>
            <TouchableOpacity onPress={handleMaxAmount}>
              <Text variant="caption" className="text-[#2775CA]">
                Max: ${currentBalance}
              </Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row items-center">
            <Text variant="h4" className="mr-2 dark:text-white">
              $
            </Text>
            <Input
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              className="flex-1 text-2xl font-bold"
            />
            <Text variant="bodyMedium" color="secondary" className="ml-2">
              USDC
            </Text>
          </View>
          {hasInsufficientBalance && (
            <Text variant="caption" className="text-red-500 mt-2">
              Insufficient balance (Amount + Fee: ${totalNeeded.toFixed(2)})
            </Text>
          )}
        </Card>

        {/* Transfer Type */}
        <Card variant="elevated" className="p-4 mb-4">
          <Text
            variant="bodyMedium"
            weight="semibold"
            className="mb-3 dark:text-white"
          >
            Transfer Speed
          </Text>
          {TRANSFER_TYPES.map((tt) => (
            <TouchableOpacity
              key={tt.type}
              onPress={() => setTransferType(tt.type)}
              className={`p-3 rounded-lg border mb-2 ${
                transferType === tt.type
                  ? "border-[#2775CA] bg-[#2775CA]/10"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <View className="flex-row justify-between items-center">
                <View>
                  <Text
                    variant="bodyMedium"
                    weight="semibold"
                    className={
                      transferType === tt.type
                        ? "text-[#2775CA]"
                        : "dark:text-white"
                    }
                  >
                    {tt.label}
                  </Text>
                  <Text variant="caption" color="secondary">
                    {tt.description}
                  </Text>
                </View>
                <View className="items-end">
                  <Text variant="caption" color="tertiary">
                    {tt.time}
                  </Text>
                  {transferType === tt.type && (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#2775CA"
                    />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </Card>

        {/* Fee Estimate */}
        {estimatedFee && (
          <Card variant="filled" className="p-4 mb-6">
            <Text
              variant="bodyMedium"
              weight="semibold"
              className="mb-2 dark:text-white"
            >
              Estimated Fees
            </Text>
            <View className="flex-row justify-between mb-1">
              <Text variant="body" color="secondary">
                Bridge Fee
              </Text>
              <Text variant="body" className="dark:text-white">
                ${estimatedFee.totalFee}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text variant="body" color="secondary">
                Estimated Time
              </Text>
              <Text variant="body" className="dark:text-white">
                {estimatedFee.estimatedTime}
              </Text>
            </View>
          </Card>
        )}

        {/* Bridge Button */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleReviewTransaction}
          disabled={!canSubmit || isBridging}
          loading={isBridging}
          className="bg-[#2775CA]"
        >
          {isBridging ? "Bridging..." : "Bridge USDC"}
        </Button>

        {sourceWallet?.blockchain === destinationChain && (
          <Text variant="caption" className="text-red-500 text-center mt-2">
            Source and destination chains must be different
          </Text>
        )}
      </ScrollView>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        onConfirm={handleConfirmTransaction}
        serviceType="Bridge Transfer"
        details={[
          {
            label: "From",
            value: sourceWallet?.blockchain || "",
          },
          {
            label: "To",
            value: destinationChain || "",
          },
          {
            label: "Destination",
            value: `${destinationAddress.slice(0, 10)}...${destinationAddress.slice(-8)}`,
          },
          {
            label: "Amount",
            value: `$${amount} USDC`,
            highlight: true,
          },
          {
            label: "Bridge Fee",
            value: estimatedFee
              ? `$${estimatedFee.totalFee}`
              : "Calculating...",
          },
          {
            label: "Est. Time",
            value: estimatedFee ? `${estimatedFee.estimatedTime}` : "",
          },
        ]}
        amount={parseFloat(amount) || 0}
        fee={totalFee}
        currentBalance={parseFloat(currentBalance)}
        cashbackAvailable={0}
        cashbackToEarn={0}
        currencyType="USDC"
      />

      {/* PIN Modal */}
      <PINModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSubmit={handleBridge}
        loading={isBridging}
        title="Enter PIN to Bridge"
        subtitle={`Bridging $${amount} USDC from ${sourceWallet?.blockchain} to ${destinationChain}`}
      />
    </KeyboardAvoidingView>
  );
}
