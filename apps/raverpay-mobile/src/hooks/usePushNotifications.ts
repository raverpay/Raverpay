import { apiClient } from "@/src/lib/api/client";
import { useAuthStore } from "@/src/store/auth.store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

const STORAGE_KEYS = {
  PUSH_TOKEN: "expo_push_token",
};

// Configure how notifications are presented when app is in foreground
// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: true,
//   }),
// });

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Hook to handle Expo push notifications
 *
 * Features:
 * - Requests notification permissions
 * - Registers device for push notifications
 * - Sends push token to backend
 * - Handles foreground and background notifications
 * - Handles notification interactions (taps)
 *
 * Usage:
 * import { usePushNotifications } from '@/src/hooks/usePushNotifications';
 *
 * function App() {
 *   usePushNotifications();
 *   // ... rest of your app
 * }
 */
export function usePushNotifications() {
  const { isAuthenticated } = useAuthStore();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Only register for push notifications if user is authenticated
    if (!isAuthenticated) {
      // console.log(
      //   "[PushNotifications] User not authenticated, skipping registration"
      // );
      return;
    }

    // Register for push notifications
    registerForPushNotifications();

    // Listen for notifications received while app is in foreground
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        // console.log('[PushNotifications] Notification received in foreground:', notification);
        const data = notification.request.content.data;
        const eventType = data?.eventType;

        // Handle notifications even when app is in foreground
        try {
          if (eventType === "virtual_account_created") {
            // Navigate to success screen
            router.push({
              pathname: "/virtual-account/success",
              params: {
                accountNumber: data?.accountNumber || "",
                accountName: data?.accountName || "",
                bankName: data?.bankName || "",
              },
            });
          } else if (eventType === "virtual_account_creation_failed") {
            // Navigate to failed screen
            router.push({
              pathname: "/virtual-account/failed",
              params: {
                reason:
                  data?.message ||
                  "Virtual account creation failed. Our team will create it manually and notify you.",
              },
            });
          } else if (eventType === "p2p_transfer_received") {
            // Refresh wallet balance when P2P transfer is received
            // The notification will show automatically in foreground
          }
        } catch (error) {
          // Navigation might fail if router isn't ready - ignore silently
          console.warn("[PushNotifications] Navigation failed:", error);
        }
        // You can show a custom in-app notification UI here if needed
      });

    // Listen for notification interactions (user tapped notification)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        // console.log("[PushNotifications] Notification tapped:", response);

        // Handle notification tap
        const data = response.notification.request.content.data;
        const eventType = data?.eventType;

        // Navigate to relevant screen based on notification data
        try {
          if (eventType === "virtual_account_created") {
            // Navigate to virtual account success screen
            router.push({
              pathname: "/virtual-account/success",
              params: {
                accountNumber: data?.accountNumber || "",
                accountName: data?.accountName || "",
                bankName: data?.bankName || "",
              },
            });
          } else if (eventType === "virtual_account_creation_failed") {
            // Navigate to virtual account failed screen
            router.push({
              pathname: "/virtual-account/failed",
              params: {
                reason:
                  data?.message ||
                  "Virtual account creation failed. Our team will create it manually and notify you.",
              },
            });
          } else if (
            eventType === "p2p_transfer_sent" ||
            eventType === "p2p_transfer_received"
          ) {
            // Navigate to P2P history for P2P transfer notifications
            router.push("/p2p-history");
          } else if (data?.type === "TRANSACTION" || data?.transactionId) {
            // Navigate to transaction details
            router.push(
              `/transaction-details/${data.transactionId || data.orderId}`
            );
          } else if (data?.type === "SECURITY") {
            // Navigate to security settings
            router.push("/security-settings");
          } else if (data?.type === "KYC") {
            // Navigate to KYC verification
            router.push("/tier-details");
          }
        } catch (error) {
          // Navigation might fail if router isn't ready - ignore silently
          console.warn("[PushNotifications] Navigation failed:", error);
        }
        // Add more navigation logic as needed
      });

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [isAuthenticated]);

  /**
   * Register device for push notifications
   */
  async function registerForPushNotifications() {
    try {
      // Check if running on physical device (push notifications don't work on simulator)
      if (!Device.isDevice) {
        // console.log(
        //   "[PushNotifications] Not a physical device, push notifications disabled"
        // );
        return;
      }

      // Check/request permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        // console.log("[PushNotifications] Permission denied");
        return;
      }

      // console.log("[PushNotifications] Permission granted");

      // Get Expo push token
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ||
        "e73f2d6b-7cd6-4895-862a-0879c10822b0";

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      const token = tokenData.data;
      //  console.log("[PushNotifications] Got Expo push token:", token);

      // Send token to backend
      try {
        await apiClient.patch("/users/push-token", { pushToken: token });
        // console.log("[PushNotifications] Token sent to backend successfully");

        // Save token locally for reference
        await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);
      } catch {
        // console.error(
        //   "[PushNotifications] Failed to send token to backend:",
        //   error
        // );
        // Don't throw - allow app to continue even if backend update fails
      }

      // Setup Android notification channel (required for Android)
      if (Platform.OS === "android") {
        // Default channel
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#7C3AED", // Purple color
        });

        // Transaction channel
        await Notifications.setNotificationChannelAsync("transactions", {
          name: "Transactions",
          description: "Notifications for deposits, withdrawals, and payments",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#10B981", // Green color
        });

        // Security channel
        await Notifications.setNotificationChannelAsync("security", {
          name: "Security Alerts",
          description: "Important security notifications",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#EF4444", // Red color
          sound: "default",
        });

        // KYC channel
        await Notifications.setNotificationChannelAsync("kyc", {
          name: "KYC Verification",
          description: "KYC verification status updates",
          importance: Notifications.AndroidImportance.DEFAULT,
        });

        // Promotions channel
        await Notifications.setNotificationChannelAsync("promotions", {
          name: "Promotions",
          description: "Promotional offers and updates",
          importance: Notifications.AndroidImportance.LOW,
        });

        // console.log(
        //   "[PushNotifications] Android notification channels created"
        // );
      }
    } catch {
      // console.error("[PushNotifications] Registration failed:", error);
    }
  }

  // Hook doesn't return anything - it just sets up notifications
  return null;
}
