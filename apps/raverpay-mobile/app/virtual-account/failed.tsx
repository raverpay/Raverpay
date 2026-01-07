// app/virtual-account/failed.tsx
import { Button } from "@/src/components/ui/Button";
import { Text } from "@/src/components/ui/Text";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, View } from "react-native";

export default function FailedScreen() {
  const params = useLocalSearchParams<{
    reason?: string;
  }>();

  // Check if this is a processing/manual creation scenario (not a real failure)
  const isProcessing =
    params.reason?.toLowerCase().includes("processing") ||
    params.reason?.toLowerCase().includes("still being processed") ||
    params.reason?.toLowerCase().includes("will be notified") ||
    params.reason?.toLowerCase().includes("taking longer");

  const handleTryAgain = () => {
    router.replace("/virtual-account/consent");
  };

  const handleContactSupport = () => {
    router.push("/support");
  };

  const handleGoBack = () => {
    router.replace("/fund-wallet");
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-800">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 pt-16 pb-6 px-5 border-b border-gray-200 dark:border-gray-700">
        <Text variant="h3">Verification Failed</Text>
      </View>

      <ScrollView className="flex-1 px-5 py-6">
        {/* Error Icon */}
        <View className="items-center mb-6">
          <View
            className={`w-24 h-24 rounded-full items-center justify-center mb-4 ${
              isProcessing ? "bg-orange-100" : "bg-red-100"
            }`}
          >
            <Ionicons
              name={isProcessing ? "time-outline" : "close-circle"}
              size={64}
              color={isProcessing ? "#F59E0B" : "#EF4444"}
            />
          </View>
          <Text variant="h2" align="center" className="mb-2">
            {isProcessing ? "Still Processing" : "Verification Failed"}
          </Text>
          <Text variant="body" color="secondary" align="center">
            {isProcessing
              ? "Your account is being created"
              : "We couldn't verify your information"}
          </Text>
        </View>

        {/* Reason */}
        {params.reason && (
          <View
            className={`rounded-2xl p-4 mb-6 flex-row ${
              isProcessing ? "bg-orange-50" : "bg-red-50"
            }`}
          >
            <Ionicons
              name={isProcessing ? "information-circle" : "alert-circle"}
              size={20}
              color={isProcessing ? "#F59E0B" : "#EF4444"}
              style={{ marginRight: 12 }}
            />
            <View className="flex-1">
              <Text variant="body" weight="semibold" className="mb-1">
                {isProcessing ? "Status Update" : "Error Details"}
              </Text>
              <Text variant="caption" color="secondary">
                {params.reason}
              </Text>
            </View>
          </View>
        )}

        {/* Manual Creation Message */}
        {isProcessing && (
          <View className="bg-blue-50 rounded-2xl p-4 mb-6 flex-row">
            <Ionicons
              name="checkmark-circle"
              size={20}
              color="#3B82F6"
              style={{ marginRight: 12 }}
            />
            <View className="flex-1">
              <Text variant="body" weight="semibold" className="mb-1">
                What Happens Next?
              </Text>
              <Text variant="caption" color="secondary">
                If automatic creation takes too long, our team will create your
                account manually. You&apos;ll receive a notification (email,
                SMS, and push) when your virtual account is ready to use.
              </Text>
            </View>
          </View>
        )}

        {/* Common Issues - Only show for actual failures */}
        {!isProcessing && (
          <View className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 mb-6">
            <Text variant="h4" className="mb-4">
              Common Issues
            </Text>

            <View className="space-y-4">
              <View className="flex-row items-start">
                <Ionicons
                  name="ellipse"
                  size={8}
                  color="#6B7280"
                  style={{ marginRight: 12, marginTop: 6 }}
                />
                <View className="flex-1">
                  <Text variant="body" weight="semibold" className="mb-1">
                    BVN doesn&apos;t match account details
                  </Text>
                  <Text variant="caption" color="secondary">
                    Make sure your BVN is linked to the bank account you
                    provided
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start">
                <Ionicons
                  name="ellipse"
                  size={8}
                  color="#6B7280"
                  style={{ marginRight: 12, marginTop: 6 }}
                />
                <View className="flex-1">
                  <Text variant="body" weight="semibold" className="mb-1">
                    Account number is incorrect
                  </Text>
                  <Text variant="caption" color="secondary">
                    Double-check that you entered the correct 10-digit account
                    number
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start">
                <Ionicons
                  name="ellipse"
                  size={8}
                  color="#6B7280"
                  style={{ marginRight: 12, marginTop: 6 }}
                />
                <View className="flex-1">
                  <Text variant="body" className="mb-1">
                    Inactive or closed account
                  </Text>
                  <Text variant="caption" color="secondary">
                    The bank account must be active and in good standing
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start">
                <Ionicons
                  name="ellipse"
                  size={8}
                  color="#6B7280"
                  style={{ marginRight: 12, marginTop: 6 }}
                />
                <View className="flex-1">
                  <Text variant="body" className="mb-1">
                    Name mismatch
                  </Text>
                  <Text variant="caption" color="secondary">
                    Your BVN name must match your Raverpay account name
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* What to Do */}
        {!isProcessing && (
          <View className="bg-blue-50 rounded-2xl p-6 mb-6">
            <View className="flex-row items-center mb-4">
              <Ionicons name="help-circle" size={24} color="#3B82F6" />
              <Text variant="h4" className="ml-2">
                What to Do
              </Text>
            </View>

            <View className="space-y-3">
              <Text variant="caption" color="secondary">
                1. Verify your BVN is correctly linked to your bank account
              </Text>
              <Text variant="caption" color="secondary">
                2. Ensure your account number is correct
              </Text>
              <Text variant="caption" color="secondary">
                3. Try again with the correct information
              </Text>
              <Text variant="caption" color="secondary">
                4. If the problem persists, contact our support team
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer Buttons */}
      <View className="px-5 pb-6 pt-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3">
        {isProcessing ? (
          <>
            <Button variant="primary" onPress={handleGoBack}>
              Go to Wallet
            </Button>
            <Button variant="outline" onPress={handleContactSupport}>
              Contact Support
            </Button>
          </>
        ) : (
          <>
            <Button variant="primary" onPress={handleTryAgain}>
              Try Again
            </Button>
            <Button variant="outline" onPress={handleContactSupport}>
              Contact Support
            </Button>
            <Button variant="ghost" onPress={handleGoBack}>
              Go Back
            </Button>
          </>
        )}
      </View>
    </View>
  );
}
