// app/bills.tsx
import { Card, ScreenHeader, Text } from "@/src/components/ui";
import { useTheme } from "@/src/hooks/useTheme";
import { useWalletStore } from "@/src/store/wallet.store";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Alert, Image, ScrollView, TouchableOpacity, View } from "react-native";

// Bill services configuration
const BILL_SERVICES = [
  {
    id: "cable",
    title: "Cable TV",
    description: "DStv, GOtv, Startimes & more",
    icon: require("../assets/icons/cable2.png"),
    route: "/pay-cable",
  },
  {
    id: "international",
    title: "International Airtime",
    description: "Top up worldwide",
    icon: require("../assets/icons/international2.png"),
    route: "/buy-international-airtime",
  },
  {
    id: "education",
    title: "Education",
    description: "WAEC, JAMB & exam pins",
    icon: require("../assets/icons/education2.png"),
    route: "/education-services",
  },
];

export default function BillsScreen() {
  const { isDark } = useTheme();
  const { isLocked, lockedReason, balance } = useWalletStore();

  // Helper function to show locked alert
  const showLockedAlert = () => {
    Alert.alert(
      "Wallet Locked",
      lockedReason ||
        "Your wallet is locked. Please upgrade your KYC tier to continue.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Upgrade Now", onPress: () => router.push("/tier-details") },
      ]
    );
  };

  const handleBillAction = (route: string) => {
    if (isLocked) {
      showLockedAlert();
      return;
    }
    router.push(route as any);
  };

  return (
    <>
      {/* <Stack.Screen
        options={{
          title: "Pay Bills",
          headerShown: true,
          headerStyle: {
            backgroundColor: isDark ? "#111827" : "#ffffff",
          },
          headerTintColor: isDark ? "#ffffff" : "#000000",
          headerShadowVisible: false,
        }}
      /> */}
      {/* Header */}
      <ScreenHeader title="Pay Bills" subtitle={balance} />

      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <StatusBar style={isDark ? "light" : "dark"} />

        <ScrollView
          className="flex-1 px-5 pt-6"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          {/* <View className="mb-6">
            <Text variant="h3" weight="bold" className="mb-2">
              Pay Your Bills
            </Text>
            <Text variant="body" color="secondary">
              Choose a service to make payments
            </Text>
          </View> */}

          {/* Locked Wallet Warning */}
          {isLocked && (
            <View className="mb-6">
              <Card
                variant="elevated"
                className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800"
              >
                <View className="p-4">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-red-500 items-center justify-center mr-3">
                      <Ionicons name="lock-closed" size={20} color="white" />
                    </View>
                    <View className="flex-1">
                      <Text
                        variant="bodyMedium"
                        weight="bold"
                        className="text-red-900 dark:text-red-100"
                      >
                        Wallet Locked
                      </Text>
                      <Text
                        variant="caption"
                        className="text-red-700 dark:text-red-300 mt-1"
                      >
                        Upgrade your KYC to make payments
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>
            </View>
          )}

          {/* Bill Services Grid */}
          <View className="gap-4 mb-8">
            {BILL_SERVICES.map((service) => (
              <TouchableOpacity
                key={service.id}
                onPress={() => handleBillAction(service.route)}
                disabled={isLocked}
                className={isLocked ? "opacity-50" : ""}
              >
                <Card variant="elevated" className="p-3">
                  <View className="flex-row items-center">
                    <View className="w-14 h-14 items-center justify-center mr-4">
                      <Image
                        source={service.icon}
                        className="w-10 h-10"
                        resizeMode="contain"
                      />
                    </View>
                    <View className="flex-1">
                      <Text variant="bodyMedium" weight="bold" className="mb-1">
                        {service.title}
                      </Text>
                      <Text variant="caption" color="secondary">
                        {service.description}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={isDark ? "#9CA3AF" : "#6B7280"}
                    />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </>
  );
}
