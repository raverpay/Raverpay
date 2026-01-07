// app/virtual-account/processing.tsx
import { Text } from "@/src/components/ui/Text";
import { apiClient } from "@/src/lib/api/client";
import { API_ENDPOINTS } from "@/src/lib/api/endpoints";
import { getMyVirtualAccount } from "@/src/services/virtual-account.service";
import { useUserStore } from "@/src/store/user.store";
import type { User } from "@/src/types/api.types";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

type ProcessingStep = "customer" | "verifying" | "creating";

export default function ProcessingScreen() {
  const [currentStep, setCurrentStep] = useState<ProcessingStep>("customer");
  const [pollCount, setPollCount] = useState(0);
  const [bvnVerified, setBvnVerified] = useState(false);
  const maxPolls = 100; // 100 polls x 3 seconds = 5 minutes (extended for retries)
  const { updateUser } = useUserStore();
  const queryClient = useQueryClient();

  // Poll for virtual account status
  const { data: virtualAccount, isError } = useQuery({
    queryKey: ["virtual-account"],
    queryFn: getMyVirtualAccount,
    refetchInterval: 3000, // Poll every 3 seconds
    enabled: pollCount < maxPolls,
  });

  // Poll for user verification status (BVN and KYC tier)
  const { data: userData } = useQuery<User>({
    queryKey: ["user"],
    queryFn: async () => {
      const { data } = await apiClient.get<User>(API_ENDPOINTS.AUTH.ME);
      return data;
    },
    refetchInterval: 5000, // Poll every 5 seconds
    enabled: pollCount < maxPolls && !bvnVerified,
  });

  // Handle user data updates when query succeeds
  useEffect(() => {
    if (userData?.bvnVerified && !bvnVerified) {
      setBvnVerified(true);
      // Update user store with latest data
      updateUser({
        bvnVerified: userData.bvnVerified,
        kycTier: userData.kycTier,
      });
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: ["user"] });
    }
  }, [userData, bvnVerified, updateUser, queryClient]);

  useEffect(() => {
    // Increment poll count
    const timer = setInterval(() => {
      setPollCount((prev) => prev + 1);
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Simulate progress steps
    if (pollCount > 5 && currentStep === "customer") {
      setCurrentStep("verifying");
    }
    // Move to creating step when BVN is verified OR after some time
    if ((bvnVerified || pollCount > 15) && currentStep === "verifying") {
      setCurrentStep("creating");
    }
  }, [pollCount, currentStep, bvnVerified]);

  useEffect(() => {
    // Check if virtual account was created
    if (virtualAccount) {
      const status =
        virtualAccount.creationStatus ||
        (virtualAccount.isActive ? "ACTIVE" : "PENDING");

      if (status === "ACTIVE" && virtualAccount.isActive) {
        // Success! Navigate to success screen
        router.replace({
          pathname: "/virtual-account/success",
          params: {
            accountNumber: virtualAccount.accountNumber,
            accountName: virtualAccount.accountName,
            bankName: virtualAccount.bankName,
          },
        });
      } else if (status === "FAILED") {
        // Failed - navigate to failed screen
        router.replace({
          pathname: "/virtual-account/failed",
          params: {
            reason:
              virtualAccount.failureReason ||
              "Virtual account creation failed. Our team will create it manually and notify you.",
          },
        });
      }
      // PENDING or PROCESSING - continue polling
    }
  }, [virtualAccount]);

  useEffect(() => {
    // Handle timeout or error
    if (pollCount >= maxPolls || isError) {
      // Check if we have a virtual account with status
      if (
        virtualAccount?.creationStatus === "PROCESSING" ||
        virtualAccount?.creationStatus === "PENDING"
      ) {
        // Still processing - show message that they'll be notified
        router.replace({
          pathname: "/virtual-account/failed",
          params: {
            reason:
              "Your virtual account is still being processed. You'll receive a notification when it's ready.",
          },
        });
      } else {
        router.replace({
          pathname: "/virtual-account/failed",
          params: {
            reason: isError
              ? "Network error occurred. Our team will create your account manually and notify you."
              : "Verification is taking longer than expected. You'll receive a notification when it's ready.",
          },
        });
      }
    }
  }, [pollCount, isError, virtualAccount]);

  const getStepIcon = (step: ProcessingStep) => {
    if (
      (step === "customer" && currentStep !== "customer") ||
      (step === "verifying" && currentStep === "creating")
    ) {
      return (
        <View className="w-6 h-6 bg-green-500 rounded-full items-center justify-center">
          <Ionicons name="checkmark" size={16} color="white" />
        </View>
      );
    }

    if (step === currentStep) {
      return <ActivityIndicator size="small" color="#5B55F6" />;
    }

    return (
      <View className="w-6 h-6 bg-gray-300 rounded-full items-center justify-center">
        <View className="w-3 h-3 bg-white dark:bg-gray-800 rounded-full" />
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-800 items-center justify-center px-5">
      {/* Main Loading Indicator */}
      <View className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-full items-center justify-center mb-8">
        <ActivityIndicator size="small" color="#5B55F6" />
      </View>

      {/* Title */}
      <Text variant="h3" align="center" className="mb-2">
        Creating your account
      </Text>
      <Text variant="body" color="secondary" align="center" className="mb-12">
        {virtualAccount?.creationStatus === "PROCESSING"
          ? "We're retrying if needed. This may take a few minutes."
          : virtualAccount?.creationStatus === "PENDING"
            ? "BVN verification in progress. This may take 1-2 minutes."
            : "This may take 30-60 seconds"}
        {"\n"}
        Please don&apos;t close this screen. You&apos;ll be notified when
        it&apos;s ready
      </Text>

      {/* Progress Steps */}
      <View className="w-full bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
        {/* Step 1: Customer Created */}
        <View className="flex-row items-center mb-6">
          {getStepIcon("customer")}
          <View className="ml-4 flex-1">
            <Text
              variant="body"
              weight="bold"
              color={currentStep !== "customer" ? "secondary" : "primary"}
            >
              Customer created
            </Text>
          </View>
        </View>

        {/* Connector */}
        <View className="h-8 w-0.5 bg-gray-200 ml-3 mb-2" />

        {/* Step 2: Verifying BVN */}
        <View className="flex-row items-center mb-6">
          {getStepIcon("verifying")}
          <View className="ml-4 flex-1">
            <Text
              variant="body"
              weight="bold"
              color={
                currentStep === "creating"
                  ? "secondary"
                  : currentStep === "verifying"
                    ? "primary"
                    : "secondary"
              }
            >
              {virtualAccount?.creationStatus === "PENDING"
                ? "Verifying your BVN"
                : "Verifying your BVN"}
            </Text>
            {currentStep === "verifying" && (
              <Text variant="caption" color="secondary" className="mt-1">
                {bvnVerified
                  ? "BVN verified! Upgrading to Tier 2..."
                  : virtualAccount?.creationStatus === "PENDING"
                    ? "BVN verification in progress..."
                    : "This step may take up to 60 seconds"}
              </Text>
            )}
          </View>
        </View>

        {/* Connector */}
        <View className="h-8 w-0.5 bg-gray-200 ml-3 mb-2" />

        {/* Step 3: Creating Account */}
        <View className="flex-row items-center">
          {getStepIcon("creating")}
          <View className="ml-4 flex-1">
            <Text
              variant="body"
              weight="bold"
              color={currentStep === "creating" ? "primary" : "secondary"}
            >
              Creating virtual account
            </Text>
            {currentStep === "creating" && (
              <Text variant="caption" color="secondary" className="mt-1">
                {virtualAccount?.creationStatus === "PROCESSING"
                  ? "Retrying if needed... This may take a few minutes"
                  : virtualAccount?.retryCount && virtualAccount.retryCount > 0
                    ? `Retry attempt ${virtualAccount.retryCount}...`
                    : "This step may take 30-60 seconds"}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Info */}
      <View className="mt-8 bg-blue-50 dark:bg-gray-800 rounded-2xl p-4 flex-row">
        <Ionicons
          name="information-circle"
          size={20}
          color="#3B82F6"
          style={{ marginRight: 12 }}
        />
        <View className="flex-1">
          <Text variant="caption" color="secondary">
            {bvnVerified
              ? "Your BVN has been verified and your account has been upgraded to Tier 2!"
              : virtualAccount?.creationStatus === "PROCESSING"
                ? "We're retrying the account creation. If it takes longer, our team will create it manually and notify you."
                : virtualAccount?.creationStatus === "PENDING"
                  ? "We're verifying your information with your bank. You'll be notified once your account is ready."
                  : "We're verifying your information with your bank. You'll be notified once your account is ready."}
          </Text>
        </View>
      </View>
    </View>
  );
}
