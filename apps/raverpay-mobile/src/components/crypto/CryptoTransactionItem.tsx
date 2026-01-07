// src/components/crypto/CryptoTransactionItem.tsx
import { Text } from "@/src/components/ui";
import { formatRelativeTime } from "@/src/lib/utils/formatters";
import { CryptoTransaction, TokenSymbol } from "@/src/types/crypto.types";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { TouchableOpacity, View } from "react-native";

interface CryptoTransactionItemProps {
  transaction: CryptoTransaction;
  onPress?: () => void;
}

const TOKEN_COLORS: Record<TokenSymbol, string> = {
  MATIC: "#5B55F6",
  USDT: "#10B981",
  USDC: "#3B82F6",
};

export const CryptoTransactionItem: React.FC<CryptoTransactionItemProps> = ({
  transaction,
}) => {
  const isIncoming = transaction.direction === "INCOMING";
  const tokenColor = TOKEN_COLORS[transaction.tokenSymbol] || "#6B7280";

  const handlePress = () => {
    router.push(`/crypto/transaction-details?id=${transaction.id}`);
  };

  return (
    <TouchableOpacity onPress={handlePress} className="mb-3">
      <View className="">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center flex-1">
            <View
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{
                backgroundColor: isIncoming
                  ? `${tokenColor}20`
                  : `${tokenColor}20`,
              }}
            >
              <Ionicons
                name={isIncoming ? "arrow-down" : "arrow-up"}
                size={20}
                color={tokenColor}
              />
            </View>
            <View className="flex-1">
              {/* <Text variant="body" weight="semibold">
                {transaction.type}
              </Text> */}
              <Text variant="caption" color="secondary">
                {transaction.tokenSymbol}
              </Text>
              <Text variant="caption" color="secondary">
                {formatRelativeTime(transaction.submittedAt)}
              </Text>
            </View>
          </View>
          <View className="items-end">
            <Text
              variant="body"
              weight="bold"
              style={{ color: isIncoming ? "#10B981" : "#EF4444" }}
            >
              {isIncoming ? "+" : "-"}
              {parseFloat(transaction.amount).toFixed(2)}
            </Text>
            {/* <Text variant="caption" color="secondary">
              ${parseFloat(transaction.usdValue).toFixed(2)}
            </Text> */}
            <View className="flex-row items-center">
              <Text variant="caption" color="secondary">
                {transaction.status}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};
