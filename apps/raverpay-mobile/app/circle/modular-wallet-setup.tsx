import { ScreenHeader, Text } from "@/src/components/ui";
import { useAuth } from "@/src/hooks/useAuth";
import { useTheme } from "@/src/hooks/useTheme";
import { useAuthStore } from "@/src/store/auth.store";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import WebView, { WebViewMessageEvent } from "react-native-webview";

const ADMIN_URL = process.env.EXPO_PUBLIC_ADMIN_URL || "http://localhost:3000";

export default function ModularWalletSetup() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { accessToken } = useAuthStore();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<
    "register" | "wallet" | "complete"
  >("register");

  // Handle potential nested user object from API response
  // The API seems to be returning { user: { ... } } structure
  const userData = (user as any)?.user || user;

  // Construct WebView URL
  const webViewUrl = `${ADMIN_URL}/circle-modular?action=register&token=${accessToken}&userId=${userData?.id}&username=${userData?.firstName}_${userData?.lastName}`;

  // Handle messages from WebView
  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const { type, data } = JSON.parse(event.nativeEvent.data);

      console.log("WebView message:", type, data);

      switch (type) {
        case "passkey_registered":
          setCurrentStep("wallet");
          Alert.alert(
            "Passkey Registered",
            "Your biometric authentication has been set up successfully!",
            [{ text: "OK" }]
          );
          break;

        case "wallet_created":
          setCurrentStep("complete");
          Alert.alert(
            "Wallet Created!",
            `Your gasless wallet has been created successfully.\n\nAddress: ${data.address.substring(0, 10)}...`,
            [
              {
                text: "View Wallet",
                onPress: () => {
                  // Navigate back to wallet list
                  router.replace("/(tabs)/circle-wallet");
                },
              },
            ]
          );
          break;

        case "passkey_login_success":
          Alert.alert(
            "Login Successful",
            "You have been authenticated successfully!"
          );
          break;

        case "transaction_success":
          Alert.alert(
            "Transaction Sent",
            `Transaction hash: ${data.transactionHash.substring(0, 10)}...`,
            [{ text: "OK" }]
          );
          break;

        case "error":
          // Log full error object for debugging
          console.error("WebView Error Data:", JSON.stringify(data, null, 2));
          Alert.alert("Error", data.message || "An error occurred", [
            { text: "OK" },
          ]);
          break;

        default:
          console.log("Unknown message type:", type);
      }
    } catch (error) {
      console.error("Error parsing WebView message:", error);
    }
  };

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <ScreenHeader
          title="Create Gasless Wallet"
          subtitleText="Set up your smart wallet with biometric security"
        />

        {/* Progress Indicator */}
        <View className="px-6 py-4 bg-white dark:bg-gray-800">
          <View className="flex-row items-center justify-between">
            {/* Step 1 */}
            <View className="flex-1 items-center">
              <View
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  currentStep === "register" ? "bg-purple-500" : "bg-green-500"
                }`}
              >
                {currentStep === "register" ? (
                  <Text variant="body" weight="bold" color="inverse">
                    1
                  </Text>
                ) : (
                  <Ionicons name="checkmark" size={20} color="white" />
                )}
              </View>
              <Text variant="caption" className="mt-1">
                Passkey
              </Text>
            </View>

            {/* Connector */}
            <View className=" h-0.5 bg-gray-300 dark:bg-gray-600 mx-2" />

            {/* Step 2 */}
            <View className="flex-1 items-center">
              <View
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  currentStep === "wallet"
                    ? "bg-purple-500"
                    : currentStep === "complete"
                      ? "bg-green-500"
                      : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                {currentStep === "complete" ? (
                  <Ionicons name="checkmark" size={20} color="white" />
                ) : (
                  <Text
                    variant="body"
                    weight="bold"
                    color={currentStep === "wallet" ? "inverse" : "secondary"}
                  >
                    2
                  </Text>
                )}
              </View>
              <Text variant="caption" className="mt-1">
                Create Wallet
              </Text>
            </View>

            {/* Connector */}
            <View className=" h-0.5 bg-gray-300 dark:bg-gray-600 mx-2" />

            {/* Step 3 */}
            <View className="flex-1 items-center">
              <View
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  currentStep === "complete"
                    ? "bg-green-500"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                {currentStep === "complete" ? (
                  <Ionicons name="checkmark" size={20} color="white" />
                ) : (
                  <Text variant="body" weight="bold" color="secondary">
                    3
                  </Text>
                )}
              </View>
              <Text variant="caption" className="mt-1">
                Complete
              </Text>
            </View>
          </View>
        </View>

        {/* WebView */}
        <View className="flex-1 relative">
          {loading && (
            <View className="absolute inset-0 items-center justify-center bg-white dark:bg-gray-900 z-10">
              <ActivityIndicator size="large" color="#9333EA" />
              <Text variant="body" color="secondary" className="mt-4">
                Loading...
              </Text>
            </View>
          )}

          <WebView
            ref={webViewRef}
            source={{ uri: webViewUrl }}
            onMessage={handleMessage}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error("WebView error:", nativeEvent);
              Alert.alert("Error", "Failed to load page. Please try again.");
            }}
            style={{ flex: 1 }}
            // Enable JavaScript
            javaScriptEnabled={true}
            // Enable DOM storage for WebAuthn
            domStorageEnabled={true}
            // Allow third-party cookies for Circle API
            thirdPartyCookiesEnabled={true}
            // Allow mixed content (if needed)
            mixedContentMode="always"
          />
        </View>

        {/* Info Footer */}
        <View className="px-6 py-4 bg-purple-50 dark:bg-purple-900/20 border-t border-purple-200 dark:border-purple-800">
          <View className="flex-row items-start">
            <Ionicons
              name="information-circle"
              size={20}
              color="#9333EA"
              className="mt-0.5"
            />
            <View className="flex-1 ml-3">
              <Text
                variant="caption"
                className="text-purple-700 dark:text-purple-300"
              >
                You&apos;ll be prompted to use Face ID or Touch ID to create
                your passkey. This is more secure than a PIN and makes
                transactions faster.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );
}
