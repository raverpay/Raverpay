// app/circle/user-controlled-setup.tsx
import { Button, Card, ScreenHeader, Text } from "@/src/components/ui";
import { useCircleSDK } from "@/src/contexts/CircleSDKContext";
import { useAuth } from "@/src/hooks/useAuth";
import { useTheme } from "@/src/hooks/useTheme";
import { userControlledWalletService } from "@/src/services/user-controlled-wallet.service";
import { CircleBlockchain } from "@/src/types/circle.types";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SetupStep =
  | "checking"
  | "network-select"
  | "intro"
  | "creating"
  | "pin"
  | "success";

export default function UserControlledSetup() {
  const { user } = useAuth();
  const currentUserEmail = (user as any)?.user?.email || "";

  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isInitialized: sdkInitialized, executeChallenge } = useCircleSDK();
  const [step, setStep] = useState<SetupStep>("checking");
  const [loading, setLoading] = useState(false);
  const [selectedBlockchain, setSelectedBlockchain] = useState<
    CircleBlockchain | ""
  >("");
  const [existingCircleUser, setExistingCircleUser] = useState<any>(null);
  const [existingWalletBlockchains, setExistingWalletBlockchains] = useState<
    string[]
  >([]);

  // Check if user already has a Circle user and wallets
  useEffect(() => {
    const checkExistingUser = async () => {
      try {
        console.log(
          "[UserControlledSetup] Checking for existing Circle user..."
        );
        const status = await userControlledWalletService.checkUserStatus();

        if (status.hasCircleUser) {
          // User has Circle account - store it for reuse
          console.log(
            "[UserControlledSetup] Existing Circle user found:",
            status.circleUser?.circleUserId
          );
          setExistingCircleUser(status.circleUser);

          // Store existing wallet blockchains to filter them out
          const existingBlockchains = status.wallets.map(
            (w: any) => w.blockchain
          );
          setExistingWalletBlockchains(existingBlockchains);
          console.log(
            "[UserControlledSetup] Existing wallets on:",
            existingBlockchains
          );
        }

        // Show network selection (will filter out existing networks)
        setStep("network-select");
      } catch (error) {
        console.error("[UserControlledSetup] Check error:", error);
        // If check fails, just show network selection
        setStep("network-select");
      }
    };

    checkExistingUser();
  }, []);

  const handleStartSetup = async () => {
    if (!selectedBlockchain) {
      Alert.alert("Error", "Please select a network first");
      return;
    }

    setLoading(true);
    setStep("creating");

    try {
      let currentCircleUserId: string;
      let userToken: string;
      let encryptionKey: string;

      if (existingCircleUser) {
        // Existing user - reuse Circle user, just get a new token
        console.log(
          "[UserControlledSetup] Reusing existing Circle user:",
          existingCircleUser.circleUserId
        );
        currentCircleUserId = existingCircleUser.circleUserId;

        // Get fresh user token
        const tokenResponse =
          await userControlledWalletService.getUserToken(currentCircleUserId);
        userToken = tokenResponse.userToken;
        encryptionKey = tokenResponse.encryptionKey;
      } else {
        // New user - create Circle user with PIN authentication
        console.log(
          "[UserControlledSetup] Creating new Circle user with PIN auth"
        );
        const userResponse = await userControlledWalletService.createCircleUser(
          {
            email: currentUserEmail,
            authMethod: "PIN",
          }
        );

        currentCircleUserId = userResponse.circleUserId;
        console.log(
          "[UserControlledSetup] Circle user created:",
          currentCircleUserId
        );

        // Get user token
        console.log("[UserControlledSetup] Getting user token");
        const tokenResponse =
          await userControlledWalletService.getUserToken(currentCircleUserId);
        userToken = tokenResponse.userToken;
        encryptionKey = tokenResponse.encryptionKey;
      }

      // Store tokens securely
      const expiryTime = Date.now() + 60 * 60 * 1000;
      await SecureStore.setItemAsync("circle_user_token", userToken);
      await SecureStore.setItemAsync(
        "circle_user_token_expiry",
        expiryTime.toString()
      );
      await SecureStore.setItemAsync("circle_encryption_key", encryptionKey);
      await SecureStore.setItemAsync("circle_user_id", currentCircleUserId);

      // Initialize wallet - this triggers the Circle SDK challenge
      console.log(
        "[UserControlledSetup] Initializing wallet on",
        selectedBlockchain,
        "existingUser:",
        !!existingCircleUser
      );
      const initResponse =
        await userControlledWalletService.initializeUserWithWallet({
          userToken,
          blockchain: selectedBlockchain,
          accountType: "SCA",
          circleUserId: currentCircleUserId,
          isExistingUser: !!existingCircleUser, // Use createWallet instead of createUserPinWithWallets
        });

      console.log(
        "[UserControlledSetup] Got challenge ID:",
        initResponse.challengeId
      );

      // Step 4: Check SDK is ready
      if (!sdkInitialized) {
        Alert.alert(
          "SDK Not Ready",
          "Circle SDK is still initializing. Please wait a moment and try again."
        );
        setLoading(false);
        setStep("intro");
        return;
      }

      // Step 5: Execute challenge - Circle WebView handles PIN + Security Questions
      setStep("pin");
      console.log("[UserControlledSetup] Executing challenge via WebView");

      try {
        const result = await executeChallenge(userToken, encryptionKey, [
          initResponse.challengeId,
        ]);

        console.log("[UserControlledSetup] Challenge result:", result);

        if (result.result.resultType === "success") {
          console.log("[UserControlledSetup] Challenge completed successfully");

          // Step 6: Sync wallets to database
          console.log("[UserControlledSetup] Syncing wallets to database");
          try {
            const syncResult =
              await userControlledWalletService.syncWalletsToDatabase(
                currentCircleUserId,
                userToken
              );
            console.log(
              "[UserControlledSetup] Synced",
              syncResult.synced,
              "wallets"
            );
          } catch (syncError) {
            console.error(
              "[UserControlledSetup] Sync error (non-fatal):",
              syncError
            );
            // Don't fail the whole flow if sync fails - wallet is still created
          }

          setStep("success");
        } else {
          throw new Error(
            result.result.error?.message || "Challenge execution failed"
          );
        }
      } catch (sdkError: any) {
        console.error("[UserControlledSetup] Circle SDK error:", sdkError);
        Alert.alert(
          "Wallet Creation Failed",
          sdkError.message ||
            "Failed to complete wallet setup. Please try again."
        );
        setStep("intro");
      }
    } catch (error: any) {
      console.error("[UserControlledSetup] Setup error:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to create wallet. Please try again."
      );
      setStep("intro");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    router.replace("/(tabs)/circle-wallet");
  };

  const renderNetworkSelectStep = () => {
    const allNetworks = [
      {
        id: "ETH-SEPOLIA" as CircleBlockchain,
        name: "Ethereum Sepolia",
        icon: "Ξ",
        color: "bg-blue-500",
      },
      {
        id: "MATIC-AMOY" as CircleBlockchain,
        name: "Polygon Amoy",
        icon: "⬣",
        color: "bg-purple-500",
      },
      {
        id: "ARB-SEPOLIA" as CircleBlockchain,
        name: "Arbitrum Sepolia",
        icon: "A",
        color: "bg-sky-500",
      },
      {
        id: "AVAX-FUJI" as CircleBlockchain,
        name: "Avalanche Fuji",
        icon: "🔺",
        color: "bg-red-500",
      },
      {
        id: "BASE-SEPOLIA" as CircleBlockchain,
        name: "Base Sepolia",
        icon: "B",
        color: "bg-blue-600",
      },
      {
        id: "OP-SEPOLIA" as CircleBlockchain,
        name: "Optimism Sepolia",
        icon: "O",
        color: "bg-red-600",
      },
      {
        id: "SOL-DEVNET" as CircleBlockchain,
        name: "Solana Devnet",
        icon: "◎",
        color: "bg-gradient-to-r from-purple-500 to-green-500",
      },
    ];

    // Filter out networks where user already has a wallet
    const availableNetworks = allNetworks.filter(
      (n) => !existingWalletBlockchains.includes(n.id)
    );

    const hasExistingWallets = existingWalletBlockchains.length > 0;

    // If all networks are taken, show message
    if (availableNetworks.length === 0) {
      return (
        <View className="px-6 py-8 items-center">
          <View className="w-24 h-24 rounded-full bg-green-50 dark:bg-green-900/20 items-center justify-center mb-6">
            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
          </View>
          <Text variant="h3" weight="bold" align="center" className="mb-2">
            All Networks Set Up!
          </Text>
          <Text
            variant="body"
            color="secondary"
            align="center"
            className="mb-8"
          >
            You have wallets on all available networks.
          </Text>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.replace("/(tabs)/circle-wallet")}
            className="bg-[#2775CA]"
          >
            Go to Wallets
          </Button>
        </View>
      );
    }

    return (
      <View className="px-6 py-8">
        <View className="items-center mb-8">
          <View className="w-24 h-24 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center">
            <Ionicons name="globe" size={48} color="#3B82F6" />
          </View>
        </View>

        <Text variant="h3" weight="bold" align="center" className="mb-2">
          {hasExistingWallets ? "Add Another Network" : "Select Network"}
        </Text>
        <Text variant="body" color="secondary" align="center" className="mb-8">
          {hasExistingWallets
            ? "Create a wallet on another blockchain network"
            : "Choose which blockchain network you want to use for your wallet"}
        </Text>

        <View className="gap-3">
          {availableNetworks.map((network) => (
            <Card
              key={network.id}
              variant="elevated"
              pressable
              onPress={() => {
                setSelectedBlockchain(network.id);
                setStep("intro");
              }}
              className={`p-4 ${selectedBlockchain === network.id ? "border-2 border-[#2775CA]" : ""}`}
            >
              <View className="flex-row items-center">
                <View
                  className={`w-12 h-12 ${network.color} rounded-full items-center justify-center mr-4`}
                >
                  <Text variant="h4" color="inverse">
                    {network.icon}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text variant="h6" weight="bold">
                    {network.name}
                  </Text>
                  <Text variant="caption" color="secondary">
                    Testnet
                  </Text>
                </View>
                {selectedBlockchain === network.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#2775CA" />
                )}
              </View>
            </Card>
          ))}
        </View>
      </View>
    );
  };

  const renderIntroStep = () => (
    <View className="px-6 py-8">
      <View className="items-center mb-8">
        <View className="w-24 h-24 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center">
          <Ionicons name="key" size={48} color="#3B82F6" />
        </View>
      </View>

      <Text variant="h3" weight="bold" align="center" className="mb-2">
        Set Up Your Secure Wallet
      </Text>
      <Text variant="body" color="secondary" align="center" className="mb-8">
        You&apos;ll create a 6-digit PIN and security questions to protect your
        wallet.
      </Text>

      {/* Security Info Card */}
      <Card variant="filled" className="p-4 mb-8">
        <Text variant="h6" weight="bold" className="mb-3">
          What you&apos;ll set up:
        </Text>
        <View className="gap-3">
          {[
            {
              icon: "lock-closed",
              title: "6-Digit PIN",
              description: "Required for all transactions",
            },
            {
              icon: "help-circle",
              title: "Security Questions",
              description: "Used to recover your wallet if you forget your PIN",
            },
            {
              icon: "finger-print",
              title: "Biometrics (Optional)",
              description: "Use Face ID or Touch ID for faster access",
            },
          ].map((item, index) => (
            <View key={index} className="flex-row items-start">
              <View className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 items-center justify-center mr-3">
                <Ionicons name={item.icon as any} size={16} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text variant="bodyMedium" weight="semibold">
                  {item.title}
                </Text>
                <Text variant="caption" color="secondary">
                  {item.description}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* Important Notice */}
      <Card
        variant="outlined"
        className="p-4 mb-8 border-amber-400 dark:border-amber-600"
      >
        <View className="flex-row items-start">
          <Ionicons name="warning" size={20} color="#F59E0B" />
          <View className="flex-1 ml-3">
            <Text
              variant="bodyMedium"
              weight="semibold"
              className="text-amber-700 dark:text-amber-400 mb-1"
            >
              Important
            </Text>
            <Text
              variant="caption"
              className="text-amber-600 dark:text-amber-300"
            >
              Remember your PIN and security question answers. Circle does not
              store them, and they cannot be reset by anyone - including us.
            </Text>
          </View>
        </View>
      </Card>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        onPress={handleStartSetup}
        loading={loading}
        disabled={loading}
      >
        Continue
      </Button>
    </View>
  );

  const renderCreatingStep = () => (
    <View className="px-6 py-8 h-full justify-center">
      <View className="items-center mb-8">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>

      <Text variant="h4" weight="bold" align="center" className="mb-2">
        Setting Up Your Wallet
      </Text>
      <Text variant="body" color="secondary" align="center">
        Please wait while we prepare your secure wallet...
      </Text>
    </View>
  );

  const renderPinStep = () => (
    <View className="px-6 py-8 h-full justify-center">
      <View className="items-center mb-8">
        <View className="w-24 h-24 rounded-full bg-blue-500 items-center justify-center">
          <Ionicons name="shield" size={48} color="white" />
        </View>
      </View>

      <Text variant="h4" weight="bold" align="center" className="mb-2">
        Complete Wallet Setup
      </Text>
      <Text variant="body" color="secondary" align="center" className="mb-8">
        A secure window will open to set up your PIN and security questions.
      </Text>

      <View className="items-center">
        <ActivityIndicator size="small" color="#3B82F6" />
        <Text variant="caption" color="secondary" className="mt-2">
          Waiting for Circle SDK...
        </Text>
      </View>
    </View>
  );

  const renderSuccessStep = () => (
    <View className="px-6 py-8 h-full justify-center">
      <View className="items-center mb-8">
        <View className="w-24 h-24 rounded-full bg-green-500 items-center justify-center">
          <Ionicons name="checkmark" size={64} color="white" />
        </View>
      </View>

      <Text variant="h3" weight="bold" align="center" className="mb-2">
        Wallet Created!
      </Text>
      <Text variant="body" color="secondary" align="center" className="mb-10">
        Your advanced wallet is ready to use. You can now enjoy gas-free
        transactions with Paymaster.
      </Text>

      <Card variant="elevated" className="p-6 mb-12">
        <View className="gap-4">
          {[
            "Full control of your funds",
            "Gas-free USDC transactions",
            "Enhanced security features",
          ].map((feature, index) => (
            <View key={index} className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text variant="bodyMedium" className="ml-4">
                {feature}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        onPress={handleComplete}
        className="bg-[#2775CA]"
      >
        Go to Wallet
      </Button>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? "light" : "dark"} />
      <ScreenHeader
        title="Advanced Wallet"
        disabled={
          loading ||
          step === "checking" ||
          step === "creating" ||
          step === "pin"
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1">
          {step === "checking" && (
            <View className="px-6 py-8 h-full justify-center items-center">
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text variant="body" color="secondary" className="mt-4">
                Checking wallet status...
              </Text>
            </View>
          )}
          {step === "network-select" && renderNetworkSelectStep()}
          {step === "intro" && renderIntroStep()}
          {step === "creating" && renderCreatingStep()}
          {step === "pin" && renderPinStep()}
          {step === "success" && renderSuccessStep()}
        </View>
      </ScrollView>
    </View>
  );
}
