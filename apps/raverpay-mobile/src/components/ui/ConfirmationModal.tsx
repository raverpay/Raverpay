// src/components/ui/ConfirmationModal.tsx
import { Button, Text } from '@/src/components/ui';
import { formatCurrency } from '@/src/lib/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';

export interface TransactionDetail {
  label: string;
  value: string;
  highlight?: boolean;
}

interface ConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (useCashback: boolean, cashbackAmount: number) => void;
  loading?: boolean;
  title?: string;
  serviceType: string;
  details: TransactionDetail[];
  amount: number;
  fee?: number;
  currentBalance: number;
  // Cashback props
  cashbackAvailable?: number;
  cashbackToEarn?: number;
  // Currency formatting
  currencyType?: 'NGN' | 'USDC';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  onClose,
  onConfirm,
  loading = false,
  title = 'Confirm Transaction',
  serviceType,
  details,
  amount,
  fee = 0,
  currentBalance,
  cashbackAvailable = 0,
  cashbackToEarn = 0,
  currencyType = 'NGN',
}) => {
  const [useCashback, setUseCashback] = useState(false);

  // Calculate cashback to redeem (can't exceed available or amount)
  const maxCashbackToRedeem = Math.min(cashbackAvailable, amount);
  const cashbackToRedeem = useCashback ? maxCashbackToRedeem : 0;

  // Calculate final amount after cashback
  const finalAmount = amount + fee - cashbackToRedeem;
  const newBalance = currentBalance - finalAmount;

  // Format amount based on currency type
  const formatAmount = (value: number) => {
    if (currencyType === 'USDC') {
      return `$${value.toFixed(2)} USDC`;
    }
    return formatCurrency(value);
  };

  const handleConfirm = () => {
    onConfirm(useCashback, cashbackToRedeem);
  };

  // Reset toggle when modal closes
  React.useEffect(() => {
    if (!visible) {
      setUseCashback(false);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <BlurView intensity={20} className="flex-1 justify-center items-center px-5">
          {/* Backdrop */}
          <TouchableOpacity activeOpacity={1} onPress={onClose} className="absolute inset-0" />

          {/* Modal Content */}
          <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-lg max-h-[90%]">
            {/* Close Button */}
            <TouchableOpacity
              onPress={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center z-10"
              disabled={loading}
            >
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>

            {/* <View className="items-center">
              <View className="w-16 h-16 rounded-full bg-purple-100 items-center justify-center mb-4">
                <Ionicons name="checkmark-circle" size={32} color="#5b55f6" />
              </View>
            </View> */}

            {/* <Text variant="h3" align="center" className="mb-2">
              {title}
            </Text> */}

            {/* Final Amount to Pay */}
            <View className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700 text-center justify-center items-center">
              <Text variant="caption" className="text-gray-400 dark:text-gray-500 mb-1">
                {useCashback ? 'Final Amount to Pay' : 'Total Cost'}
              </Text>
              <Text variant="h3" className="text-gray-400 dark:text-gray-300">
                {formatAmount(finalAmount)}
              </Text>
            </View>
            {/* <Text
              variant="body"
              color="secondary"
              align="center"
              className="mb-6"
            >
              Please review your transaction details
            </Text> */}

            {/* Transaction Details */}
            <ScrollView
              className="mb-6"
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 400 }}
            >
              {/* Service Type */}
              <View className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 mb-4 flex-row items-center justify-between">
                <Text variant="caption" color="secondary" className="mb-1">
                  Service
                </Text>
                <Text variant="h5">{serviceType}</Text>
              </View>

              {/* Transaction Details */}
              <View className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-4">
                {details.map((detail, index) => (
                  <View
                    key={index}
                    className={`flex-row items-center justify-between ${index !== details.length - 1 ? 'mb-3 pb-3 border-b border-gray-200 dark:border-gray-700' : ''}`}
                  >
                    <Text variant="caption" color="secondary" className="mb-1">
                      {detail.label}
                    </Text>
                    <Text
                      variant="bodyMedium"
                      className={
                        detail.highlight ? 'text-[#5B55F6] dark:text-[#5B55F6] font-semibold' : ''
                      }
                    >
                      {detail.value}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Cashback Section - Only show if user has cashback */}
              {cashbackAvailable > 0 && (
                <View className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-4">
                  {/* Cashback Toggle */}
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-1 mr-3">
                      <Text variant="caption" className="text-green-600 dark:text-green-400">
                        Available Cashback: {formatCurrency(cashbackAvailable)}
                      </Text>
                    </View>
                    <Switch
                      value={useCashback}
                      onValueChange={setUseCashback}
                      trackColor={{ false: '#D1D5DB', true: '#D1D5DB' }}
                      thumbColor={useCashback ? '#5B55F6' : '#FFFFFF'}
                      disabled={loading}
                    />
                  </View>

                  {/* Show redemption amount when toggled */}
                  {useCashback && (
                    <View className="pt-3 border-t border-green-200 dark:border-green-800">
                      <View className="flex-row justify-between items-center mb-2">
                        <Text variant="caption" className="text-green-600 dark:text-green-400">
                          Cashback to use:
                        </Text>
                        <Text
                          variant="bodyMedium"
                          className="text-green-800 dark:text-green-200 font-semibold"
                        >
                          -{formatCurrency(cashbackToRedeem)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between items-center">
                        <Text variant="caption" className="text-green-600">
                          You&apos;ll earn:
                        </Text>
                        <Text variant="caption" className="text-green-600">
                          +{formatCurrency(cashbackToEarn)}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Show earn amount when not using cashback */}
                  {!useCashback && cashbackToEarn > 0 && (
                    <View className="pt-3 border-t border-green-200">
                      <View className="flex-row justify-between items-center">
                        <Text variant="caption" className="text-green-600">
                          You&apos;ll earn cashback:
                        </Text>
                        <Text variant="bodyMedium" className="text-green-800 font-semibold">
                          +{formatCurrency(cashbackToEarn)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Show cashback earn info even if no balance */}
              {cashbackAvailable === 0 && cashbackToEarn > 0 && (
                <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center mr-3">
                      <Ionicons name="gift-outline" size={20} color="#16A34A" />
                    </View>
                    <View className="flex-1">
                      <Text variant="bodyMedium" className="text-green-800 mb-1">
                        Earn Cashback
                      </Text>
                      <Text variant="caption" className="text-green-600">
                        You&apos;ll earn {formatCurrency(cashbackToEarn)} on this purchase
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Payment Summary */}
              <View className="bg-gray-900 rounded-xl p-4">
                {/* {useCashback && (
                  <View className="mb-3 pb-3 border-b border-gray-700">
                    <Text variant="caption" className="text-white mb-1">
                      Original Amount
                    </Text>
                    <Text
                      variant="bodyMedium"
                      className="text-white line-through"
                    >
                      {formatCurrency(amount)}
                    </Text>
                  </View>
                )} */}
                {/* Cashback Discount */}
                {/* {useCashback && (
                  <View className="mb-3 pb-3 border-b border-gray-700">
                    <Text variant="caption" className="text-green-400 mb-1">
                      Cashback Discount
                    </Text>
                    <Text variant="bodyMedium" className="text-green-400">
                      -{formatCurrency(cashbackToRedeem)}
                    </Text>
                  </View>
                )} */}

                <View className="mb-3 pb-3 border-b border-gray-700">
                  <Text variant="caption" className="text-white mb-1">
                    Current Balance
                  </Text>
                  <Text variant="h4" className="text-white">
                    {formatAmount(currentBalance)}
                  </Text>
                </View>
                <View>
                  <Text variant="caption" className="text-white mb-1">
                    New Balance
                  </Text>
                  <Text variant="h4" className={newBalance < 0 ? 'text-red-400' : 'text-white'}>
                    {formatAmount(newBalance)}
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View className="gap-3">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onPress={handleConfirm}
                loading={loading}
                disabled={loading}
              >
                Confirm & Enter PIN
              </Button>

              <Button variant="outline" size="lg" fullWidth onPress={onClose} disabled={loading}>
                Cancel
              </Button>
            </View>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
};
