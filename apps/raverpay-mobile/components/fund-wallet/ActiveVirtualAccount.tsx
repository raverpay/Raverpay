// components/fund-wallet/ActiveVirtualAccount.tsx
import { Card, Text } from "@/src/components/ui";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";

interface VirtualAccountData {
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  isActive: boolean;
}

interface ActiveVirtualAccountProps {
  virtualAccount: VirtualAccountData;
  onCopyAccountNumber: () => void;
  onShareAccount: () => void;
  onRequeryAccount: () => void;
}

export function ActiveVirtualAccount({
  virtualAccount,
  onCopyAccountNumber,
  onShareAccount,
  onRequeryAccount,
}: ActiveVirtualAccountProps) {
  return (
    <>
      {/* Virtual Account Card */}
      <Card
        variant="elevated"
        className="p-6 mb-4 bg-gradient-to-br from-[#5B55F6] to-purple-800"
      >
        <Text variant="caption" className="text-neutral-500 mb-4">
          Your Virtual Account
        </Text>

        <View className="mb-4">
          <Text variant="caption" className="text-neutral-500 mb-1">
            Bank Name
          </Text>
          <Text variant="body" weight="bold">
            {virtualAccount.bankName}
          </Text>
        </View>

        <View className="mb-4">
          <Text variant="caption" className="text-neutral-500 mb-1">
            Account Number
          </Text>
          <View className="flex-row items-center justify-between">
            <Text variant="h2" weight="bold">
              {virtualAccount.accountNumber}
            </Text>
            <TouchableOpacity
              onPress={onCopyAccountNumber}
              className="bg-white/20 px-3 py-2 rounded-lg"
            >
              <Ionicons name="copy-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View>
          <Text variant="caption" className="text-neutral-500 mb-1">
            Account Name
          </Text>
          <Text variant="body" weight="bold">
            {virtualAccount.accountName}
          </Text>
        </View>
      </Card>

      {/* Action Buttons */}
      {/* <View className="flex-row mb-4 gap-3">
        <TouchableOpacity
          onPress={onCopyAccountNumber}
          className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex-row items-center justify-center"
        >
          <Ionicons
            name="copy-outline"
            size={20}
            color={isDark ? "#E5E7EB" : "#111827"}
          />
          <Text variant="bodyMedium" className="ml-2">
            Copy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onShareAccount}
          className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex-row items-center justify-center"
        >
          <Ionicons
            name="share-outline"
            size={20}
            color={isDark ? "#E5E7EB" : "#111827"}
          />
          <Text variant="bodyMedium" className="ml-2">
            Share
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onRequeryAccount}
          className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex-row items-center justify-center"
        >
          <Ionicons
            name="refresh-outline"
            size={20}
            color={isDark ? "#E5E7EB" : "#111827"}
          />
          <Text variant="bodyMedium" className="ml-2">
            Refresh
          </Text>
        </TouchableOpacity>
      </View> */}

      {/* Instructions */}
      {/* <Card variant="elevated" className="p-4 mb-6 bg-blue-50">
        <View className="flex-row items-start mb-3">
          <Ionicons name="information-circle" size={20} color="#3B82F6" />
          <Text variant="bodyMedium" className="ml-3 flex-1 text-blue-800">
            How to Fund Your Wallet
          </Text>
        </View>

        <View className="ml-7 space-y-2">
          <Text variant="caption" className="text-blue-700">
            1. Copy your account number above
          </Text>
          <Text variant="caption" className="text-blue-700">
            2. Open your banking app
          </Text>
          <Text variant="caption" className="text-blue-700">
            3. Transfer any amount to this account
          </Text>
          <Text variant="caption" className="text-blue-700">
            4. Your wallet will be credited instantly!
          </Text>
        </View>
      </Card> */}

      {/* Benefits */}
      {/* <Card variant="elevated" className="p-4 mb-4 bg-gray-50">
        <View className="flex-row items-center mb-3">
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text variant="caption" className="ml-2">
            No fees • Instant credit
          </Text>
        </View>
        <View className="flex-row items-center mb-3">
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text variant="caption" className="ml-2">
            Works 24/7, even on weekends
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text variant="caption" className="ml-2">
            This account is permanently yours
          </Text>
        </View>
      </Card> */}
    </>
  );
}
