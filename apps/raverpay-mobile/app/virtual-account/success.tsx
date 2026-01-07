// app/virtual-account/success.tsx
import { Button } from "@/src/components/ui/Button";
import { Text } from "@/src/components/ui/Text";
import { toast } from "@/src/lib/utils/toast";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import React, { useCallback } from "react";
import { BackHandler, ScrollView, TouchableOpacity, View } from "react-native";

export default function SuccessScreen() {
  const params = useLocalSearchParams<{
    accountNumber: string;
    accountName: string;
    bankName: string;
  }>();

  // Prevent going back to BVN verification screen - redirect to fund-wallet instead
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.replace("/fund-wallet");
        return true; // Prevent default back behavior
      };

      // Android hardware back button
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => backHandler.remove();
    }, [])
  );

  const handleClose = () => {
    router.replace("/fund-wallet");
  };

  const handleCopyAccountNumber = async () => {
    await Clipboard.setStringAsync(params.accountNumber);
    toast.success({
      title: "Copied!",
      message: "Account number copied to clipboard",
    });
  };

  // const handleShareAccount = async () => {
  //   try {
  //     await Share.share({
  //       message: `My Raverpay Account Details:\n\nBank: ${params.bankName}\nAccount Number: ${params.accountNumber}\nAccount Name: ${params.accountName}`,
  //     });
  //   } catch {
  //     // User cancelled share - ignore error
  //   }
  // };

  const handleStartUsing = () => {
    router.replace("/fund-wallet");
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <View className="flex-1 bg-white dark:bg-gray-800">
        {/* Header */}
        <View className="bg-white dark:bg-gray-800 pt-16 pb-6 px-5 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center justify-between">
            <Text variant="h3">Account Created</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1 px-5 py-6">
          {/* Success Icon */}
          <View className="items-center mb-6">
            <View className="w-24 h-24 bg-green-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="checkmark-circle" size={34} color="#10B981" />
            </View>
            <Text variant="h3" align="center" className="mb-2">
              Account Created!
            </Text>
            <Text variant="body" color="secondary" align="center">
              Your virtual account is ready to use
            </Text>
          </View>

          {/* Account Details Card */}
          <View className="bg-gradient-to-br from-[#5B55F6] to-purple-800 rounded-3xl p-6 mb-6">
            <Text className="text-white text-sm mb-4 opacity-80">
              Your Virtual Account
            </Text>

            <View className="mb-4">
              <Text className=" text-xs mb-1 opacity-80">Bank Name</Text>
              <Text className=" text-lg font-semibold">{params.bankName}</Text>
            </View>

            <View className="mb-4">
              <Text className="text-xs mb-1 opacity-80">Account Number</Text>
              <View className="flex-row items-center justify-between">
                <Text className=" text-3xl font-bold tracking-wider">
                  {params.accountNumber}
                </Text>
                <TouchableOpacity
                  onPress={handleCopyAccountNumber}
                  className="bg-white dark:bg-gray-800/20 px-4 py-2 rounded-xl"
                >
                  <Ionicons name="copy-outline" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            <View>
              <Text className=" text-xs mb-1 opacity-80">Account Name</Text>
              <Text className=" text-base font-medium">
                {params.accountName}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          {/* <View className="flex-row mb-6">
            <TouchableOpacity
              onPress={handleCopyAccountNumber}
              className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-2xl p-4 flex-row items-center justify-center mr-3"
            >
              <Ionicons name="copy-outline" size={20} color="#111827" />
              <Text variant="body" weight="bold" className="ml-2">
                Copy
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShareAccount}
              className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-2xl p-4 flex-row items-center justify-center"
            >
              <Ionicons name="share-outline" size={20} color="#111827" />
              <Text variant="body" weight="bold" className="ml-2">
                Share
              </Text>
            </TouchableOpacity>
          </View> */}

          {/* How to Use */}
          {/* <View className="bg-blue-50 dark:bg-blue-900 rounded-2xl p-6 mb-6">
            <View className="flex-row items-center mb-4">
              <Ionicons name="information-circle" size={24} color="#3B82F6" />
              <Text variant="h3" className="ml-2">
                How to Use
              </Text>
            </View>

            <View className="space-y-3">
              <View className="flex-row items-start">
                <View className="w-6 h-6 bg-[#5B55F6] rounded-full items-center justify-center mr-3 mt-0.5">
                  <Text className="text-white text-xs font-bold">1</Text>
                </View>
                <Text variant="body" color="secondary" className="flex-1">
                  Copy your account number
                </Text>
              </View>

              <View className="flex-row items-start">
                <View className="w-6 h-6 bg-[#5B55F6] rounded-full items-center justify-center mr-3 mt-0.5">
                  <Text className="text-white text-xs font-bold">2</Text>
                </View>
                <Text variant="body" color="secondary" className="flex-1">
                  Open your banking app
                </Text>
              </View>

              <View className="flex-row items-start">
                <View className="w-6 h-6 bg-[#5B55F6] rounded-full items-center justify-center mr-3 mt-0.5">
                  <Text className="text-white text-xs font-bold">3</Text>
                </View>
                <Text variant="body" color="secondary" className="flex-1">
                  Transfer any amount to this account
                </Text>
              </View>

              <View className="flex-row items-start">
                <View className="w-6 h-6 bg-[#5B55F6] rounded-full items-center justify-center mr-3 mt-0.5">
                  <Text className="text-white text-xs font-bold">4</Text>
                </View>
                <Text variant="body" color="secondary" className="flex-1">
                  Your wallet will be credited instantly!
                </Text>
              </View>
            </View>
          </View> */}

          {/* Benefits Reminder */}
          {/* <View className="bg-gray-50  dark:bg-gray-900 rounded-2xl p-4">
            <View className="flex-row items-center mb-3">
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text variant="body" className="ml-2">
                No fees, instant credit
              </Text>
            </View>
            <View className="flex-row items-center mb-3">
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text variant="body" className="ml-2">
                Works 24/7, even on weekends
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text variant="body" className="ml-2">
                This account is permanently yours
              </Text>
            </View>
          </View> */}
        </ScrollView>

        {/* Footer Button */}
        <View className="px-5 pb-6 pt-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <Button variant="primary" onPress={handleStartUsing}>
            Start Using Account
          </Button>
        </View>
      </View>
    </>
  );
}
