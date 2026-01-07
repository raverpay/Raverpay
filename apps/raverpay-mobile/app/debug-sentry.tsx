// app/debug-sentry.tsx
import { Button, Card, ScreenHeader, Text } from "@/src/components/ui";
import { useTheme } from "@/src/hooks/useTheme";
import * as Sentry from "@sentry/react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Alert, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function DebugSentryScreen() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Test 1: Simple error
  const testSimpleError = () => {
    try {
      throw new Error("Test Error: This is a manual test error");
    } catch (error) {
      Sentry.captureException(error);
      Alert.alert(
        "Error Captured",
        "Check your Sentry dashboard for the error"
      );
    }
  };

  // Test 2: Error with context
  const testErrorWithContext = () => {
    try {
      Sentry.setContext("test_action", {
        action: "button_click",
        screen: "debug-sentry",
        timestamp: new Date().toISOString(),
      });
      throw new Error("Test Error with Context");
    } catch (error) {
      Sentry.captureException(error);
      Alert.alert(
        "Error with Context Captured",
        "Check Sentry for additional context data"
      );
    }
  };

  // Test 3: Custom message
  const testCustomMessage = () => {
    Sentry.captureMessage("Test Message: User clicked test button", "info");
    Alert.alert("Message Sent", "Check Sentry for the custom message");
  };

  // Test 4: Error with user context
  const testWithUserContext = () => {
    try {
      Sentry.setUser({
        id: "test-user-123",
        email: "test@example.com",
        username: "testuser",
      });
      throw new Error("Test Error with User Context");
    } catch (error) {
      Sentry.captureException(error);
      Alert.alert(
        "Error with User Captured",
        "Check Sentry for user information"
      );
    }
  };

  // Test 5: Breadcrumbs
  const testBreadcrumbs = () => {
    try {
      Sentry.addBreadcrumb({
        category: "navigation",
        message: "User navigated to debug screen",
        level: "info",
      });

      Sentry.addBreadcrumb({
        category: "action",
        message: "User clicked test button",
        level: "info",
        data: {
          button: "breadcrumbs-test",
        },
      });

      throw new Error("Test Error with Breadcrumbs");
    } catch (error) {
      Sentry.captureException(error);
      Alert.alert(
        "Error with Breadcrumbs Captured",
        "Check Sentry for breadcrumb trail"
      );
    }
  };

  // Test 6: Crash the app (use carefully!)
  const testCrash = () => {
    Alert.alert("Warning", "This will crash the app. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Crash",
        style: "destructive",
        onPress: () => {
          // This will cause an unhandled error that crashes the app
          throw new Error("Intentional Crash for Testing");
        },
      },
    ]);
  };

  // Test 7: Check Sentry status
  const checkSentryStatus = () => {
    const isEnabled = !__DEV__; // Based on your config
    Alert.alert(
      "Sentry Status",
      `Environment: ${__DEV__ ? "Development" : "Production"}\n` +
        `Sentry Enabled: ${isEnabled ? "Yes" : "No"}\n` +
        `Debug Mode: ${__DEV__ ? "Yes" : "No"}\n\n` +
        `Note: Sentry is disabled in development by default. ` +
        `Set SENTRY_ENABLED=true or build for production to test.`
    );
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-950">
      <StatusBar style={isDark ? "light" : "dark"} />
      <ScreenHeader
        title="Sentry Debug"
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 16,
          paddingTop: 16,
        }}
      >
        <Card className="mb-4 p-4">
          <Text className="text-base font-semibold mb-2">
            Sentry Error Tracking Test
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Use these buttons to test Sentry error tracking and monitoring.
          </Text>
          <Text className="text-xs text-orange-600 dark:text-orange-400">
            ⚠️ Sentry is disabled in development by default. To test:
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            • Set NODE_ENV=production in metro.config.js, OR
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-500">
            • Build for production (EAS build), OR
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-500">
            • Set enabled: true in sentryConfig.ts
          </Text>
        </Card>

        <View className="gap-3">
          <Button variant="outline" onPress={checkSentryStatus}>
            Check Sentry Status
          </Button>

          <Button variant="outline" onPress={testSimpleError}>
            Test 1: Simple Error
          </Button>

          <Button variant="outline" onPress={testErrorWithContext}>
            Test 2: Error with Context
          </Button>

          <Button variant="outline" onPress={testCustomMessage}>
            Test 3: Custom Message
          </Button>

          <Button variant="outline" onPress={testWithUserContext}>
            Test 4: Error with User Context
          </Button>

          <Button variant="outline" onPress={testBreadcrumbs}>
            Test 5: Error with Breadcrumbs
          </Button>

          <Button variant="destructive" onPress={testCrash}>
            Test 6: Crash App (Dangerous!)
          </Button>
        </View>

        <Card className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20">
          <Text className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            📊 How to Check Results:
          </Text>
          <Text className="text-xs text-blue-800 dark:text-blue-200 mb-1">
            1. Go to your Sentry dashboard
          </Text>
          <Text className="text-xs text-blue-800 dark:text-blue-200 mb-1">
            2. Select your project: {"{your-project-name}"}
          </Text>
          <Text className="text-xs text-blue-800 dark:text-blue-200 mb-1">
            3. Check Issues → All Issues
          </Text>
          <Text className="text-xs text-blue-800 dark:text-blue-200">
            4. Look for test errors you triggered
          </Text>
        </Card>

        <Card className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20">
          <Text className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">
            🔒 Privacy Features:
          </Text>
          <Text className="text-xs text-purple-800 dark:text-purple-200 mb-1">
            • All sensitive fields are automatically scrubbed
          </Text>
          <Text className="text-xs text-purple-800 dark:text-purple-200 mb-1">
            • Passwords, PINs, tokens are filtered
          </Text>
          <Text className="text-xs text-purple-800 dark:text-purple-200 mb-1">
            • Financial data is masked
          </Text>
          <Text className="text-xs text-purple-800 dark:text-purple-200">
            • Session replay masks all text and images
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}
