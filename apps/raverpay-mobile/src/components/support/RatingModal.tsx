import { Text } from '@/src/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment?: string) => void;
  isLoading?: boolean;
}

const EMOJI_RATINGS = [
  { value: 1, emoji: '1f61e', label: 'Very Poor' },
  { value: 2, emoji: '1f641', label: 'Poor' },
  { value: 3, emoji: '1f610', label: 'Okay' },
  { value: 4, emoji: '1f642', label: 'Good' },
  { value: 5, emoji: '1f604', label: 'Excellent' },
];

export function RatingModal({ visible, onClose, onSubmit, isLoading }: RatingModalProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (selectedRating) {
      onSubmit(selectedRating, comment || undefined);
    }
  };

  const handleClose = () => {
    setSelectedRating(null);
    setComment('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <BlurView intensity={20} className="flex-1 justify-center items-center px-5">
          <TouchableOpacity activeOpacity={1} onPress={handleClose} className="absolute inset-0" />

          <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-sm">
            {/* Close button */}
            <TouchableOpacity
              onPress={handleClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center z-10"
            >
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>

            {/* Header */}
            <View className="items-center mb-6">
              <View className="w-16 h-16 rounded-full bg-[#5B55F6]/10 items-center justify-center mb-3">
                <Ionicons name="star" size={32} color="#5B55F6" />
              </View>
              <Text variant="h3" weight="bold" color="primary" className="text-center">
                Rate Your Experience
              </Text>
              <Text variant="body" color="secondary" className="text-center mt-1">
                How was your support experience?
              </Text>
            </View>

            {/* Emoji ratings */}
            <View className="flex-row justify-between mb-6">
              {EMOJI_RATINGS.map((rating) => (
                <TouchableOpacity
                  key={rating.value}
                  onPress={() => setSelectedRating(rating.value)}
                  className={`items-center p-2 rounded-xl ${
                    selectedRating === rating.value ? 'bg-[#5B55F6]/10' : 'bg-transparent'
                  }`}
                >
                  <Text variant="h3" weight="bold" color="primary">
                    {String.fromCodePoint(parseInt(rating.emoji, 16))}
                  </Text>
                  <Text
                    className={` mt-1 ${
                      selectedRating === rating.value
                        ? 'text-[#5B55F6] font-medium'
                        : 'text-gray-400'
                    }`}
                    variant="caption"
                  >
                    {rating.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Comment input */}
            <View className="mb-6">
              <Text variant="body" color="secondary" className="mb-2">
                Additional comments (optional)
              </Text>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Tell us more about your experience..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 min-h-[80px]"
                textAlignVertical="top"
              />
            </View>

            {/* Submit button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!selectedRating || isLoading}
              className={`py-4 rounded-xl items-center ${
                selectedRating && !isLoading ? 'bg-[#5B55F6]' : 'bg-gray-300'
              }`}
            >
              <Text
                variant="button"
                weight="semibold"
                color={selectedRating && !isLoading ? 'inverse' : 'secondary'}
                className={` ${selectedRating && !isLoading ? 'text-white' : 'text-gray-500'}`}
              >
                {isLoading ? 'Submitting...' : 'Submit Rating'}
              </Text>
            </TouchableOpacity>

            {/* Skip button */}
            <TouchableOpacity onPress={handleClose} className="py-3 items-center mt-2">
              <Text variant="body" color="secondary">
                Skip for now
              </Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
