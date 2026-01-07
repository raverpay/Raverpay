// app/virtual-account/consent.tsx
import { Button } from "@/src/components/ui/Button";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Text } from "@/src/components/ui/Text";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { ScrollView, View } from "react-native";

export default function VirtualAccountConsentScreen() {
  const handleContinue = () => {
    router.push("/virtual-account/bvn-form");
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-800">
      {/* Header */}
      {/* <View className="bg-white dark:bg-gray-800 pt-12 pb-6 px-5 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={handleCancel} className="mr-4">
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
          <Text variant="h3">Get Virtual Account</Text>
        </View>
      </View> */}

      <ScreenHeader title="Get virtual account" />

      <ScrollView className="flex-1 px-5 py-6">
        {/* Icon */}
        <View className="items-center mb-6">
          <View className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full items-center justify-center">
            <Ionicons name="card-outline" size={40} color="#5B55F6" />
          </View>
        </View>

        {/* Title */}
        <Text variant="h3" align="center" className="mb-4">
          Get Your Dedicated Account
        </Text>

        <Text variant="body" color="secondary" align="center" className="mb-8">
          Fund your wallet instantly with a dedicated bank account number
        </Text>

        {/* Benefits */}
        {/* <View className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 mb-6">
          <Text variant="h3" className="mb-4">
            Benefits
          </Text>

          <View className="gap-4">
            <View className="flex-row items-start">
              <View className="w-6 h-6 bg-green-100 rounded-full items-center justify-center mr-3 mt-0.5">
                <Ionicons name="checkmark" size={16} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text variant="body" className="mb-1">
                  Instant Wallet Funding
                </Text>
                <Text variant="body" color="secondary">
                  Transfer money and your wallet is credited immediately
                </Text>
              </View>
            </View>

            <View className="flex-row items-start">
              <View className="w-6 h-6 bg-green-100 rounded-full items-center justify-center mr-3 mt-0.5">
                <Ionicons name="checkmark" size={16} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text variant="body" className="mb-1">
                  No Manual Verification
                </Text>
                <Text variant="body" color="secondary">
                  Funds are automatically credited without waiting for approval
                </Text>
              </View>
            </View>

            <View className="flex-row items-start">
              <View className="w-6 h-6 bg-green-100 rounded-full items-center justify-center mr-3 mt-0.5">
                <Ionicons name="checkmark" size={16} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text variant="body" className="mb-1">
                  Transfer Anytime, 24/7
                </Text>
                <Text variant="body" color="secondary">
                  Fund your wallet at any time, even on weekends and holidays
                </Text>
              </View>
            </View>
          </View>
        </View> */}

        {/* Required Information */}
        <View className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-6 mb-6">
          <Text variant="h4" className="mb-4">
            Required Information
          </Text>

          <Text variant="body" color="secondary" className="mb-4">
            For compliance with Nigerian financial regulations, we need to
            verify your identity by providing the following information:
          </Text>

          <View className="space-y-2">
            <View className="flex-row items-center">
              <Ionicons
                name="ellipse"
                size={8}
                color="#5B55F6"
                style={{ marginRight: 8 }}
              />
              <Text variant="body" color="secondary">
                Bank Account Number
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons
                name="ellipse"
                size={8}
                color="#5B55F6"
                style={{ marginRight: 8 }}
              />
              <Text variant="body" color="secondary">
                Bank Name
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons
                name="ellipse"
                size={8}
                color="#5B55F6"
                style={{ marginRight: 8 }}
              />
              <Text variant="body" color="secondary">
                BVN (Bank Verification Number)
              </Text>
            </View>
          </View>
        </View>

        {/* Privacy Notice */}
        <View className="bg-blue-50 dark:bg-gray-800 rounded-2xl p-4 mb-6 flex-row">
          <Ionicons
            name="lock-closed"
            size={20}
            color="#3B82F6"
            style={{ marginRight: 12 }}
          />
          <View className="flex-1">
            <Text variant="body" color="secondary">
              Your data is secure and encrypted. We only use this information
              for identity verification as required by CBN regulations.
            </Text>
          </View>
        </View>

        {/* Consent */}
        <View className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 mb-8">
          <Text variant="body" color="secondary">
            By continuing, you agree to share your personal information with our
            payment processor (Paystack) for the purpose of creating and
            managing your dedicated virtual account.
          </Text>
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      <View className="px-5 pb-6 pt-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <Button variant="primary" onPress={handleContinue} className="mb-3">
          Continue
        </Button>
        {/* <Button variant="outline" onPress={handleCancel}>
          Cancel
        </Button> */}
      </View>
    </View>
  );
}
