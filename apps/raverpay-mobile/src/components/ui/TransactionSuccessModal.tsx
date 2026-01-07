// src/components/ui/TransactionSuccessModal.tsx
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import React, { useEffect } from 'react';
import { Alert, Modal, ScrollView, TouchableOpacity, View } from 'react-native';
import { formatCurrency } from '../../lib/utils/formatters';
import { Button } from './Button';
import { Text } from './Text';

export interface TransactionDetail {
  label: string;
  value: string;
  highlight?: boolean;
}

interface TransactionSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  serviceType: string;
  details: TransactionDetail[];
  amount: number;
  reference?: string;
  cashbackEarned?: number;
  cashbackRedeemed?: number;
  meterToken?: string;
  voucherCode?: string;
}

export const TransactionSuccessModal: React.FC<TransactionSuccessModalProps> = ({
  visible,
  onClose,
  serviceType,
  details,
  amount,
  reference,
  cashbackEarned = 0,
  cashbackRedeemed = 0,
  meterToken,
  voucherCode,
}) => {
  console.log('[TransactionSuccessModal] Rendered with visible:', visible);

  useEffect(() => {
    console.log('[TransactionSuccessModal] useEffect - visible changed to:', visible);
    return () => {
      console.log(
        '[TransactionSuccessModal] useEffect cleanup - component unmounting or visible changed',
      );
    };
  }, [visible]);

  const handleDone = () => {
    console.log('[TransactionSuccessModal] Done button pressed');
    console.log('[TransactionSuccessModal] Calling onClose...');
    onClose();
    console.log('[TransactionSuccessModal] onClose called');
  };

  const handleCopyToken = async () => {
    if (meterToken) {
      await Clipboard.setStringAsync(meterToken);
      Alert.alert('Token Copied', 'Meter token copied to clipboard!');
    }
  };

  const handleCopyVoucher = async () => {
    if (voucherCode) {
      await Clipboard.setStringAsync(voucherCode);
      Alert.alert('Voucher Copied', 'Voucher code copied to clipboard!');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDone}
      statusBarTranslucent
    >
      <BlurView
        intensity={20}
        className="flex-1 justify-center items-center px-5"
        style={{ pointerEvents: visible ? 'auto' : 'none' }}
      >
        {/* Backdrop */}
        <TouchableOpacity activeOpacity={1} onPress={handleDone} className="absolute inset-0" />

        {/* Modal Content */}
        <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-lg max-h-[90%]">
          {/* Success Icon */}
          <View className="items-center mb-6">
            <View className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center mb-4">
              <Ionicons name="checkmark-circle" size={28} color="#22C55E" />
            </View>
            <Text variant="h4" align="center" className="mb-2">
              Transaction Successful!
            </Text>
            <Text variant="body" color="secondary" align="center">
              Your {serviceType.toLowerCase()} was completed successfully
            </Text>
          </View>

          {/* Transaction Amount */}
          <View className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700 text-center justify-center items-center">
            <Text variant="caption" className="text-gray-400 dark:text-gray-500 mb-1">
              Amount
            </Text>
            <Text variant="h1" className="text-[#5B55F6] dark:text-[#5B55F6]">
              {formatCurrency(amount)}
            </Text>
          </View>

          {/* Transaction Details */}
          <ScrollView
            className="mb-6"
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 300 }}
          >
            {/* Service Type */}
            <View className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 mb-4">
              <Text variant="caption" color="secondary" className="mb-1">
                Service Type
              </Text>
              <Text variant="bodyMedium" weight="semibold">
                {serviceType}
              </Text>
            </View>

            {/* Transaction Details */}
            <View className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-4">
              {details.map((detail, index) => (
                <View
                  key={index}
                  className={`flex-row items-center justify-between ${
                    index !== details.length - 1
                      ? 'mb-3 pb-3 border-b border-gray-200 dark:border-gray-700'
                      : ''
                  }`}
                >
                  <Text variant="body" color="secondary">
                    {detail.label}
                  </Text>
                  <Text
                    variant={detail.highlight ? 'bodyMedium' : 'body'}
                    weight={detail.highlight ? 'semibold' : 'regular'}
                    className={detail.highlight ? 'text-[#5B55F6] dark:text-[#8B5CF6]' : ''}
                    style={{ maxWidth: '60%', textAlign: 'right' }}
                  >
                    {detail.value}
                  </Text>
                </View>
              ))}
            </View>

            {/* Meter Token (Electricity) */}
            {meterToken && (
              <View className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text variant="caption" className="text-yellow-800 dark:text-yellow-200">
                    Meter Token
                  </Text>
                  <TouchableOpacity
                    onPress={handleCopyToken}
                    className="flex-row items-center bg-yellow-100 dark:bg-yellow-900/40 px-3 py-1 rounded-full"
                  >
                    <Ionicons name="copy-outline" size={16} color="#92400E" />
                    <Text variant="caption" weight="semibold" className="text-yellow-900 ml-1">
                      Copy
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text
                  variant="h4"
                  weight="bold"
                  className="text-yellow-900 dark:text-yellow-100 tracking-wider"
                >
                  {meterToken}
                </Text>
              </View>
            )}

            {/* Voucher Code (Showmax, etc.) */}
            {voucherCode && (
              <View className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text variant="caption" className="text-purple-800">
                    Voucher Code
                  </Text>
                  <TouchableOpacity
                    onPress={handleCopyVoucher}
                    className="flex-row items-center bg-purple-100 px-3 py-1 rounded-full"
                  >
                    <Ionicons name="copy-outline" size={16} color="#6B21A8" />
                    <Text variant="caption" weight="semibold" className="text-purple-900 ml-1">
                      Copy
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text variant="h4" weight="bold" className="text-purple-900 tracking-wider">
                  {voucherCode}
                </Text>
              </View>
            )}

            {/* Reference Number */}
            {reference && (
              <View className="bg-gray-50 rounded-xl p-4 mb-4">
                <Text variant="caption" color="secondary" className="mb-1">
                  Transaction Reference
                </Text>
                <Text variant="body" weight="medium" className="text-gray-700">
                  {reference}
                </Text>
              </View>
            )}

            {/* Cashback Info */}
            {(cashbackEarned > 0 || cashbackRedeemed > 0) && (
              <View className="bg-green-50 border border-green-200 rounded-xl p-4">
                {cashbackRedeemed > 0 && (
                  <View className="mb-3 pb-3 border-b border-green-200">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <Ionicons name="gift-outline" size={20} color="#22C55E" />
                        <Text variant="body" className="text-green-700 ml-2 flex-1">
                          Cashback Redeemed
                        </Text>
                      </View>
                      <Text variant="bodyMedium" weight="semibold" className="text-green-600">
                        {formatCurrency(cashbackRedeemed)}
                      </Text>
                    </View>
                  </View>
                )}
                {cashbackEarned > 0 && (
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <Ionicons name="sparkles-outline" size={20} color="#22C55E" />
                      <Text variant="body" className="text-green-700 ml-2 flex-1">
                        Cashback Earned
                      </Text>
                    </View>
                    <Text variant="bodyMedium" weight="semibold" className="text-green-600">
                      +{formatCurrency(cashbackEarned)}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View className="gap-3">
            <Button variant="primary" size="lg" fullWidth onPress={handleDone}>
              Done
            </Button>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
};
