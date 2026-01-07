// app/virtual-account/bvn-form.tsx
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { Text } from "@/src/components/ui/Text";
import { handleApiError } from "@/src/lib/api/client";
import { toast } from "@/src/lib/utils/toast";

import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { useTheme } from "@/src/hooks/useTheme";
import {
  getBanks,
  resolveAccountNumber,
} from "@/src/services/virtual-account.service";
import type { Bank } from "@/src/types/virtual-account";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";

export default function BVNFormScreen() {
  const { isDark } = useTheme();
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [bvn, setBvn] = useState("");
  const [accountName, setAccountName] = useState("");
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState("");

  // Fetch banks
  const { data: banks, isPending: banksLoading } = useQuery({
    queryKey: ["banks"],
    queryFn: getBanks,
  });

  // Filter banks based on search query
  const filteredBanks = useMemo(() => {
    if (!banks) return [];
    if (!bankSearchQuery.trim()) return banks;

    const query = bankSearchQuery.toLowerCase();
    return banks.filter((bank) => bank.name.toLowerCase().includes(query));
  }, [banks, bankSearchQuery]);

  // Resolve account number mutation
  const resolveAccountMutation = useMutation({
    mutationFn: ({
      accountNumber,
      bankCode,
    }: {
      accountNumber: string;
      bankCode: string;
    }) => resolveAccountNumber(accountNumber, bankCode),
    onSuccess: (data) => {
      setAccountName(data.accountName);

      //  console.log({ data });
      toast.success({
        title: "Account verified",
        message: `Account holder: ${data.accountName}`,
      });
    },
    onError: (error) => {
      setAccountName("");
      const apiError = handleApiError(error);
      // Handle error message (can be string or array)
      const errorMessage = Array.isArray(apiError.message)
        ? apiError.message.join(". ")
        : apiError.message ||
          "Could not verify account number. Please check and try again.";

      toast.error({
        title: "Verification failed",
        message: errorMessage,
      });
    },
  });

  // Auto-resolve account when account number is complete
  useEffect(() => {
    if (accountNumber.length === 10 && selectedBank) {
      setAccountName("");
      resolveAccountMutation.mutate({
        accountNumber,
        bankCode: selectedBank.code,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountNumber, selectedBank]);

  const handleContinue = () => {
    if (!selectedBank || !accountNumber || !bvn || !accountName) {
      toast.error({
        title: "Missing information",
        message: "Please fill all required fields",
      });
      return;
    }

    if (accountNumber.length !== 10) {
      toast.error({
        title: "Invalid account number",
        message: "Account number must be 10 digits",
      });
      return;
    }

    if (bvn.length !== 11) {
      toast.error({
        title: "Invalid BVN",
        message: "BVN must be 11 digits",
      });
      return;
    }

    // Navigate to bank selection with BVN data
    router.push({
      pathname: "/virtual-account/select-bank",
      params: {
        bankCode: selectedBank.code,
        accountNumber,
        bvn,
        accountName,
      },
    });
  };

  const isFormValid =
    selectedBank &&
    accountNumber.length === 10 &&
    bvn.length === 11 &&
    accountName &&
    !resolveAccountMutation.isPending;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white dark:bg-gray-800"
    >
      {/* Header */}
      {/* <View className="bg-white dark:bg-gray-800 pt-16 pb-6 px-5 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text variant="h3">Verify Your Identity</Text>
        </View>
      </View> */}

      <ScreenHeader
        title="Verify your identity"
        disabled={resolveAccountMutation.isPending}
      />

      <ScrollView className="flex-1 px-5 py-6">
        {/* Progress */}
        <View className="mb-6">
          <Text variant="body" color="secondary" className="mb-2">
            Step 1 of 2
          </Text>
          <View className="flex-row">
            <View className="flex-1 h-1 bg-[#5B55F6] rounded-full mr-2" />
            <View className="flex-1 h-1 bg-gray-200 rounded-full" />
          </View>
        </View>

        <Text variant="h4" className="mb-2">
          Bank Details
        </Text>
        <Text variant="body" color="secondary" className="mb-6">
          We&apos;ll use this information to verify your identity
        </Text>

        {/* Select Bank */}
        <View className="mb-4">
          <Text variant="body" className="mb-2">
            Select Your Bank <Text className="text-red-500">*</Text>
          </Text>
          <TouchableOpacity
            onPress={() => setShowBankPicker(true)}
            className="border border-gray-300 dark:border-gray-700 rounded-xl p-4 flex-row items-center justify-between"
          >
            <Text variant="body" color={selectedBank ? "primary" : "secondary"}>
              {selectedBank ? selectedBank.name : "Select Bank"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Account Number */}
        <View className="mb-4">
          <Input
            label="Account Number"
            placeholder="0123456789"
            value={accountNumber}
            onChangeText={(text) =>
              setAccountNumber(text.replace(/[^0-9]/g, ""))
            }
            keyboardType="number-pad"
            maxLength={10}
            required
            editable={!!selectedBank}
          />
          {resolveAccountMutation.isPending && (
            <View className="flex-row items-center mt-2">
              <ActivityIndicator size="small" color="#5B55F6" />
              <Text variant="body" color="secondary" className="ml-2">
                Verifying account...
              </Text>
            </View>
          )}
          {accountName && (
            <View className="flex-row items-center mt-2">
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text variant="body" className="ml-2 text-green-600">
                {accountName}
              </Text>
            </View>
          )}
        </View>

        {/* BVN */}
        <View className="mb-6">
          <Input
            label="BVN (Bank Verification Number)"
            placeholder="22012000000"
            value={bvn}
            onChangeText={(text) => setBvn(text.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            maxLength={11}
            required
            secureTextEntry
          />
          <View className="flex-row items-center mt-2">
            <Ionicons name="lock-closed" size={14} color="#9CA3AF" />
            <Text variant="body" color="secondary" className="ml-1">
              Your BVN is encrypted and secure
            </Text>
          </View>
        </View>

        {/* Info Box */}
        <View className="bg-blue-50 dark:bg-blue-900 rounded-2xl p-4 flex-row">
          <Ionicons
            name="information-circle"
            size={20}
            color="#3B82F6"
            style={{ marginRight: 12 }}
          />
          <View className="flex-1">
            <Text variant="body" color="secondary">
              Make sure your BVN is linked to the bank account you provided.
              This is required for compliance with CBN regulations.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer Button */}
      <View className="px-5 pb-6 pt-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <Button
          variant="primary"
          onPress={handleContinue}
          disabled={!isFormValid}
        >
          Continue
        </Button>
      </View>

      {/* Bank Picker Modal */}
      {showBankPicker && (
        <View className="absolute inset-0 bg-black/50">
          <View className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl min-h-[90%] max-h-[90%]">
            <View className="p-5 border-b border-gray-200 dark:border-gray-700">
              <View className="flex-row items-center justify-between mb-4">
                <Text variant="h4">Select Bank</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowBankPicker(false);
                    setBankSearchQuery("");
                  }}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={isDark ? "#FFFFFF" : "#111827"}
                  />
                </TouchableOpacity>
              </View>

              {/* Search Input */}
              <View className="flex-row ">
                <Input
                  placeholder="Search banks..."
                  value={bankSearchQuery}
                  onChangeText={setBankSearchQuery}
                  className="flex-1 ml-2 bg-transparent"
                  style={{ paddingVertical: 0 }}
                />
                {bankSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setBankSearchQuery("")}>
                    <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {banksLoading ? (
              <View className="p-8 items-center">
                <ActivityIndicator size="large" color="#5B55F6" />
              </View>
            ) : filteredBanks.length === 0 ? (
              <View className="p-8 items-center">
                <Ionicons name="search" size={48} color="#D1D5DB" />
                <Text variant="body" color="secondary" className="mt-4">
                  No banks found
                </Text>
              </View>
            ) : (
              <View className="flex-1 h-[90%]">
                <FlashList
                  data={filteredBanks}
                  keyExtractor={(item, index) =>
                    `${item.code}-${item.id}-${index}`
                  }
                  // estimatedItemSize={64}
                  renderItem={({ item: bank }) => (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedBank(bank);
                        setShowBankPicker(false);
                        setBankSearchQuery("");
                        setAccountNumber("");
                        setAccountName("");
                      }}
                      className="p-4 border-b border-gray-100 flex-row items-center justify-between"
                    >
                      <Text variant="body">{bank.name}</Text>
                      {selectedBank?.code === bank.code && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#5B55F6"
                        />
                      )}
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
