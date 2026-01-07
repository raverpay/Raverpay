// app/(auth)/welcome.tsx
// Multi-stage onboarding flow with Splash and Onboarding Carousel

import { Text } from "@/src/components/ui";
import { useTheme } from "@/src/hooks/useTheme";
import { useAuthStore } from "@/src/store/auth.store";
import { useOnboardingStore } from "@/src/store/onboarding.store";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  ImageSourcePropType,
  Pressable,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";

// ============================================================================
// Types & Constants
// ============================================================================

/** Current stage of the onboarding flow */
type OnboardingStage = "splash" | "onboarding";

/** Onboarding slide data structure */
interface OnboardingSlide {
  id: number;
  image: ImageSourcePropType;
  title: string;
  subtitle: string;
}

/** Screen dimensions for carousel */
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/** Duration of splash screen in milliseconds */
const SPLASH_DURATION = 3000;

/** Primary brand color for active states */
const PRIMARY_COLOR = "#5B55F6";

/** Onboarding slides content */
const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 1,
    image: require("../../assets/onboarding/screen11.png"),
    title: "Your Money, Simplified",
    subtitle: "All your daily transactions in one place.",
  },
  {
    id: 2,
    image: require("../../assets/onboarding/screen12.png"),
    title: "Get Paid Globally",
    subtitle: "Receive international payments easily.",
  },
  {
    id: 3,
    image: require("../../assets/onboarding/screen13.png"),
    title: "Stablecoins Transfers",
    subtitle: "Send money across the world instantly.",
  },
];

// ============================================================================
// SplashComponent - Initial logo animation screen
// ============================================================================

interface SplashComponentProps {
  onComplete: () => void;
  isDark: boolean;
}

const SplashComponent: React.FC<SplashComponentProps> = ({
  onComplete,
  isDark,
}) => {
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);

  useEffect(() => {
    // Animate logo entrance
    logoScale.value = withSpring(1, { damping: 12 });
    logoOpacity.value = withTiming(1, { duration: 500 });

    // Auto-transition after SPLASH_DURATION
    const timer = setTimeout(() => {
      onComplete();
    }, SPLASH_DURATION);

    return () => clearTimeout(timer);
  }, [logoScale, logoOpacity, onComplete]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900 justify-center items-center">
      <StatusBar style={isDark ? "light" : "dark"} />

      <Animated.View style={logoStyle}>
        <Image
          source={require("../../assets/images/splash-icon.png")}
          className="w-52 h-52"
          resizeMode="contain"
        />
      </Animated.View>
      <View>
        <Text variant="h2" className="text-gray-900 dark:text-gray-100">
          Raverpay
        </Text>
      </View>
    </View>
  );
};

// ============================================================================
// OnboardingCarousel - Swipeable introduction screens (first-time users only)
// ============================================================================

interface OnboardingCarouselProps {
  onComplete: () => void;
  isDark: boolean;
}

