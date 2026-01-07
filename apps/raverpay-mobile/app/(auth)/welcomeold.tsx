// app/(auth)/welcome.tsx
import { Button, Text } from '@/src/components/ui';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/store/auth.store';
import { useOnboardingStore } from '@/src/store/onboarding.store';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Image, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export default function WelcomeScreen() {
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuthStore();
  const { hasSeenWelcome, setHasSeenWelcome } = useOnboardingStore();

  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const buttonsOpacity = useSharedValue(0);


  useEffect(() => {
 
    // If already authenticated, go straight to app
    if (isAuthenticated) {
      
      router.replace('/(tabs)');
      return;
    }

    // If first time (hasn't seen welcome), show full welcome screen
    if (!hasSeenWelcome) {
      
      // Animate logo
      logoScale.value = withSpring(1, { damping: 12 });
      logoOpacity.value = withSpring(1);
      // Animate title
      titleOpacity.value = withDelay(300, withSpring(1));
      // Animate buttons
      buttonsOpacity.value = withDelay(600, withSpring(1));
    } else {
      
      // Returning user - show splash animation and auto-navigate
      logoScale.value = withSpring(1, { damping: 10 });
      logoOpacity.value = withTiming(1, { duration: 500 });

      // Auto-navigate to login after 2 seconds
     
      const timer = setTimeout(() => {
       
        router.replace('/(auth)/login');
      }, 2000);

      return () => {
       
        clearTimeout(timer);
      };
    }
  }, [isAuthenticated, hasSeenWelcome, logoScale, logoOpacity, titleOpacity, buttonsOpacity]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
  }));

  const handleGetStarted = () => {
    setHasSeenWelcome(true);
    router.push('/(auth)/register');
  };

  const handleAlreadyHaveAccount = () => {
    
    setHasSeenWelcome(true);
    
    router.push('/(auth)/login');
  };

  // Returning user - show only splash animation
  if (hasSeenWelcome && !isAuthenticated) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 justify-center items-center">
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Animated.View style={logoStyle}>
          <Image
            source={require('../../assets/images/splash-icon.png')}
            className="w-40 h-40"
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    );
  }

  // First-time user - show full welcome screen
  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900 p-5">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Logo Section */}
      <View className="flex-1 justify-center items-center mt-16">
        <Animated.View style={logoStyle} className="">
          <View className="  justify-center items-center ">
            {/* <Text variant="h1" color="inverse" align="center">
              RP
            </Text> */}

            <Image
              source={require('../../assets/images/splash-icon.png')}
              className="w-40 h-40"
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        <Animated.View style={titleStyle}>
          <Text variant="h1" align="center" className="mb-2">
            Raverpay
          </Text>
          <Text variant="body" color="secondary" align="center" className="mb-8">
            Your Digital Wallet for Everything
          </Text>
        </Animated.View>
      </View>

      {/* Features */}
      <Animated.View style={titleStyle} className="gap-4 mb-8 w-full justify-center items-center ">
        {/* <FeatureItem
          icon="💳"
          title="Fast Payments"
          description="Send and receive money instantly"
        /> */}
        <FeatureItem icon="📱" title="Buy Airtime & Data" description="Top up your phone anytime" />
        <FeatureItem icon="⚡" title="Pay Bills" description="Cable TV, Electricity, and more" />
      </Animated.View>

      {/* Buttons */}
      <Animated.View style={buttonsStyle} className="gap-3 pb-6">
        <Button variant="primary" size="lg" fullWidth onPress={handleGetStarted}>
          Get Started
        </Button>

        <Button variant="ghost" size="lg" fullWidth onPress={handleAlreadyHaveAccount}>
          I already have an account
        </Button>
      </Animated.View>
    </View>
  );
}

interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, description }) => (
  <View className=" items-center gap-3  justify-center w-full">
    <Text variant="h2" className="text-[32px]">
      {icon}
    </Text>
    <View className="justify-center items-center">
      <Text variant="h4">{title}</Text>
      <Text variant="body" color="secondary">
        {description}
      </Text>
    </View>
  </View>
);
