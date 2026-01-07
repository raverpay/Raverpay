import { RatingPromptModal } from "@/src/components/rating";
import { CircleSDKProvider } from "@/src/contexts/CircleSDKContext";
import { ThemeProvider } from "@/src/contexts/ThemeContext";
import { usePushNotifications } from "@/src/hooks/usePushNotifications";
import { useRatingConfig } from "@/src/hooks/useRatingPrompt";
import { useShowRatingPrompt } from "@/src/hooks/useShowRatingPrompt";
import { queryClient } from "@/src/lib/api/query-client";
import { ratingService } from "@/src/services/rating.service";
import { useAuthStore } from "@/src/store/auth.store";
import { useRatingStore } from "@/src/store/rating.store";
import {
  Urbanist_400Regular,
  Urbanist_500Medium,
  Urbanist_600SemiBold,
  Urbanist_700Bold,
} from "@expo-google-fonts/urbanist";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
// import { LogLevel, OneSignal } from "react-native-onesignal";
import Toast from "react-native-toast-message";
import "../global.css";

// Import and initialize Sentry FIRST before any other code
import { initializeSentry } from "@/src/utils/sentryConfig";
import * as Sentry from "@sentry/react-native";

// Initialize Sentry immediately
initializeSentry();

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

// Inner component that uses QueryClient
function AppContent() {
  const { loadLocalData } = useRatingStore();

  // Rating prompt state - centralized for entire app
  const { shouldShowPrompt, closePrompt } = useShowRatingPrompt();

  // Session timeout (5 minutes of inactivity)
  // useSessionTimeout({
  //   timeoutMs: 5 * 60 * 1000, // 5 minutes
  //   enabled: true,
  // });

  // Push notifications - syncs with user auth
  usePushNotifications();

  // Fetch rating configuration from backend
  useRatingConfig();

  // Initialize rating on app start
  useEffect(() => {
    const initRating = async () => {
      // Load saved rating data
      await loadLocalData();
      // Track app open
      await ratingService.trackAppOpen();
    };

    initRating();
  }, [loadLocalData]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="notifications"
          options={{
            presentation: "transparentModal",
            animation: "slide_from_right",
          }}
        />
      </Stack>
      <Toast />

      {/* Global Rating Prompt Modal - Shows after successful transactions */}
      <RatingPromptModal visible={shouldShowPrompt} onClose={closePrompt} />
    </>
  );
}

export default Sentry.wrap(function RootLayout() {
  const { initialize, isLoading } = useAuthStore();

  // Load fonts
  const [fontsLoaded] = useFonts({
    Urbanist_400Regular,
    Urbanist_500Medium,
    Urbanist_600SemiBold,
    Urbanist_700Bold,
  });

  // useEffect(() => {
  //   // Initialize OneSignal
  //   // Enable verbose logging for debugging (remove in production)
  //   if (__DEV__) {
  //     OneSignal.Debug.setLogLevel(LogLevel.Verbose);
  //   }

  //   // Initialize with OneSignal App ID
  //   OneSignal.initialize("6984ec09-7964-4666-adca-16b05f234c72");

  //   // Request permission - we'll prompt via notification preferences later
  //   // For now, just request silently
  //   OneSignal.Notifications.requestPermission(false);
  // }, []);

  useEffect(() => {
    // Initialize auth store (load tokens from secure storage)
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]);

  if (!fontsLoaded || isLoading) {
    return null;
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <CircleSDKProvider>
          <AppContent />
        </CircleSDKProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
});
