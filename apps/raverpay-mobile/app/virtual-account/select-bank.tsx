// app/virtual-account/select-bank.tsx
import { Button } from "@/src/components/ui/Button";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Text } from "@/src/components/ui/Text";
import { handleApiError } from "@/src/lib/api/client";
import { toast } from "@/src/lib/utils/toast";

import {
  getDVAProviders,
  requestVirtualAccount,
} from "@/src/services/virtual-account.service";
import type { DVAProvider } from "@/src/types/virtual-account";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";

export default function SelectBankScreen() {
  const params = useLocalSearchParams<{
    bankCode: string;
    accountNumber: string;
    bvn: string;
    accountName: string;
  }>();

  const [selectedProvider, setSelectedProvider] = useState<DVAProvider | null>(
    null
  );

  // Fetch DVA providers
  const { data: providers, isLoading } = useQuery({
    queryKey: ["dva-providers"],
    queryFn: getDVAProviders,
  });

  // Request virtual account mutation
  const requestMutation = useMutation({
    mutationFn: requestVirtualAccount,
    onSuccess: (data) => {
      // Always navigate to processing screen if we got a response
      // Even if success is false, the backend might have created customer code
      // and will retry DVA creation
      router.replace("/virtual-account/processing");
    },
    onError: (error: any) => {
      const apiError = handleApiError(error);
      const errorMessage = Array.isArray(apiError.message)
        ? apiError.message.join(". ")
        : apiError.message || "Failed to create virtual account";

      // Check if error is transient (retryable)
      const isTransientError =
        error?.response?.status >= 500 ||
        error?.response?.status === 408 ||
        error?.message?.includes("timeout") ||
        error?.message?.includes("network") ||
        error?.code === "ECONNABORTED" ||
        error?.code === "ERR_NETWORK";

      // Check if it's a non-retryable validation error
      const isValidationError =
        error?.response?.status === 400 &&
        (errorMessage.toLowerCase().includes("bvn") ||
          errorMessage.toLowerCase().includes("invalid") ||
          errorMessage.toLowerCase().includes("required") ||
          errorMessage.toLowerCase().includes("missing"));

      if (isTransientError && !isValidationError) {
        // Transient error - navigate to processing screen
        // Backend will retry, user will be notified when ready
        router.replace("/virtual-account/processing");
      } else {
        // Non-retryable error - show error message
        toast.error({
          title: "Request failed",
          message: errorMessage,
        });
      }
    },
  });

  const handleCreateAccount = () => {
    if (!selectedProvider) {
      toast.error({
        title: "No bank selected",
        message: "Please select a bank for your virtual account",
      });
      return;
    }

    requestMutation.mutate({
      preferred_bank: selectedProvider.provider_slug,
      account_number: params.accountNumber,
      bvn: params.bvn,
      bank_code: params.bankCode,
    });
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-800">
      {/* Header */}
      {/* <View className="bg-white dark:bg-gray-800 pt-16 pb-6 px-5 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-4"
            disabled={requestMutation.isPending}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={requestMutation.isPending ? "#9CA3AF" : "#111827"}
            />
          </TouchableOpacity>
          <Text variant="h3">Choose your bank</Text>
        </View>
      </View> */}

      <ScreenHeader
        title="Choose your bank"
        disabled={requestMutation.isPending}
      />

      <ScrollView className="flex-1 px-5 py-6">
        {/* Progress */}
        <View className="mb-6">
          <Text variant="caption" color="secondary" className="mb-2">
            Step 2 of 2
          </Text>
          <View className="flex-row">
            <View className="flex-1 h-1 bg-[#5B55F6] rounded-full mr-2" />
            <View className="flex-1 h-1 bg-[#5B55F6] rounded-full" />
          </View>
        </View>

        <Text variant="h4" className="mb-2">
          Select virtual account bank
        </Text>
        <Text variant="caption" color="secondary" className="mb-6">
          Choose which bank will provide your dedicated account number
        </Text>

        {/* Account Preview */}
        <View className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 mb-6">
          <Text variant="caption" color="secondary" className="mb-2">
            Verified Account
          </Text>
          <Text variant="body" weight="bold" className="mb-1">
            {params.accountName}
          </Text>
          <Text variant="caption" color="secondary">
            {params.accountNumber}
          </Text>
        </View>

        {/* Bank Providers */}
        {isLoading ? (
          <View className="p-8 items-center">
            <ActivityIndicator size="large" color="#5B55F6" />
            <Text variant="caption" color="secondary" className="mt-4">
              Loading available banks...
            </Text>
          </View>
        ) : (
          <View className="space-y-3">
            {providers?.map((provider) => (
              <TouchableOpacity
                key={provider.id}
                onPress={() => setSelectedProvider(provider)}
                disabled={requestMutation.isPending}
                className={`border-2 rounded-2xl p-5 mb-4 ${
                  selectedProvider?.id === provider.id
                    ? "border-[#5B55F6] bg-purple-50 dark:bg-purple-900/30 "
                    : "border-gray-200 bg-white dark:bg-gray-800"
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-1">
                      <Text variant="body" weight="bold">
                        {provider.bank_name}
                      </Text>
                      {provider.provider_slug === "titan-paystack" && (
                        <View className="ml-2 bg-[#5B55F6] px-2 py-1 rounded-full">
                          <Text
                            variant="caption"
                            className="text-white text-xs"
                          >
                            Popular
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text variant="caption" color="secondary">
                      {provider.provider_slug === "wema-bank"
                        ? "Fast processing, reliable service"
                        : "Most recommended by users"}
                    </Text>
                  </View>
                  <View
                    className={`w-6 h-6 rounded-full border-2 items-center justify-center ml-3 ${
                      selectedProvider?.id === provider.id
                        ? "border-[#5B55F6] bg-[#5B55F6]"
                        : "border-gray-300"
                    }`}
                  >
                    {selectedProvider?.id === provider.id && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Info */}
        {/* <View className="bg-blue-50 rounded-2xl p-4 flex-row mt-6">
          <Ionicons
            name="information-circle"
            size={20}
            color="#3B82F6"
            style={{ marginRight: 12 }}
          />
          <View className="flex-1">
            <Text variant="caption" color="secondary">
              Your account will be created with the selected bank. Verification
              may take 30-60 seconds.
            </Text>
          </View>
        </View> */}
      </ScrollView>

      {/* Footer Button */}
      <View className="px-5 pb-6 pt-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <Button
          variant="primary"
          onPress={handleCreateAccount}
          disabled={!selectedProvider || requestMutation.isPending}
          loading={requestMutation.isPending}
        >
          {requestMutation.isPending
            ? "Creating Account..."
            : "Create Virtual Account"}
        </Button>
      </View>
    </View>
  );
}
