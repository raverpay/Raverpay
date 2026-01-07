import { ScreenHeader } from "@/src/components/ui";
import { useTheme } from "@/src/hooks/useTheme";
import { addBreadcrumb, captureException } from "@/src/utils/sentryConfig";
import * as Sentry from "@sentry/react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function DevToolsScreen() {
  const { isDark } = useTheme();
  const [errorCount, setErrorCount] = useState(0);

  // Only show in development
  if (!__DEV__) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-background">
        <Text className="text-gray-500 dark:text-gray-400">
          Dev tools only available in development mode
        </Text>
      </View>
    );
  }

  const testUnhandledError = () => {
    Alert.alert("⚠️ Warning", "This will crash the app! Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Crash App",
        style: "destructive",
        onPress: () => {
          setTimeout(() => {
            throw new Error(
              "Test unhandled error from dev tools - App will crash!"
            );
          }, 100);
        },
      },
    ]);
  };

  const testHandledError = () => {
    try {
      throw new Error("Test handled error from dev tools");
    } catch (error) {
      captureException(error as Error, {
        tags: { test: "true", type: "handled" },
        extra: { errorCount: errorCount + 1 },
      });
      setErrorCount((prev) => prev + 1);
      Alert.alert("✅ Success", "Handled error captured and sent to Sentry");
    }
  };

  const testBreadcrumbs = () => {
    addBreadcrumb("Test breadcrumb 1", "test", "info", { step: 1 });
    addBreadcrumb("Test breadcrumb 2", "test", "warning", { step: 2 });
    addBreadcrumb("Test breadcrumb 3", "test", "error", { step: 3 });

    setTimeout(() => {
      captureException(new Error("Test error with breadcrumbs"), {
        tags: { test: "breadcrumbs" },
      });
      Alert.alert(
        "🍞 Breadcrumbs",
        "3 breadcrumbs added, error sent to Sentry"
      );
    }, 1000);
  };

  const testNetworkError = async () => {
    try {
      await fetch("https://invalid-url-that-does-not-exist-12345.com");
    } catch (error) {
      captureException(error as Error, {
        tags: { test: "true", type: "network" },
      });
      Alert.alert(
        "🌐 Network Error",
        "Network error captured and sent to Sentry"
      );
    }
  };

  const testValidationError = () => {
    const error = new Error("Validation failed: UnexpectedNativeTypeException");
    captureException(error, {
      tags: { test: "true", type: "validation" },
      extra: {
        fields: ["email", "phone"],
        errorType: "UnexpectedNativeTypeException",
        context: "Similar to the fixed auth crash",
      },
    });
    Alert.alert("⚠️ Validation Error", "Simulated the fixed auth crash error");
  };

  const testMessage = () => {
    Sentry.captureMessage("Test message from dev tools", "info");
    Alert.alert("📨 Message Sent", "Test message sent to Sentry");
  };

  const testPaymentError = () => {
    const error = new Error("Payment transaction failed: Insufficient funds");
    captureException(error, {
      tags: {
        test: "true",
        type: "payment",
        payment_method: "wallet",
      },
      extra: {
        transactionId: "TEST-TXN-12345",
        attemptedAmount: 5000,
      },
    });
    setErrorCount((prev) => prev + 1);
    Alert.alert(
      "💳 Payment Error",
      "Payment error captured and sent to Sentry"
    );
  };

  const testCircleError = () => {
    const error = new Error("Circle wallet operation failed");
    captureException(error, {
      tags: {
        test: "true",
        circle_operation: "transfer",
        "circle.success": "false",
      },
      extra: {
        blockchain: "ETH",
        errorCode: "INSUFFICIENT_BALANCE",
      },
    });
    setErrorCount((prev) => prev + 1);
    Alert.alert("⭕ Circle Error", "Circle wallet error captured");
  };

  const testVtuError = () => {
    const error = new Error(
      "VTU provider error: Service temporarily unavailable"
    );
    captureException(error, {
      tags: {
        test: "true",
        vtu_operation: "purchase_airtime",
        "vtu.success": "false",
        provider: "MTN",
      },
      extra: {
        network: "MTN",
        phoneNumber: "[FILTERED]",
      },
    });
    setErrorCount((prev) => prev + 1);
    Alert.alert("📱 VTU Error", "VTU provider error captured");
  };

  const triggerMultipleErrors = () => {
    Alert.alert(
      "🔥 Trigger Alert",
      "This will send 5 errors rapidly to test alert rules",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send 5 Errors",
          style: "destructive",
          onPress: () => {
            for (let i = 1; i <= 5; i++) {
              setTimeout(() => {
                const error = new Error(`Test payment failure ${i}/5`);
                captureException(error, {
                  tags: { test: "alert-trigger", type: "payment" },
                  extra: { sequence: i },
                });
              }, i * 500);
            }
            setErrorCount((prev) => prev + 5);
            Alert.alert("🔥 Sent", "5 errors sent to test alert rules");
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-white dark:bg-background">
      <StatusBar style={isDark ? "light" : "dark"} />
      <ScreenHeader title="Sentry Dev Tools" canGoBack />

      <ScrollView className="flex-1 p-6">
        <View className="mb-6">
          <Text className="text-2xl font-bold mb-2 dark:text-white">
            🛠️ Sentry Test Tools
          </Text>
          <Text className="text-gray-600 dark:text-gray-400">
            Test Sentry integration in development mode
          </Text>
          <Text className="text-primary font-semibold mt-2">
            Errors sent: {errorCount}
          </Text>
        </View>

        <View className="gap-4">
          <TouchableOpacity
            onPress={testHandledError}
            className="bg-blue-500 p-4 rounded-xl active:opacity-80"
          >
            <Text className="text-white font-semibold text-center text-base">
              ✅ Test Handled Error
            </Text>
            <Text className="text-white/80 text-center text-xs mt-1">
              Caught and reported safely
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={testUnhandledError}
            className="bg-red-500 p-4 rounded-xl active:opacity-80"
          >
            <Text className="text-white font-semibold text-center text-base">
              💥 Test Unhandled Error
            </Text>
            <Text className="text-white/80 text-center text-xs mt-1">
              Will crash app - use with caution!
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={testBreadcrumbs}
            className="bg-purple-500 p-4 rounded-xl active:opacity-80"
          >
            <Text className="text-white font-semibold text-center text-base">
              🍞 Test Breadcrumbs
            </Text>
            <Text className="text-white/80 text-center text-xs mt-1">
              Adds 3 breadcrumbs + error
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={testNetworkError}
            className="bg-orange-500 p-4 rounded-xl active:opacity-80"
          >
            <Text className="text-white font-semibold text-center text-base">
              🌐 Test Network Error
            </Text>
            <Text className="text-white/80 text-center text-xs mt-1">
              Simulates API failure
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={testValidationError}
            className="bg-yellow-500 p-4 rounded-xl active:opacity-80"
          >
            <Text className="text-white font-semibold text-center text-base">
              ⚠️ Test Validation Error
            </Text>
            <Text className="text-white/80 text-center text-xs mt-1">
              Similar to fixed auth crash
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={testPaymentError}
            className="bg-pink-500 p-4 rounded-xl active:opacity-80"
          >
            <Text className="text-white font-semibold text-center text-base">
              💳 Test Payment Error
            </Text>
            <Text className="text-white/80 text-center text-xs mt-1">
              Insufficient funds scenario
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={testCircleError}
            className="bg-indigo-500 p-4 rounded-xl active:opacity-80"
          >
            <Text className="text-white font-semibold text-center text-base">
              ⭕ Test Circle Error
            </Text>
            <Text className="text-white/80 text-center text-xs mt-1">
              Circle wallet operation failure
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={testVtuError}
            className="bg-cyan-500 p-4 rounded-xl active:opacity-80"
          >
            <Text className="text-white font-semibold text-center text-base">
              📱 Test VTU Error
            </Text>
            <Text className="text-white/80 text-center text-xs mt-1">
              VTU provider unavailable
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={testMessage}
            className="bg-green-500 p-4 rounded-xl active:opacity-80"
          >
            <Text className="text-white font-semibold text-center text-base">
              📨 Send Test Message
            </Text>
            <Text className="text-white/80 text-center text-xs mt-1">
              Log info message to Sentry
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={triggerMultipleErrors}
            className="bg-red-600 p-4 rounded-xl active:opacity-80 border-2 border-red-400"
          >
            <Text className="text-white font-semibold text-center text-base">
              🔥 Trigger Alert Rule Test
            </Text>
            <Text className="text-white/80 text-center text-xs mt-1">
              Send 5 errors to test alert rules
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
          <Text className="text-yellow-800 dark:text-yellow-200 text-sm font-semibold mb-2">
            ⚠️ Development Only
          </Text>
          <Text className="text-yellow-700 dark:text-yellow-300 text-xs">
            These test buttons are only visible in development mode. After
            testing, check your Sentry dashboard for captured errors.
          </Text>
        </View>

        <View className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <Text className="text-blue-800 dark:text-blue-200 text-sm font-semibold mb-2">
            💡 Quick Tips
          </Text>
          <Text className="text-blue-700 dark:text-blue-300 text-xs">
            • Sentry is now enabled in dev mode{"\n"}• Check breadcrumbs in
            Sentry dashboard under each error{"\n"}• Session replays capture
            screen content (privacy-safe){"\n"}• Use "Test Handled Error" to
            avoid app crashes{"\n"}• Alert rules test will send 5 errors in 2.5
            seconds
          </Text>
        </View>

        <View className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
          <Text className="text-green-800 dark:text-green-200 text-sm font-semibold mb-2">
            🎯 How to Test
          </Text>
          <Text className="text-green-700 dark:text-green-300 text-xs">
            1. Click any button above{"\n"}
            2. Wait 10-30 seconds{"\n"}
            3. Go to https://sentry.io{"\n"}
            4. Check Issues tab for your error{"\n"}
            5. Click error to see breadcrumbs and context
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl active:opacity-80"
        >
          <Text className="text-gray-700 dark:text-gray-300 font-semibold text-center">
            ← Back to App
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
