// app/transaction-details/[id]/receipt.tsx
import { Button, ScreenHeader, Text } from "@/src/components/ui";
import { useTheme } from "@/src/hooks/useTheme";
import { useTransactionDetails } from "@/src/hooks/useTransactions";
import { formatCurrency, formatDateTime } from "@/src/lib/utils/formatters";
import { useUserStore } from "@/src/store/user.store";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { router, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

export default function ReceiptPreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useUserStore();
  const {
    data: transaction,
    isPending: isLoading,
    isError,
  } = useTransactionDetails(id);
  const receiptRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);
  const { isDark } = useTheme();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "#22C55E";
      case "PENDING":
        return "#EAB308";
      case "FAILED":
        return "#EF4444";
      case "REVERSED":
        return "#6B7280";
      default:
        return "#6B7280";
    }
  };

  const creditTypes = ["DEPOSIT", "REFUND", "GIFTCARD_SELL", "CRYPTO_SELL"];
  const isCredit = transaction ? creditTypes.includes(transaction.type) : false;

  const handleShareAsImage = async () => {
    if (!transaction || !receiptRef.current) return;

    setIsSharing(true);
    try {
      const uri = await captureRef(receiptRef, {
        format: "png",
        quality: 1.0,
        result: "tmpfile",
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (error) {
      console.error("Error sharing image:", error);
      Alert.alert("Error", "Failed to share receipt as image");
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareAsPDF = async () => {
    if (!transaction) return;

    setIsSharing(true);
    try {
      const html = generateReceiptHTML(transaction, user);
      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      Alert.alert("Error", "Failed to generate PDF");
    } finally {
      setIsSharing(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 items-center justify-center">
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#5B55F6" />
        <Text variant="body" color="secondary" className="mt-4">
          Loading receipt...
        </Text>
      </View>
    );
  }

  if (isError || !transaction) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <StatusBar style={isDark ? "light" : "dark"} />
        <ScreenHeader title="Receipt" />
        <View className="flex-1 items-center justify-center px-5">
          <Text variant="h3" className="mb-2">
            Receipt Not Available
          </Text>
          <Text
            variant="body"
            color="secondary"
            align="center"
            className="mb-6"
          >
            Unable to load transaction receipt.
          </Text>
          <Button variant="primary" onPress={() => router.back()}>
            Go Back
          </Button>
        </View>
      </View>
    );
  }

  const amount = parseFloat(transaction.amount);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <ScreenHeader title="Receipt Preview" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Receipt Content - This will be captured as image */}
        <View
          ref={receiptRef}
          collapsable={false}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6"
        >
          {/* Header */}
          <View className="items-center mb-6 flex-row justify-between">
            <Text variant="h4" className="text-[#5B55F6] ">
              Raverpay
            </Text>
            <Text variant="caption" color="secondary">
              Transaction Receipt
            </Text>
          </View>

          {/* Divider */}
          <View className="h-px bg-gray-200 mb-6" />

          {/* Transaction Amount */}
          <View className="items-center mb-6 flex-row justify-between">
            <View>
              <Text variant="caption" color="secondary" className="mb-2">
                Amount
              </Text>
              <Text
                variant="h4"
                className={isCredit ? "text-green-600" : "text-red-600"}
              >
                {isCredit ? "+" : "-"}
                {formatCurrency(amount)}
              </Text>
            </View>
            <View
              className="px-4 py-2 rounded-full mt-3"
              style={{
                backgroundColor: `${getStatusColor(transaction.status)}20`,
              }}
            >
              <Text
                variant="bodyMedium"
                style={{ color: getStatusColor(transaction.status) }}
              >
                {transaction.status}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View className="h-px bg-gray-200 mb-6" />

          {/* Transaction Details */}
          <View className="mb-4">
            <Text variant="h4" className="">
              Transaction Details
            </Text>
            <ReceiptRow label="Reference" value={transaction.reference} />
            <ReceiptRow label="Type" value={transaction.type} />
            <ReceiptRow label="Description" value={transaction.description} />
            <ReceiptRow
              label="Date"
              value={formatDateTime(transaction.createdAt)}
            />
            {transaction.completedAt && (
              <ReceiptRow
                label="Completed At"
                value={formatDateTime(transaction.completedAt)}
              />
            )}
          </View>

          {/* Balance Details */}
          {/* <View className="mb-4">
            <Text variant="h4" className="mb-4">
              Balance Information
            </Text>
            <ReceiptRow
              label="Balance Before"
              value={formatCurrency(parseFloat(transaction.balanceBefore))}
            />
            <ReceiptRow
              label="Transaction Amount"
              value={formatCurrency(amount)}
              valueColor={isCredit ? "text-green-600" : "text-red-600"}
            />
            <ReceiptRow
              label="Balance After"
              value={formatCurrency(parseFloat(transaction.balanceAfter))}
            />
          </View> */}

          {/* User Information */}
          {user && (
            <View className="mb-4">
              <Text variant="h4" className="mt-2">
                Account Information
              </Text>
              {user.firstName && user.lastName && (
                <ReceiptRow
                  label="Name"
                  value={`${user.firstName} ${user.lastName}`}
                />
              )}
              {user.email && <ReceiptRow label="Email" value={user.email} />}
              {user.phone && <ReceiptRow label="Phone" value={user.phone} />}
            </View>
          )}

          {/* Metadata - Electricity Token */}
          {transaction.metadata?.serviceType === "ELECTRICITY" &&
            transaction.metadata?.meterToken && (
              <View className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <Text variant="h4" className="mb-3 text-green-800">
                  Electricity Token
                </Text>
                <ReceiptRow
                  label="Token Number"
                  value={transaction.metadata.meterToken}
                />
                {transaction.metadata?.customerName && (
                  <ReceiptRow
                    label="Customer Name"
                    value={transaction.metadata.customerName}
                  />
                )}
                {transaction.metadata?.units && (
                  <ReceiptRow
                    label="Units"
                    value={transaction.metadata.units}
                  />
                )}
                {transaction.metadata?.recipient && (
                  <ReceiptRow
                    label="Meter Number"
                    value={transaction.metadata.recipient}
                  />
                )}
              </View>
            )}

          {/* Footer */}
          <View className=" ">
            {/* <Text variant="caption" color="secondary" align="center">
              This is an official receipt for your transaction.
            </Text> */}

            {/* <Text
              variant="caption"
              color="secondary"
              align="center"
              className="mt-4"
            >
              Generated on {formatDateTime(new Date().toISOString())}
            </Text> */}
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View
        className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-5 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <View className="flex-row gap-3">
          <Button
            variant="primary"
            size="lg"
            onPress={handleShareAsImage}
            disabled={isSharing}
            loading={isSharing}
            className="flex-1"
          >
            <View>
              {!isSharing && (
                <Ionicons name="image-outline" size={20} color="white" />
              )}
            </View>

            <View>
              <Text variant="button" className="text-white ml-2">
                Image
              </Text>
            </View>
          </Button>
          <Button
            variant="primary"
            size="lg"
            onPress={handleShareAsPDF}
            disabled={isSharing}
            loading={isSharing}
            className="flex-1"
          >
            <View>
              {!isSharing && (
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color="white"
                />
              )}
            </View>
            <View>
              <Text variant="button" className="text-white ml-2">
                PDF
              </Text>
            </View>
          </Button>
        </View>
      </View>
    </View>
  );
}

interface ReceiptRowProps {
  label: string;
  value: string;
  valueColor?: string;
}

const ReceiptRow: React.FC<ReceiptRowProps> = ({
  label,
  value,
  valueColor,
}) => (
  <View className="flex-row justify-between py-3 border-b border-gray-100">
    <Text variant="body" color="secondary" className="">
      {label}
    </Text>
    <Text variant="h7" className={`flex-1 text-right ${valueColor || ""}`}>
      {value.length > 35 ? value.slice(0, 35) + "..." : value}
    </Text>
  </View>
);

// Generate HTML for PDF
function generateReceiptHTML(transaction: any, user: any) {
  const creditTypes = ["DEPOSIT", "REFUND", "GIFTCARD_SELL", "CRYPTO_SELL"];
  const isCredit = creditTypes.includes(transaction.type);
  const amount = parseFloat(transaction.amount);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "#22C55E";
      case "PENDING":
        return "#EAB308";
      case "FAILED":
        return "#EF4444";
      case "REVERSED":
        return "#6B7280";
      default:
        return "#6B7280";
    }
  };

  // Pre-format all values
  const formattedAmount = formatCurrency(amount);
  const formattedBalanceBefore = formatCurrency(
    parseFloat(transaction.balanceBefore)
  );
  const formattedBalanceAfter = formatCurrency(
    parseFloat(transaction.balanceAfter)
  );
  const formattedCreatedAt = formatDateTime(transaction.createdAt);
  const formattedCompletedAt = transaction.completedAt
    ? formatDateTime(transaction.completedAt)
    : "";
  const formattedGeneratedAt = formatDateTime(new Date().toISOString());

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Transaction Receipt</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            padding: 40px 20px;
            background: #f9fafb;
            color: #111827;
            line-height: 1.6;
          }
          .receipt {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            width: 64px;
            height: 64px;
            background: #5B55F6;
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 32px;
          }
          h1 {
            color: #5B55F6;
            font-size: 28px;
            margin-bottom: 8px;
          }
          .subtitle {
            color: #6B7280;
            font-size: 14px;
          }
          .divider {
            height: 1px;
            background: #E5E7EB;
            margin: 30px 0;
          }
          .amount-section {
            text-align: center;
            margin-bottom: 30px;
          }
          .amount-label {
            color: #6B7280;
            font-size: 14px;
            margin-bottom: 8px;
          }
          .amount-value {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 12px;
            color: ${isCredit ? "#22C55E" : "#EF4444"};
          }
          .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 9999px;
            font-size: 14px;
            font-weight: 500;
            background: ${getStatusColor(transaction.status)}20;
            color: ${getStatusColor(transaction.status)};
          }
          .section {
            margin-bottom: 30px;
          }
          .section-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #111827;
          }
          .row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #F3F4F6;
          }
          .row-label {
            color: #6B7280;
            font-size: 14px;
            flex: 1;
          }
          .row-value {
            font-size: 14px;
            font-weight: 500;
            flex: 1;
            text-align: right;
          }
          .footer {
            margin-top: 30px;
            padding-top: 30px;
            border-top: 1px solid #E5E7EB;
            text-align: center;
            color: #6B7280;
            font-size: 12px;
          }
          .electricity-section {
            background: #F0FDF4;
            border: 1px solid #BBF7D0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
          }
          .electricity-title {
            color: #166534;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="logo">R</div>
            <h1>Raverpay</h1>
            <div class="subtitle">Transaction Receipt</div>
          </div>

          <div class="divider"></div>

          <div class="amount-section">
            <div class="amount-label">Amount</div>
            <div class="amount-value">${isCredit ? "+" : "-"}${formattedAmount}</div>
            <div class="status-badge">${transaction.status}</div>
          </div>

          <div class="divider"></div>

          <div class="section">
            <div class="section-title">Transaction Details</div>
            <div class="row">
              <div class="row-label">Reference</div>
              <div class="row-value">${transaction.reference}</div>
            </div>
            <div class="row">
              <div class="row-label">Type</div>
              <div class="row-value">${transaction.type}</div>
            </div>
            <div class="row">
              <div class="row-label">Description</div>
              <div class="row-value">${transaction.description}</div>
            </div>
            <div class="row">
              <div class="row-label">Date</div>
              <div class="row-value">${formattedCreatedAt}</div>
            </div>
            ${
              formattedCompletedAt
                ? `
            <div class="row">
              <div class="row-label">Completed At</div>
              <div class="row-value">${formattedCompletedAt}</div>
            </div>
            `
                : ""
            }
          </div>

          <div class="section">
            <div class="section-title">Balance Information</div>
            <div class="row">
              <div class="row-label">Balance Before</div>
              <div class="row-value">${formattedBalanceBefore}</div>
            </div>
            <div class="row">
              <div class="row-label">Transaction Amount</div>
              <div class="row-value" style="color: ${isCredit ? "#22C55E" : "#EF4444"}">${formattedAmount}</div>
            </div>
            <div class="row">
              <div class="row-label">Balance After</div>
              <div class="row-value">${formattedBalanceAfter}</div>
            </div>
          </div>

          ${
            user
              ? `
          <div class="section">
            <div class="section-title">Account Information</div>
            ${
              user.firstName && user.lastName
                ? `
            <div class="row">
              <div class="row-label">Name</div>
              <div class="row-value">${user.firstName} ${user.lastName}</div>
            </div>
            `
                : ""
            }
            ${
              user.email
                ? `
            <div class="row">
              <div class="row-label">Email</div>
              <div class="row-value">${user.email}</div>
            </div>
            `
                : ""
            }
            ${
              user.phone
                ? `
            <div class="row">
              <div class="row-label">Phone</div>
              <div class="row-value">${user.phone}</div>
            </div>
            `
                : ""
            }
          </div>
          `
              : ""
          }

          ${
            transaction.metadata?.serviceType === "ELECTRICITY" &&
            transaction.metadata?.meterToken
              ? `
          <div class="electricity-section">
            <div class="electricity-title">Electricity Token</div>
            <div class="row">
              <div class="row-label">Token Number</div>
              <div class="row-value">${transaction.metadata.meterToken}</div>
            </div>
            ${
              transaction.metadata?.customerName
                ? `
            <div class="row">
              <div class="row-label">Customer Name</div>
              <div class="row-value">${transaction.metadata.customerName}</div>
            </div>
            `
                : ""
            }
            ${
              transaction.metadata?.units
                ? `
            <div class="row">
              <div class="row-label">Units</div>
              <div class="row-value">${transaction.metadata.units}</div>
            </div>
            `
                : ""
            }
            ${
              transaction.metadata?.recipient
                ? `
            <div class="row">
              <div class="row-label">Meter Number</div>
              <div class="row-value">${transaction.metadata.recipient}</div>
            </div>
            `
                : ""
            }
          </div>
          `
              : ""
          }

          <div class="footer">
            <div>This is an official receipt for your transaction.</div>
            <div style="margin-top: 8px;">For support, contact us with reference: ${transaction.reference}</div>
            <div style="margin-top: 16px;">Generated on ${formattedGeneratedAt}</div>
          </div>
        </div>
      </body>
    </html>
  `;
}
