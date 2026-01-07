// app/circle/transaction-status.tsx
import { Button, Card, Text } from "@/src/components/ui";
import {
  useAccelerateTransaction,
  useCCTPTransfer_Single,
  useCircleTransaction,
} from "@/src/hooks/useCircleWallet";
import { useTheme } from "@/src/hooks/useTheme";
import { CCTPTransferState } from "@/src/types/circle.types";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TransactionStatusScreen() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { transactionId, type } = useLocalSearchParams<{
    transactionId: string;
    type?: string;
  }>();

  const isCCTP = type === "CCTP";

  const {
    data: circleTx,
    isLoading: isLoadingTx,
    refetch: refetchTx,
  } = useCircleTransaction(transactionId || "", { enabled: !isCCTP });

  const {
    data: cctpTx,
    isLoading: isLoadingCCTP,
    refetch: refetchCCTP,
  } = useCCTPTransfer_Single(transactionId || "", { enabled: isCCTP });

  // Select data based on type
  const transaction = isCCTP ? cctpTx : circleTx;
  const isLoading = isCCTP ? isLoadingCCTP : isLoadingTx;
  const refetch = isCCTP ? refetchCCTP : refetchTx;

  const { mutateAsync: accelerateTransaction, isPending: isAccelerating } =
    useAccelerateTransaction();

  // Auto-refresh logic
  useEffect(() => {
    if (!transaction) return;

    let isCompleting = false;

    if (isCCTP) {
      const state = transaction.state as CCTPTransferState;
      isCompleting =
        state !== "COMPLETE" && state !== "FAILED" && state !== "CANCELLED";
    } else {
      const state = transaction.state;
      isCompleting =
        state === "INITIATED" ||
        state === "QUEUED" ||
        state === "SENT" ||
        state === "CONFIRMED" ||
        state === "CLEARED" ||
        state === "STUCK";
    }

    if (isCompleting) {
      const interval = setInterval(() => {
        refetch();
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [transaction, refetch, isCCTP]);

  const handleAccelerate = async () => {
    if (!transaction || isCCTP) return; // Not supported for CCTP yet
    try {
      await accelerateTransaction(transaction.id);
      // Refetch to get updated state
      setTimeout(() => refetch(), 2000);
    } catch {
      // Error handled in hook
    }
  };

  if (isLoading || !transaction) {
    return (
      <>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View className="flex-1 bg-gray-50 dark:bg-gray-900 justify-center items-center">
          <ActivityIndicator size="large" color="#5B55F6" />
          <Text variant="body" color="secondary" className="mt-4">
            Loading transaction...
          </Text>
        </View>
      </>
    );
  }

  const getStateInfo = () => {
    if (isCCTP) {
      const state = transaction.state as CCTPTransferState;
      switch (state) {
        case "INITIATED":
          return {
            icon: "time-outline" as const,
            color: "#F59E0B",
            title: "Bridge Initiated",
            description: "Your cross-chain transfer has been started.",
            progress: 10,
          };
        case "BURN_PENDING":
          return {
            icon: "flame-outline" as const,
            color: "#F59E0B",
            title: "Burning USDC",
            description: "Burning funds on the source chain...",
            progress: 25,
          };
        case "BURN_CONFIRMED":
          return {
            icon: "checkmark-circle-outline" as const,
            color: "#3B82F6",
            title: "Burn Confirmed",
            description: "Funds burned. Waiting for attestation...",
            progress: 40,
          };
        case "ATTESTATION_PENDING":
          return {
            icon: "shield-checkmark-outline" as const,
            color: "#3B82F6",
            title: "Verifying",
            description: "Circle is verifying the transfer across chains...",
            progress: 60,
          };
        case "ATTESTATION_RECEIVED":
          return {
            icon: "shield-checkmark" as const,
            color: "#3B82F6",
            title: "Attestation Received",
            description: "Verification complete. Preparing to mint...",
            progress: 75,
          };
        case "MINT_PENDING":
          return {
            icon: "download-outline" as const,
            color: "#3B82F6",
            title: "Minting USDC",
            description: "Minting your funds on the destination chain...",
            progress: 90,
          };
        case "COMPLETE":
          return {
            icon: "checkmark-circle" as const,
            color: "#10B981",
            title: "Bridging Complete",
            description: "Your USDC has been successfully bridged!",
            progress: 100,
          };
        case "FAILED":
          return {
            icon: "close-circle" as const,
            color: "#EF4444",
            title: "Bridging Failed",
            description:
              "The transfer failed. Please try again or contact support.",
            progress: 0,
          };
        case "CANCELLED":
          return {
            icon: "ban" as const,
            color: "#6B7280",
            title: "Bridging Cancelled",
            description: "This transfer was cancelled.",
            progress: 0,
          };
        default:
          return {
            icon: "help-circle-outline" as const,
            color: "#9CA3AF",
            title: "Unknown Status",
            description: "Transfer status is unknown.",
            progress: 0,
          };
      }
    } else {
      // Standard Transaction
      switch (transaction.state) {
        case "INITIATED":
          return {
            icon: "time-outline" as const,
            color: "#F59E0B",
            title: "Transaction Initiated",
            description:
              "Your transaction has been created and is being prepared for submission.",
            progress: 20,
          };
        case "QUEUED":
          return {
            icon: "hourglass-outline" as const,
            color: "#F59E0B",
            title: "Transaction Queued",
            description:
              "Your transaction is queued and will be submitted to the blockchain shortly.",
            progress: 30,
          };
        case "CLEARED":
          return {
            icon: "checkmark-outline" as const,
            color: "#3B82F6",
            title: "Transaction Cleared",
            description:
              "Transaction has been cleared for blockchain submission.",
            progress: 40,
          };
        case "SENT":
          return {
            icon: "paper-plane-outline" as const,
            color: "#3B82F6",
            title: "Transaction Sent",
            description:
              "Your transaction has been sent to the blockchain and is awaiting confirmation.",
            progress: 60,
          };
        case "CONFIRMED":
          return {
            icon: "checkmark-done-outline" as const,
            color: "#3B82F6",
            title: "Transaction Confirmed",
            description:
              "Your transaction has been confirmed on the blockchain. Waiting for completion.",
            progress: 80,
          };
        case "COMPLETE":
          return {
            icon: "checkmark-circle" as const,
            color: "#10B981",
            title: "Transaction Complete",
            description:
              "Your transaction has been successfully completed and finalized!",
            progress: 100,
          };
        case "FAILED":
          return {
            icon: "close-circle" as const,
            color: "#EF4444",
            title: "Transaction Failed",
            description:
              "Your transaction failed to complete. Please try again.",
            progress: 0,
          };
        case "CANCELLED":
          return {
            icon: "ban" as const,
            color: "#6B7280",
            title: "Transaction Cancelled",
            description: "This transaction was cancelled.",
            progress: 0,
          };
        case "STUCK":
          return {
            icon: "alert-circle" as const,
            color: "#F59E0B",
            title: "Transaction Stuck",
            description:
              "Your transaction appears to be stuck. You may need to accelerate it.",
            progress: 60,
          };
        case "DENIED":
          return {
            icon: "close-circle" as const,
            color: "#EF4444",
            title: "Transaction Denied",
            description: "Your transaction was denied.",
            progress: 0,
          };
        default:
          return {
            icon: "help-circle-outline" as const,
            color: "#9CA3AF",
            title: "Unknown Status",
            description: "Transaction status is unknown.",
            progress: 0,
          };
      }
    }
  };

  const stateInfo = getStateInfo();
  const isComplete = transaction.state === "COMPLETE";
  const isFailed =
    transaction.state === "FAILED" ||
    transaction.state === "CANCELLED" ||
    transaction.state === "DENIED";
  const isStuck = !isCCTP && transaction.state === "STUCK";

  // Normalize data fields
  const amount = isCCTP
    ? parseFloat((transaction as any).amount || "0")
    : parseFloat((transaction as any).amounts?.[0] || "0");

  const destinationAddress = transaction.destinationAddress;
  const blockchain = isCCTP
    ? (transaction as any).destinationChain
    : (transaction as any).blockchain;
  const reference = isCCTP ? transaction.id : (transaction as any).reference;

  // For CCTP we might show source chain too
  const sourceChain = isCCTP ? (transaction as any).sourceChain : null;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: false, // Disable swipe back gesture
        }}
      />
      <StatusBar style={isDark ? "light" : "dark"} />
      <View
        className="flex-1 bg-gray-50 dark:bg-gray-900"
        style={{ paddingTop: insets.top }}
      >
        <ScrollView className="flex-1">
          {/* Header */}
          <View className="px-6 py-4">
            <Text variant="h4" weight="bold" className="dark:text-white">
              {isCCTP ? "Bridge Status" : "Transaction Status"}
            </Text>
          </View>

          {/* Status Card */}
          <View className="px-6 mb-6">
            <Card variant="elevated" className="p-6 items-center">
              {/* Icon */}
              <View
                className="w-24 h-24 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: `${stateInfo.color}20` }}
              >
                <Ionicons
                  name={stateInfo.icon}
                  size={48}
                  color={stateInfo.color}
                />
              </View>

              {/* Status Title */}
              <Text variant="h5" weight="bold" className="mb-2 dark:text-white">
                {stateInfo.title}
              </Text>

              {/* Status Description */}
              <Text
                variant="body"
                color="secondary"
                align="center"
                className="mb-4"
              >
                {stateInfo.description}
              </Text>

              {/* Progress Bar */}
              {!isFailed && (
                <View className="w-full mb-4">
                  <View className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <View
                      className="h-full bg-[#5B55F6] rounded-full"
                      style={{ width: `${stateInfo.progress}%` }}
                    />
                  </View>
                  <Text variant="caption" color="secondary" className="mt-2">
                    {stateInfo.progress}% Complete
                  </Text>
                </View>
              )}

              {/* Amount */}
              <View className="w-full pt-4 border-t border-gray-200 dark:border-gray-700">
                <View className="flex-row justify-between items-center">
                  <Text variant="body" color="secondary">
                    Amount
                  </Text>
                  <Text variant="h6" weight="bold" className="dark:text-white">
                    ${amount.toFixed(2)} USDC
                  </Text>
                </View>
              </View>
            </Card>
          </View>

          {/* Transaction Details */}
          <View className="px-6 mb-6">
            <Text variant="h6" weight="bold" className="mb-3 dark:text-white">
              Transaction Details
            </Text>

            <Card variant="outlined">
              {/* Reference */}
              <View className="p-4 border-b border-gray-200 dark:border-gray-700">
                <Text variant="caption" color="secondary" className="mb-1">
                  Reference ID
                </Text>
                <Text
                  variant="body"
                  className="dark:text-white font-mono text-xs"
                >
                  {reference}
                </Text>
              </View>

              {/* Source Chain (CCTP only) */}
              {sourceChain && (
                <View className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <Text variant="caption" color="secondary" className="mb-1">
                    From Network
                  </Text>
                  <Text variant="body" className="dark:text-white">
                    {sourceChain}
                  </Text>
                </View>
              )}

              {/* To Address */}
              <View className="p-4 border-b border-gray-200 dark:border-gray-700">
                <Text variant="caption" color="secondary" className="mb-1">
                  {isCCTP ? "Destination Address" : "To Address"}
                </Text>
                <Text
                  variant="bodyMedium"
                  className="dark:text-white font-mono"
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {destinationAddress}
                </Text>
              </View>

              {/* Blockchain */}
              <View className="p-4 border-b border-gray-200 dark:border-gray-700">
                <Text variant="caption" color="secondary" className="mb-1">
                  {isCCTP ? "To Network" : "Blockchain"}
                </Text>
                <Text variant="body" className="dark:text-white">
                  {blockchain}
                </Text>
              </View>

              {/* Transaction Hash */}
              {((transaction as any).transactionHash ||
                (transaction as any).burnTxHash ||
                (transaction as any).mintTxHash) && (
                <View className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <Text variant="caption" color="secondary" className="mb-1">
                    {(transaction as any).mintTxHash
                      ? "Mint Hash"
                      : (transaction as any).burnTxHash
                        ? "Burn Hash"
                        : "Transaction Hash"}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    className="dark:text-white font-mono"
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {(transaction as any).mintTxHash ||
                      (transaction as any).burnTxHash ||
                      (transaction as any).transactionHash}
                  </Text>
                </View>
              )}

              {/* Network Fee (Standard only) */}
              {!isCCTP && (transaction as any).networkFee && (
                <View className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <Text variant="caption" color="secondary" className="mb-1">
                    Network Fee
                  </Text>
                  <Text variant="body" className="dark:text-white">
                    {parseFloat((transaction as any).networkFee).toFixed(6)}{" "}
                    Native
                  </Text>
                </View>
              )}

              {/* CCTP Fee */}
              {isCCTP && (transaction as any).totalFee && (
                <View className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <Text variant="caption" color="secondary" className="mb-1">
                    Bridge Fee
                  </Text>
                  <Text variant="body" className="dark:text-white">
                    ${(transaction as any).totalFee}
                  </Text>
                </View>
              )}

              {/* Fee Level */}
              {(transaction as any).feeLevel && (
                <View className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <Text variant="caption" color="secondary" className="mb-1">
                    Fee Level
                  </Text>
                  <Text variant="body" className="dark:text-white">
                    {(transaction as any).feeLevel}
                  </Text>
                </View>
              )}

              {/* Error Reason */}
              {(transaction as any).errorReason && (
                <View className="p-4">
                  <Text variant="caption" className="text-red-500 mb-1">
                    Error
                  </Text>
                  <Text
                    variant="body"
                    className="text-red-600 dark:text-red-400"
                  >
                    {(transaction as any).errorReason}
                  </Text>
                </View>
              )}

              {/* Memo */}
              {(transaction as any).refId &&
                (transaction as any).refId !==
                  (transaction as any).reference && (
                  <View className="p-4">
                    <Text variant="caption" color="secondary" className="mb-1">
                      Memo
                    </Text>
                    <Text variant="body" className="dark:text-white">
                      {(transaction as any).refId}
                    </Text>
                  </View>
                )}
            </Card>
          </View>

          {/* Auto-refresh indicator */}
          {!isComplete && !isFailed && !isStuck && (
            <View className="px-6 mb-6">
              <Card variant="filled" className="flex-row items-center">
                <ActivityIndicator size="small" color="#5B55F6" />
                <Text variant="caption" color="secondary" className="ml-2">
                  Auto-refreshing coverage...
                </Text>
              </Card>
            </View>
          )}

          {/* Stuck transaction warning */}
          {isStuck && (
            <View className="px-6 mb-6">
              <Card
                variant="filled"
                className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
              >
                <View className="flex-row items-start">
                  <Ionicons name="alert-circle" size={20} color="#F59E0B" />
                  <View className="ml-3 flex-1">
                    <Text
                      variant="bodyMedium"
                      weight="semibold"
                      className="text-yellow-800 dark:text-yellow-200 mb-1"
                    >
                      Transaction Stuck
                    </Text>
                    <Text
                      variant="caption"
                      className="text-yellow-700 dark:text-yellow-300"
                    >
                      Your transaction appears to be stuck. You can accelerate
                      it to speed up processing.
                    </Text>
                  </View>
                </View>
              </Card>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View
          className="px-6 pb-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
          style={{ paddingBottom: insets.bottom + 24 }}
        >
          {isComplete && (
            <>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onPress={() => router.replace("/(tabs)/circle-wallet")}
                className="mb-3"
              >
                Back to Wallet
              </Button>
              <Button
                variant="outline"
                size="lg"
                fullWidth
                onPress={() =>
                  router.push(
                    `/circle/transaction-details?id=${transaction.id}&type=${isCCTP ? "CCTP" : "STANDARD"}`
                  )
                }
              >
                View Full Details
              </Button>
            </>
          )}

          {isFailed && (
            <>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onPress={() =>
                  router.replace(isCCTP ? "/circle/bridge" : "/circle/send")
                }
                className="mb-3"
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                size="lg"
                fullWidth
                onPress={() => router.replace("/(tabs)/circle-wallet")}
              >
                Back to Wallet
              </Button>
            </>
          )}

          {isStuck && (
            <>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onPress={handleAccelerate}
                loading={isAccelerating}
                disabled={isAccelerating}
                className="mb-3"
              >
                Accelerate Transaction
              </Button>
              <Button
                variant="outline"
                size="lg"
                fullWidth
                onPress={() => router.replace("/(tabs)/circle-wallet")}
                disabled={isAccelerating}
              >
                Back to Wallet
              </Button>
            </>
          )}

          {!isComplete && !isFailed && !isStuck && (
            <Button
              variant="outline"
              size="lg"
              fullWidth
              onPress={() => router.replace("/(tabs)/circle-wallet")}
            >
              Back to Wallet
            </Button>
          )}
        </View>
      </View>
    </>
  );
}
