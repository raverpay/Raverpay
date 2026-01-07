// app/pay-showmax.tsx

import {
  Button,
  Card,
  ConfirmationModal,
  Input,
  PINModal,
  Skeleton,
  Text,
  TransactionDetail,
} from '@/src/components/ui';
import { useTheme } from '@/src/hooks/useTheme';
import { usePayShowmax, useShowmaxPlans } from '@/src/hooks/useVTU';
import { formatCurrency } from '@/src/lib/utils/formatters';
import { checkPinSetOrPrompt } from '@/src/lib/utils/pin-helper';
import { handleSuccessfulTransaction } from '@/src/lib/utils/rating-helper';
import { useUserStore } from '@/src/store/user.store';
import { useWalletStore } from '@/src/store/wallet.store';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PayShowmaxScreen() {
  const { isDark } = useTheme();
  const { balance } = useWalletStore();
  const { hasPinSet } = useUserStore();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showPINModal, setShowPINModal] = useState(false);

  const { data: plansData, isLoading: loadingPlans } = useShowmaxPlans();
  const { mutate: payShowmax, isPending: isPaying } = usePayShowmax();

  const packages = Array.isArray(plansData)
    ? plansData.filter((pkg: any) => pkg && (pkg.code || pkg.variation_code))
    : [];

  const handlePayment = () => {
    if (!selectedPackage) return;

    const packageAmount =
      parseFloat(selectedPackage.variation_amount || selectedPackage.amount || 0) || 0;

    if (packageAmount > balance) {
      Alert.alert('Insufficient Balance', 'Please fund your wallet to continue');
      return;
    }

    // Check if user has set a PIN
    if (!checkPinSetOrPrompt(hasPinSet)) {
      return;
    }

    setShowConfirmationModal(true);
  };

  const handleConfirmPayment = () => {
    setShowConfirmationModal(false);
    setShowPINModal(true);
  };

  const handlePINSubmit = (pin: string) => {
    const productCode = selectedPackage?.code || selectedPackage?.variation_code;

    if (!productCode) {
      Alert.alert('Invalid Package', 'Please select a valid package and try again.');
      return;
    }

    payShowmax(
      {
        phoneNumber,
        productCode,
        pin,
      },
      {
        onSuccess: async (data) => {
          setShowPINModal(false);
          queryClient.invalidateQueries({ queryKey: ['wallet'] });
          queryClient.invalidateQueries({ queryKey: ['transactions'] });

          // Check if user is eligible for rating prompt
          await handleSuccessfulTransaction();

          // Navigate to success screen with transaction data
          const successDetails: TransactionDetail[] = [
            {
              label: 'Phone Number',
              value: phoneNumber,
            },
            {
              label: 'Package',
              value: selectedPackage?.name || '',
              highlight: true,
            },
          ];

          if (selectedPackage?.validity || selectedPackage?.description) {
            successDetails.push({
              label: 'Validity',
              value: selectedPackage?.validity || selectedPackage?.description || '',
            });
          }

          router.push({
            pathname: '/transaction-success',
            params: {
              serviceType: 'Showmax Subscription',
              amount: packageAmount.toString(),
              reference: data.reference || '',
              cashbackEarned: '0',
              cashbackRedeemed: '0',
              details: JSON.stringify(successDetails),
              voucherCode: data.order?.voucher || '',
            },
          });
        },
        onError: () => {
          setShowPINModal(false);
        },
      },
    );
  };

  const isFormValid = phoneNumber.length === 11 && selectedPackage;

  // Prepare transaction details for confirmation modal
  const transactionDetails: TransactionDetail[] = [
    {
      label: 'Phone Number',
      value: phoneNumber,
    },
    {
      label: 'Package',
      value: selectedPackage?.name || '',
      highlight: true,
    },
  ];

  if (selectedPackage?.validity || selectedPackage?.description) {
    transactionDetails.push({
      label: 'Validity',
      value: selectedPackage?.validity || selectedPackage?.description || '',
    });
  }

  const packageAmount = selectedPackage
    ? parseFloat(selectedPackage.variation_amount || selectedPackage.amount || 0) || 0
    : 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50 dark:bg-gray-900"
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 pb-6 px-5 border-b border-gray-200 dark:border-gray-700"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text variant="h3">Pay Showmax</Text>
            <Text variant="caption" color="secondary" className="mt-1">
              Balance: {formatCurrency(balance)}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Phone Number */}
        <View className="mb-6">
          <Input
            label="Phone Number"
            placeholder="08012345678"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            maxLength={11}
            leftIcon="call-outline"
          />
        </View>

        {/* Packages */}
        <View className="mb-6">
          <Text variant="h3" className="mb-4">
            Select Package
          </Text>
          {loadingPlans ? (
            <View className="gap-3">
              {[1, 2, 3, 4].map((i) => (
                <PackageSkeleton key={i} />
              ))}
            </View>
          ) : packages.length > 0 ? (
            <View className="gap-3">
              {packages.map((pkg: any, index: number) => {
                const packageCode = pkg.variation_code || pkg.code;
                const selectedCode = selectedPackage
                  ? selectedPackage.variation_code || selectedPackage.code
                  : null;
                const packageAmount = parseFloat(pkg.variation_amount || pkg.amount || 0) || 0;

                return (
                  <TouchableOpacity
                    key={`${packageCode || 'pkg'}-${index}`}
                    onPress={() => setSelectedPackage(pkg)}
                  >
                    <Card
                      variant={selectedCode === packageCode ? 'filled' : 'elevated'}
                      className={`p-4 ${
                        selectedCode === packageCode
                          ? 'bg-purple-100 border-2 border-[#5B55F6]'
                          : ''
                      }`}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text variant="bodyMedium">{pkg.name}</Text>
                          <Text variant="caption" color="secondary" className="mt-1">
                            {pkg.validity || pkg.description || 'Showmax Subscription'}
                          </Text>
                        </View>
                        <Text variant="bodyMedium" className="text-[#5B55F6]">
                          {formatCurrency(packageAmount)}
                        </Text>
                      </View>
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Card variant="elevated" className="p-4">
              <Text variant="body" color="secondary" align="center">
                No packages available
              </Text>
            </Card>
          )}
        </View>

        {/* Info Card */}
        <Card variant="elevated" className="p-4 mb-6 bg-purple-50 dark:bg-purple-900/20">
          <View className="flex-row items-start">
            <Ionicons name="information-circle-outline" size={20} color="#5B55F6" />
            <View className="ml-3 flex-1">
              <Text variant="caption" color="secondary">
                • Voucher code will be sent instantly{'\n'}• Enter the phone number to receive the
                voucher{'\n'}• Redeem voucher on Showmax website or app
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* Floating Payment Button */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-5 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 24) }}
      >
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={handlePayment}
          disabled={!isFormValid}
        >
          Pay Now
        </Button>
      </View>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        onConfirm={handleConfirmPayment}
        serviceType="Showmax Subscription"
        details={transactionDetails}
        amount={packageAmount}
        currentBalance={balance}
      />

      {/* PIN Modal */}
      <PINModal
        visible={showPINModal}
        onClose={() => setShowPINModal(false)}
        onSubmit={handlePINSubmit}
        loading={isPaying}
        title="Enter PIN"
        subtitle="Confirm Showmax payment"
      />
    </KeyboardAvoidingView>
  );
}

// Package Skeleton
const PackageSkeleton: React.FC = () => (
  <Card variant="elevated" className="p-4">
    <View className="flex-row items-center justify-between">
      <View className="flex-1">
        <Skeleton width="70%" height={16} className="mb-2" />
        <Skeleton width="50%" height={14} />
      </View>
      <Skeleton width={80} height={16} />
    </View>
  </Card>
);
