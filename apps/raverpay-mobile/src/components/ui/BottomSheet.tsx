// components/ui/BottomSheet.tsx
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Dimensions, Modal, ScrollView, TouchableWithoutFeedback, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_SHEET_HEIGHT = SCREEN_HEIGHT * 0.9;
const MIN_SHEET_HEIGHT = SCREEN_HEIGHT * 0.8;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  showHandle?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  children,
  showHandle = true,
}) => {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 200, stiffness: 300 });
      backdropOpacity.value = withTiming(1, { duration: 200 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, translateY, backdropOpacity]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-end">
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[backdropStyle]} className="absolute inset-0 bg-black/50">
            <BlurView intensity={20} tint="dark" className="absolute inset-0" />
          </Animated.View>
        </TouchableWithoutFeedback>

        <Animated.View
          style={[sheetStyle, { maxHeight: MAX_SHEET_HEIGHT, minHeight: MIN_SHEET_HEIGHT }]}
          className="bg-white dark:bg-gray-800 rounded-t-3xl pb-8 w-full"
        >
          {showHandle && (
            <View className="items-center py-3">
              <View className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </View>
          )}

          <ScrollView
            style={{ flexGrow: 1 }}
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};
