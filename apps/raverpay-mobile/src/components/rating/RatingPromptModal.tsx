// components/rating/RatingPromptModal.tsx
import { Button, Text } from '@/src/components/ui';
import { ratingService } from '@/src/services/rating.service';
import { useRatingStore } from '@/src/store/rating.store';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Modal, TouchableOpacity, View } from 'react-native';

interface RatingPromptModalProps {
  visible: boolean;
  onClose: () => void;
}

export function RatingPromptModal({ visible, onClose }: RatingPromptModalProps) {
  const config = useRatingStore((state) => state.config);

  if (!config) return null;

  const handleRate = async () => {
    await ratingService.handleRatingAction('rate');
    onClose();
  };

  const handleLater = async () => {
    await ratingService.handleRatingAction('later');
    onClose();
  };

  const handleNever = async () => {
    await ratingService.handleRatingAction('never');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <BlurView intensity={20} className="flex-1 justify-center items-center px-5">
        {/* Backdrop */}
        <TouchableOpacity activeOpacity={1} onPress={onClose} className="absolute inset-0" />

        {/* Modal Content */}
        <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-lg">
          {/* Close Button */}
          <TouchableOpacity
            onPress={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center z-10"
          >
            <Ionicons name="close" size={20} color="#6B7280" />
          </TouchableOpacity>

          {/* Icon */}
          <View className="items-center mb-6">
            <View className="w-24 h-24 rounded-full bg-purple-100 dark:bg-purple-900/30 items-center justify-center">
              <Ionicons name="star" size={48} color="#5B55F6" />
            </View>
          </View>

          {/* Title */}
          <Text variant="h3" className="text-center font-bold mb-3">
            {config.promptTitle}
          </Text>

          {/* Message */}
          <Text variant="body" className="text-center text-gray-600 mb-8 px-2">
            {config.promptMessage}
          </Text>

          {/* Actions */}
          <View className="gap-3 w-full">
            {/* Rate Now Button */}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleRate}
              icon={<Ionicons name="star" size={20} color="#FFFFFF" />}
            >
              Rate Now
            </Button>

            {/* Maybe Later Button */}
            <Button variant="secondary" size="lg" fullWidth onPress={handleLater}>
              Maybe Later
            </Button>

            {/* Don't Ask Again Button */}
            <TouchableOpacity
              onPress={handleNever}
              className="py-3 items-center"
              activeOpacity={0.7}
            >
              <Text variant="caption" className="text-gray-400">
                Don&apos;t ask again
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}