const OnboardingCarousel: React.FC<OnboardingCarouselProps> = ({
  onComplete,
  isDark,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<ICarouselInstance>(null);
  const { setHasSeenWelcome } = useOnboardingStore();

  const isLastSlide = activeIndex === ONBOARDING_SLIDES.length - 1;
  const isFirstSlide = activeIndex === 0;

  // Handle Skip button - mark as seen and navigate to login
  const handleSkip = useCallback(() => {
    setHasSeenWelcome(true);
    onComplete();
  }, [onComplete, setHasSeenWelcome]);

  // Handle Back button - go to previous slide
  const handleBack = useCallback(() => {
    if (!isFirstSlide && carouselRef.current) {
      carouselRef.current.prev();
    }
  }, [isFirstSlide]);

  // Handle Next button - go to next slide
  const handleNext = useCallback(() => {
    if (!isLastSlide && carouselRef.current) {
      carouselRef.current.next();
    }
  }, [isLastSlide]);

  // Handle Get Started button on last slide - mark as seen and navigate to login
  const handleGetStarted = useCallback(() => {
    setHasSeenWelcome(true);
    onComplete();
  }, [onComplete, setHasSeenWelcome]);

  // Render individual slide
  const renderSlide = useCallback(
    ({ item }: { item: OnboardingSlide }) => (
      <View
        style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
        className="relative"
      >
        {/* Background Image */}
        <Image
          source={item.image}
          style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
          resizeMode="contain"
          className="absolute inset-0"
        />

        {/* Dark Gradient Overlay at Bottom */}
        <LinearGradient
          colors={[
            "transparent",
            "rgba(17, 24, 39, 0.6)",
            "rgba(17, 24, 39, 0.95)",
          ]}
          locations={[0.3, 0.6, 1]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: SCREEN_HEIGHT * 0.5,
          }}
        />

        {/* Content at Bottom */}
        <View className="absolute bottom-16 left-0 right-0 px-6 pb-32">
          <Text variant="h3" className="text-white text-center mb-3">
            {item.title}
          </Text>
          <Text variant="body" className="text-gray-300 text-center text-base">
            {item.subtitle}
          </Text>
        </View>
      </View>
    ),
    []
  );

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      className="flex-1 bg-gray-900"
    >
      <StatusBar style="light" />

      {/* Carousel */}
      <Carousel
        ref={carouselRef}
        data={ONBOARDING_SLIDES}
        renderItem={renderSlide}
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        onSnapToItem={setActiveIndex}
        loop={false}
      />

      {/* Top Navigation - Skip & Back buttons */}
      <View className="absolute top-14 left-0 right-0 px-5 flex-row justify-between items-center z-10">
        {/* Back Button (visible on screens 2-3) */}
        {!isFirstSlide ? (
          <TouchableOpacity
            onPress={handleBack}
            className="w-10 h-10 rounded-full bg-black/30 justify-center items-center"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
        ) : (
          <View className="w-10" />
        )}

        {/* Skip Button */}
        <TouchableOpacity
          onPress={handleSkip}
          activeOpacity={0.7}
          className="py-2 px-4"
        >
          <Text variant="body" className="text-white font-semibold">
            Skip
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation - Progress Dots & Action Button */}
      <View className="absolute bottom-0 left-0 right-0 px-6 pb-12">
        {/* Progress Dots */}
        <View className="flex-row justify-center items-center mb-6 gap-2">
          {ONBOARDING_SLIDES.map((_, index) => (
            <View
              key={index}
              className="h-2 rounded-full"
              style={{
                width: index === activeIndex ? 24 : 8,
                backgroundColor:
                  index === activeIndex
                    ? PRIMARY_COLOR
                    : "rgba(255, 255, 255, 0.4)",
              }}
            />
          ))}
        </View>

        {/* Action Button */}
        <Pressable
          onPress={isLastSlide ? handleGetStarted : handleNext}
          className="py-4 rounded-xl items-center"
          style={{ backgroundColor: PRIMARY_COLOR }}
        >
          <Text variant="body" className="text-white font-semibold text-base">
            {isLastSlide ? "Continue" : "Next"}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

// ============================================================================
// Main WelcomeScreen Component - Orchestrates the onboarding flow
// ============================================================================

export default function WelcomeScreen() {
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuthStore();
  const { hasSeenWelcome } = useOnboardingStore();

  // Current stage of the onboarding flow
  const [stage, setStage] = useState<OnboardingStage>("splash");

  // Redirect authenticated users to main app
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated]);

  // Handle splash completion - determine next stage based on user state
  const handleSplashComplete = useCallback(() => {
    if (hasSeenWelcome) {
      // Returning user: Splash → Login
      router.replace("/(auth)/login");
    } else {
      // First-time user: Splash → Onboarding
      setStage("onboarding");
    }
  }, [hasSeenWelcome]);

  // Handle onboarding completion - navigate to login screen
  const handleOnboardingComplete = useCallback(() => {
    router.replace("/(auth)/login");
  }, []);

  // Render current stage
  switch (stage) {
    case "splash":
      return (
        <SplashComponent onComplete={handleSplashComplete} isDark={isDark} />
      );

    case "onboarding":
      return (
        <OnboardingCarousel
          onComplete={handleOnboardingComplete}
          isDark={isDark}
        />
      );

    default:
      return (
        <SplashComponent onComplete={handleSplashComplete} isDark={isDark} />
      );
  }
}
