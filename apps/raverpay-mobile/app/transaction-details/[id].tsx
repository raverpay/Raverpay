// app/transaction-details/[id].tsx
import {
  Button,
  Card,
  ScreenHeader,
  Skeleton,
  SkeletonCircle,
  Text,
} from "@/src/components/ui";
import { useTheme } from "@/src/hooks/useTheme";
import { useTransactionDetails } from "@/src/hooks/useTransactions";
import { formatCurrency, formatDateTime } from "@/src/lib/utils/formatters";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  Clipboard,
  Alert as RNAlert,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TransactionDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    data: transaction,
    isPending: isLoading,
    isError,
  } = useTransactionDetails(id);

  // console.log({ transaction });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "text-green-600 dark:text-green-400";
      case "PENDING":
        return "text-yellow-600 dark:text-yellow-400";
      case "FAILED":
        return "text-red-600 dark:text-red-400";
      case "REVERSED":
        return "text-gray-600 dark:text-gray-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 dark:bg-green-500";
      case "PENDING":
        return "bg-yellow-100 dark:bg-yellow-500";
      case "FAILED":
        return "bg-red-100 dark:bg-red-500";
      case "REVERSED":
        return "bg-gray-100 dark:bg-gray-500";
      default:
        return "bg-gray-100 dark:bg-gray-500";
    }
  };

  const getIcon = (type: string) => {
    // Money IN (green, arrow down): DEPOSIT, REFUND, GIFTCARD_SELL, CRYPTO_SELL
    // Money OUT (red, arrow up): WITHDRAWAL, TRANSFER, VTU_*, GIFTCARD_BUY, CRYPTO_BUY, FEE
    const creditTypes = ["DEPOSIT", "REFUND", "GIFTCARD_SELL", "CRYPTO_SELL"];
    if (creditTypes.includes(type)) return "arrow-down-circle";
    return "arrow-up-circle";
  };

  const getIconColor = (type: string) => {
    // Money IN = green, Money OUT = red
    const creditTypes = ["DEPOSIT", "REFUND", "GIFTCARD_SELL", "CRYPTO_SELL"];
    if (creditTypes.includes(type)) return "#22C55E";
    return "#EF4444";
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <StatusBar style={isDark ? "light" : "dark"} />

        {/* Header */}
        <ScreenHeader title="Transaction Details" />

        <ScrollView
          className="flex-1 px-5 pt-6"
          showsVerticalScrollIndicator={false}
        >
          {/* Status Card Skeleton */}
          <Card variant="elevated" className="p-6 items-center mb-6">
            <SkeletonCircle size={80} />
            <Skeleton width={200} height={40} className="mt-4" />
            <Skeleton
              width={120}
              height={32}
              borderRadius={16}
              className="mt-4"
            />
          </Card>

          {/* Transaction Info Skeleton */}
          <Card variant="elevated" className="p-4 mb-6">
            <Skeleton width={180} height={24} className="mb-4" />
            <View className="gap-3">
              {[1, 2, 3, 4].map((i) => (
                <View key={i} className="flex-row justify-between py-3">
                  <Skeleton width={100} height={16} />
                  <Skeleton width={150} height={16} />
                </View>
              ))}
            </View>
          </Card>

          {/* Balance Info Skeleton */}
          <Card variant="elevated" className="p-4 mb-6">
            <Skeleton width={140} height={24} className="mb-4" />
            <View className="gap-3">
              {[1, 2, 3].map((i) => (
                <View key={i} className="flex-row justify-between py-3">
                  <Skeleton width={120} height={16} />
                  <Skeleton width={100} height={16} />
                </View>
              ))}
            </View>
          </Card>
        </ScrollView>
      </View>
    );
  }

  if (isError || !transaction) {
    return (
      <View className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        {/* Header */}
        <ScreenHeader title="Transaction Details" />

        <View className="flex-1 items-center justify-center px-5">
          <View className="w-20 h-20 rounded-full bg-red-100 items-center justify-center mb-4">
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
          </View>
          <Text variant="h3" className="mb-2">
            Transaction Not Found
          </Text>
          <Text
            variant="body"
            color="secondary"
            align="center"
            className="mb-6"
          >
            We couldn&apos;t find this transaction. It may have been deleted or
            doesn&apos;t exist.
          </Text>
          <Button variant="primary" onPress={() => router.back()}>
            Go Back
          </Button>
        </View>
      </View>
    );
  }

  const creditTypes = ["DEPOSIT", "REFUND", "GIFTCARD_SELL", "CRYPTO_SELL"];
  const isCredit = creditTypes.includes(transaction.type);
  const amount = parseFloat(transaction.amount);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <ScreenHeader
        title="Transaction Details"
        rightComponent={
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/support",
                params: {
                  context: JSON.stringify({
                    transactionId: transaction.id,
                    transactionType: transaction.type,
                    amount: transaction.amount,
                    status: transaction.status,
                    reference: transaction.reference,
                  }),
                },
              })
            }
            className="bg-[#5B55F6] dark:bg-[#5B55F6] rounded-full py-2 px-3 flex-row items-center gap-2"
          >
            <Text variant="button" weight="semibold">
              Get Help
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        className="flex-1 px-5 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 200 }}
      >
        {/* Status Card */}
        <Card variant="elevated" className="p-6 items-center mb-6">
          <View>
            <View
              className="w-20 h-20 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: `${getIconColor(transaction.type)}20` }}
            >
              <Ionicons
                name={getIcon(transaction.type)}
                size={40}
                color={getIconColor(transaction.type)}
              />
            </View>

            <Text
              variant="h3"
              className={isCredit ? "text-green-600" : "text-red-600"}
            >
              {isCredit ? "+" : "-"}
              {formatCurrency(amount)}
            </Text>
          </View>

          <View
            className={`px-4 py-2 rounded-full mt-4 ${getStatusBgColor(transaction.status)}`}
          >
            <Text
              variant="bodyMedium"
              className={getStatusColor(transaction.status)}
            >
              {transaction.status}
            </Text>
          </View>
        </Card>

        {/* Transaction Info */}
        <Card variant="elevated" className="p-4 mb-6">
          <Text variant="h4" className="mb-4">
            Transaction Information
          </Text>

          <DetailRow
            label="Description"
            value={
              transaction.description.length > 30
                ? transaction.description.substring(0, 30) + "..."
                : transaction.description
            }
          />
          <DetailRow label="Reference" value={transaction.reference} />
          <DetailRow label="Type" value={transaction.type} />
          <DetailRow
            label="Date"
            value={formatDateTime(transaction.createdAt)}
          />
          {transaction.completedAt && (
            <DetailRow
              label="Completed At"
              value={formatDateTime(transaction.completedAt)}
              isLast
            />
          )}
        </Card>

        {/* Balance Info */}
        <Card variant="elevated" className="p-4 mb-6">
          <Text variant="h4" className="mb-4">
            Balance Details
          </Text>

          <DetailRow
            label="Balance Before"
            value={formatCurrency(parseFloat(transaction.balanceBefore))}
          />
          <DetailRow
            label="Amount"
            value={formatCurrency(amount)}
            valueColor={isCredit ? "text-green-600" : "text-red-600"}
          />
          <DetailRow
            label="Balance After"
            value={formatCurrency(parseFloat(transaction.balanceAfter))}
            isLast
          />
        </Card>

        {/* Electricity Token (if available) */}
        {transaction.metadata?.serviceType === "ELECTRICITY" &&
          transaction.metadata?.meterToken && (
            <Card
              variant="elevated"
              className="p-5 mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800"
            >
              <View className="flex-row items-center mb-3">
                <View className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/40 items-center justify-center mr-3">
                  <Ionicons name="flash" size={20} color="#CA8A04" />
                </View>
                <Text
                  variant="h4"
                  className="text-yellow-800 dark:text-yellow-400"
                >
                  Electricity Token
                </Text>
              </View>

              <View className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 mb-3">
                {/* <Text variant="caption" color="secondary" className="mb-2">
                  Token Number
                </Text> */}
                <View className="flex-row items-center justify-between">
                  <Text
                    variant="h4"
                    className="text-yellow-600 dark:text-yellow-400 flex-1 mr-2"
                  >
                    {transaction.metadata.meterToken}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Clipboard.setString(transaction.metadata.meterToken);
                      RNAlert.alert("Copied!", "Token copied to clipboard");
                    }}
                    className="bg-yellow-100 dark:bg-yellow-900/40 p-2 rounded-lg"
                  >
                    <Ionicons name="copy-outline" size={20} color="#CA8A04" />
                  </TouchableOpacity>
                </View>
              </View>

              {transaction.metadata?.customerName && (
                <View className="mb-2">
                  <Text variant="caption" color="secondary">
                    Customer Name
                  </Text>
                  <Text variant="bodyMedium">
                    {transaction.metadata.customerName}
                  </Text>
                </View>
              )}

              {transaction.metadata?.units && (
                <View className="mb-2">
                  <Text variant="caption" color="secondary">
                    Units
                  </Text>
                  <Text variant="bodyMedium">{transaction.metadata.units}</Text>
                </View>
              )}

              {transaction.metadata?.recipient && (
                <View>
                  <Text variant="caption" color="secondary">
                    Meter Number
                  </Text>
                  <Text variant="bodyMedium">
                    {transaction.metadata.recipient}
                  </Text>
                </View>
              )}
            </Card>
          )}

        {/* JAMB PIN (if available) */}
        {transaction.metadata?.serviceType === "JAMB" &&
          transaction.metadata?.pin && (
            <Card
              variant="elevated"
              className="p-5 mb-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800"
            >
              <View className="flex-row items-center mb-3">
                <View className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 items-center justify-center mr-3">
                  <Ionicons
                    name="school"
                    size={20}
                    color={isDark ? "#93C5FD" : "#1E40AF"}
                  />
                </View>
                <Text variant="h4" className="text-blue-800 dark:text-blue-400">
                  JAMB PIN
                </Text>
              </View>

              <View className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mb-3">
                <Text variant="caption" color="secondary" className="mb-2">
                  PIN Number
                </Text>
                <View className="flex-row items-center justify-between">
                  <Text
                    variant="h4"
                    className="text-blue-600 dark:text-blue-400 flex-1 mr-2"
                  >
                    {transaction.metadata.pin}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Clipboard.setString(transaction.metadata.pin);
                      RNAlert.alert("Copied!", "JAMB PIN copied to clipboard");
                    }}
                    className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-lg"
                  >
                    <Ionicons
                      name="copy-outline"
                      size={20}
                      color={isDark ? "#93C5FD" : "#1E40AF"}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {transaction.metadata?.profileId && (
                <View className="mb-2">
                  <Text variant="caption" color="secondary">
                    Profile ID
                  </Text>
                  <Text variant="bodyMedium">
                    {transaction.metadata.profileId}
                  </Text>
                </View>
              )}

              {transaction.metadata?.customerName && (
                <View className="mb-2">
                  <Text variant="caption" color="secondary">
                    Customer Name
                  </Text>
                  <Text variant="bodyMedium">
                    {transaction.metadata.customerName}
                  </Text>
                </View>
              )}

              {transaction.metadata?.productName && (
                <View>
                  <Text variant="caption" color="secondary">
                    Plan
                  </Text>
                  <Text variant="bodyMedium">
                    {transaction.metadata.productName}
                  </Text>
                </View>
              )}
            </Card>
          )}

        {/* WAEC Result Checker Cards (if available) */}
        {(transaction.metadata?.serviceType === "WAEC_RESULT" ||
          transaction.metadata?.serviceType === "WAEC_REGISTRATION") &&
          transaction.metadata?.cards &&
          (() => {
            try {
              const cards = JSON.parse(transaction.metadata.cards);
              if (Array.isArray(cards) && cards.length > 0) {
                return (
                  <Card
                    variant="elevated"
                    className="p-5 mb-6 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800"
                  >
                    <View className="flex-row items-center mb-3">
                      <View className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 items-center justify-center mr-3">
                        <Ionicons
                          name="card"
                          size={20}
                          color={isDark ? "#86EFAC" : "#16A34A"}
                        />
                      </View>
                      <Text
                        variant="h4"
                        className="text-green-800 dark:text-green-400"
                      >
                        WAEC Result Card{cards.length > 1 ? "s" : ""}
                      </Text>
                    </View>

                    {cards.map((card: any, index: number) => (
                      <View
                        key={index}
                        className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-green-200 dark:border-green-800 mb-3"
                      >
                        <View className="flex-row justify-between mb-2">
                          <Text variant="caption" color="secondary">
                            Serial Number
                          </Text>
                          <Text variant="bodyMedium" className="font-mono">
                            {card.Serial}
                          </Text>
                        </View>
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1">
                            <Text
                              variant="caption"
                              color="secondary"
                              className="mb-1"
                            >
                              PIN
                            </Text>
                            <Text
                              variant="h4"
                              className="text-green-600 dark:text-green-400 font-mono"
                            >
                              {card.Pin}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => {
                              Clipboard.setString(
                                `Serial: ${card.Serial}\nPIN: ${card.Pin}`
                              );
                              RNAlert.alert(
                                "Copied!",
                                "Card details copied to clipboard"
                              );
                            }}
                            className="bg-green-100 dark:bg-green-900/40 p-2 rounded-lg ml-2"
                          >
                            <Ionicons
                              name="copy-outline"
                              size={20}
                              color={isDark ? "#86EFAC" : "#16A34A"}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </Card>
                );
              }
            } catch {
              return null;
            }
            return null;
          })()}

        {/* Metadata */}
        {transaction.metadata &&
          Object.keys(transaction.metadata).length > 0 && (
            <Card variant="elevated" className="p-4 mb-6">
              <Text variant="h4" className="mb-4">
                Additional Details
              </Text>
              {Object.entries(transaction.metadata as Record<string, any>)
                .filter(([key]) => {
                  // Filter out electricity-specific fields if already shown above
                  if (transaction.metadata?.serviceType === "ELECTRICITY") {
                    return ![
                      "meterToken",
                      "customerName",
                      "units",
                      "recipient",
                      "tokenAmount",
                      "tariff",
                      "customerAddress",
                      "serviceType",
                      "orderId",
                    ].includes(key);
                  }

                  // Filter out data transaction fields
                  if (transaction.metadata?.transferType === "p2p") {
                    return !["recipientId"].includes(key);
                  }

                  if (
                    transaction.metadata?.serviceType === "CABLE_TV" ||
                    transaction.metadata?.serviceType === "AIRTIME" ||
                    transaction.metadata?.serviceType === "DATA" ||
                    transaction.metadata?.serviceType === "JAMB" ||
                    transaction.metadata?.serviceType === "WAEC_RESULT" ||
                    transaction.metadata?.serviceType === "WAEC_REGISTRATION"
                  ) {
                    return ![
                      "productCode",
                      "productName",
                      "serviceType",
                      "cashbackToEarn",
                      "cashbackRedeemed",
                      "orderId",
                      "cards",
                    ].includes(key);
                  }

                  // Always filter out sensitive/internal/technical fields
                  return ![
                    "paystackResponse",
                    "bankCode",
                    "transferCode",
                    "reversedBy",
                    "provider",
                    "paymentMethod",
                    "type",
                    "deviceId",
                    "platform",
                    "appVersion",
                    "deviceName",
                    "cancelledAt",
                    "cancelledBy",
                    "ip",
                    "lockedWallet",
                    "limitExceeded",
                    "refunded",
                    "error",
                  ].includes(key);
                })
                .map(([key, value], index, arr) => {
                  // Custom labels for specific fields (use camelCase keys)
                  const labelMap: Record<string, string> = {
                    netAmount: "Amount Received",
                    grossAmount: "Total Amount",
                    paystackFee: "Transaction Fee",
                    accountNumber: "Account Number",
                    recipientTag: "Recipient Tag",
                    transferType: "Transfer Type",
                    recipientName: "Recipient Name",
                    meterType: "Meter Type",
                    subscriptionType: "Subscription Type",
                    processingFee: "Processing Fee",
                    requestedAmount: "Requested Amount",
                    refundAmount: "Refunded Amount",
                    bankName: "Bank Name",
                  };

                  // Get custom label or format the key
                  const label =
                    labelMap[key] ||
                    key
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase());

                  // Format the value for better display
                  let formattedValue = String(value);

                  // Format currency fields
                  if (
                    ["netAmount", "grossAmount", "paystackFee"].includes(key)
                  ) {
                    formattedValue = formatCurrency(Number(value));
                  }

                  return (
                    <DetailRow
                      key={key}
                      label={label}
                      value={formattedValue}
                      isLast={index === arr.length - 1}
                    />
                  );
                })}
            </Card>
          )}

        {/* Help Section */}
        <Card variant="elevated" className="p-4 mb-8 bg-purple-50">
          <View className="flex-row items-start">
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#8B5CF6"
            />
            <View className="ml-3 flex-1">
              <Text variant="caption" color="secondary">
                If you have any questions about this transaction, please contact
                our support team with the transaction reference.
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* Floating Receipt Button */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-5 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <TouchableOpacity
          onPress={() => router.push(`/transaction-details/${id}/receipt`)}
          className="bg-[#5B55F6] rounded-xl py-4 flex-row items-center justify-center"
        >
          <Ionicons name="receipt-outline" size={24} color="white" />
          <Text variant="button" className="ml-2 text-white">
            Download Receipt
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  valueColor?: string;
  isLast?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({
  label,
  value,
  valueColor,
  isLast = false,
}) => (
  <View
    className={`flex-row justify-between py-3 ${!isLast ? "border-b border-gray-100" : ""}`}
  >
    <Text variant="body" color="secondary">
      {label}
    </Text>
    <Text variant="bodyMedium" className={valueColor || ""}>
      {value.length > 30 ? value.substring(0, 30) + "..." : value}
    </Text>
  </View>
);
