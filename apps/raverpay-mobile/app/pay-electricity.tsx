// app/pay-electricity.tsx

import {
  Button,
  Card,
  ConfirmationModal,
  Input,
  PINModal,
  ScreenHeader,
  Skeleton,
  Text,
  TransactionDetail,
} from '@/src/components/ui';
import { DEFAULT_PROVIDER_IMAGE, ELECTRICITY_PROVIDER_IMAGES } from '@/src/constants/vtu';
import { useCalculateCashback, useCashbackWallet } from '@/src/hooks/useCashback';
import { useTheme } from '@/src/hooks/useTheme';
import { useElectricityProviders, usePayElectricity, useVerifyMeter } from '@/src/hooks/useVTU';
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
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const METER_TYPES = [
  { id: 'prepaid', name: 'Prepaid' },
  { id: 'postpaid', name: 'Postpaid' },
];

export default function PayElectricityScreen() {
  const { isDark } = useTheme();
  const { balance } = useWalletStore();
  const { hasPinSet, user } = useUserStore();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [selectedDisco, setSelectedDisco] = useState<string | null>(null);
  const [meterType, setMeterType] = useState<string>('prepaid');
  const [meterNumber, setMeterNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showPINModal, setShowPINModal] = useState(false);
  const [pendingCashback, setPendingCashback] = useState<{
    use: boolean;
    amount: number;
  }>({ use: false, amount: 0 });
  const MIN_AMOUNT_DEFAULT = 1000;
  const MIN_AMOUNT_IBADAN = 5000;
  const minimumAmount =
    selectedDisco === 'ibadan-electric' ? MIN_AMOUNT_IBADAN : MIN_AMOUNT_DEFAULT;

  const { data: providersData, isPending: loadingProviders } = useElectricityProviders();
  const { mutate: verifyMeter, isPending: isVerifying } = useVerifyMeter();
  const { mutate: payElectricity, isPending: isPaying } = usePayElectricity();

  const providers = providersData || [];

  // Cashback hooks
  const { data: cashbackWallet } = useCashbackWallet();
  const { mutate: calculateCashback } = useCalculateCashback();
  const cashbackAvailable = cashbackWallet?.availableBalance || 0;
  const [cashbackToEarn, setCashbackToEarn] = React.useState(0);

  // Calculate cashback when amount or provider changes
  React.useEffect(() => {
    if (selectedDisco && amount && parseFloat(amount) >= minimumAmount) {
      const amountValue = parseFloat(amount);

      calculateCashback(
        {
          serviceType: 'ELECTRICITY',
          provider: selectedDisco.toUpperCase(),
          amount: amountValue,
        },
        {
          onSuccess: (data) => {
            if (data.isEligible) {
              setCashbackToEarn(data.cashbackAmount);
            } else {
              setCashbackToEarn(0);
            }
          },
          onError: () => {
            setCashbackToEarn(0);
          },
        },
      );
    } else {
      setCashbackToEarn(0);
    }
  }, [amount, selectedDisco, calculateCashback, minimumAmount]);

  const handleDiscoChange = (disco: string) => {
    setSelectedDisco(disco);
    setMeterNumber('');
    setCustomerInfo(null);
    setAmount('');
  };

  const handleMeterNumberChange = (value: string) => {
    // Only allow numbers and max 13 digits
    const numericValue = value.replace(/[^0-9]/g, '').slice(0, 13);
    const previousLength = meterNumber.length;
    setMeterNumber(numericValue);

    // Clear customer info if meter number changes
    if (customerInfo) {
      setCustomerInfo(null);
    }

    // Auto-verify only when user enters the 13th digit
    if (numericValue.length === 13 && numericValue.length > previousLength && !customerInfo) {
      handleVerify(numericValue);
    }
  };

  const handleVerify = (meterNum?: string) => {
    const numberToVerify = meterNum || meterNumber;

    if (numberToVerify.length < 10) {
      Alert.alert('Invalid Meter Number', 'Meter number must be at least 10 digits');
      return;
    }

    verifyMeter(
      {
        disco: selectedDisco!,
        meterNumber: numberToVerify,
        meterType,
      },
      {
        onSuccess: (data) => {
          setCustomerInfo({
            name: data.customerName,
            address: data.address,
            meterType: data.meterType,
          });
        },
      },
    );
  };

  const handlePayment = () => {
    const amountValue = parseFloat(amount);

    if (amountValue < minimumAmount) {
      Alert.alert('Invalid Amount', `Minimum amount is ${formatCurrency(minimumAmount)}`);
      return;
    }

    // Calculate amount after cashback discount
    const amountToPay = pendingCashback.use ? amountValue - pendingCashback.amount : amountValue;

    if (amountToPay > balance) {
      Alert.alert('Insufficient Balance', 'Please fund your wallet to continue');
      return;
    }

    // Check if user has set a PIN
    if (!checkPinSetOrPrompt(hasPinSet)) {
      return;
    }

    setShowConfirmationModal(true);
  };

  const handleConfirmTransaction = (cashbackDecision: { use: boolean; amount: number }) => {
    setPendingCashback(cashbackDecision);
    setShowConfirmationModal(false);
    setShowPINModal(true);
  };

  const handlePINSubmit = (pin: string) => {
    // Use sandbox number in dev, user phone in production
    const phoneNumber = __DEV__ ? '08011111111' : user?.phone || '08011111111';

    payElectricity(
      {
        disco: selectedDisco!,
        meterNumber,
        meterType,
        amount: parseFloat(amount),
        phone: phoneNumber,
        pin,
        useCashback: pendingCashback.use,
        cashbackAmount: pendingCashback.use ? pendingCashback.amount : undefined,
      },
      {
        onSuccess: async (data) => {
          setShowPINModal(false);
          queryClient.invalidateQueries({ queryKey: ['wallet'] });
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          queryClient.invalidateQueries({ queryKey: ['cashback', 'wallet'] });
          queryClient.invalidateQueries({ queryKey: ['cashback', 'history'] });

          // Check if user is eligible for rating prompt
          await handleSuccessfulTransaction();

          // Navigate to success screen with transaction data
          const successDetails: TransactionDetail[] = [
            {
              label: 'Provider',
              value:
                providers.find((p: any) => p.code === selectedDisco)?.name || selectedDisco || '',
            },
            {
              label: 'Meter Number',
              value: meterNumber,
            },
            {
              label: 'Customer Name',
              value: customerInfo?.name || '',
            },
            {
              label: 'Address',
              value: customerInfo?.address || '',
            },
            {
              label: 'Meter Type',
              value: customerInfo?.meterType?.toUpperCase() || meterType.toUpperCase(),
            },
            {
              label: 'Amount',
              value: formatCurrency(parseFloat(amount)),
              highlight: true,
            },
          ];

          router.push({
            pathname: '/transaction-success',
            params: {
              serviceType: 'Electricity Payment',
              amount: parseFloat(amount).toString(),
              reference: data.reference || '',
              cashbackEarned: cashbackToEarn.toString(),
              cashbackRedeemed: pendingCashback.use ? pendingCashback.amount.toString() : '0',
              details: JSON.stringify(successDetails),
              meterToken: data.meterToken || '',
            },
          });
        },
        onError: () => {
          setShowPINModal(false);
        },
      },
    );
  };

  const isFormValid = selectedDisco && customerInfo && parseFloat(amount) >= minimumAmount;

  // Prepare transaction details for confirmation modal
  const transactionDetails: TransactionDetail[] = [
    {
      label: 'Provider',
      value: providers.find((p: any) => p.code === selectedDisco)?.name || selectedDisco || '',
    },
    {
      label: 'Meter Number',
      value: meterNumber,
    },
    {
      label: 'Customer Name',
      value: customerInfo?.name || '',
    },
    {
      label: 'Address',
      value: customerInfo?.address || '',
    },
    {
      label: 'Meter Type',
      value: customerInfo?.meterType?.toUpperCase() || meterType.toUpperCase(),
    },
    {
      label: 'Amount',
      value: formatCurrency(parseFloat(amount) || 0),
      highlight: true,
    },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50 dark:bg-gray-900"
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <ScreenHeader title="Pay Electricity" subtitle={balance} />

      <ScrollView
        className="flex-1 px-5 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* DISCO Selection */}
        <View className="mb-6">
          <Text variant="h4" className="mb-4">
            Select Electricity Provider
          </Text>
          {loadingProviders ? (
            <View className="flex-row flex-wrap gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <ProviderSkeleton key={i} />
              ))}
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-3">
              {providers.map((disco: any) => (
                <TouchableOpacity
                  key={disco.code}
                  className="flex-1 min-w-[30%]"
                  onPress={() => handleDiscoChange(disco.code)}
                >
                  <Card
                    variant={selectedDisco === disco.code ? 'filled' : 'elevated'}
                    className={`p-3 items-center ${
                      selectedDisco === disco.code ? 'bg-purple-100 border-2 border-[#5B55F6]' : ''
                    }`}
                  >
                    <Image
                      source={ELECTRICITY_PROVIDER_IMAGES[disco.code] || DEFAULT_PROVIDER_IMAGE}
                      className="w-12 h-12 mb-2 rounded-full border-2 border-gray-300 dark:border-gray-700"
                      resizeMode="contain"
                    />
                    <Text variant="caption" align="center" numberOfLines={2} weight="semibold">
                      {disco.name}
                    </Text>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Meter Type */}
        {selectedDisco && (
          <View className="mb-6">
            <Text variant="h4" className="mb-4">
              Meter Type
            </Text>
            <View className="flex-row gap-3">
              {METER_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  className="flex-1"
                  onPress={() => setMeterType(type.id)}
                >
                  <Card
                    variant={meterType === type.id ? 'filled' : 'elevated'}
                    className={`p-4 items-center ${
                      meterType === type.id ? 'bg-purple-100 border-2 border-[#5B55F6]' : ''
                    }`}
                  >
                    <Text variant="bodyMedium" align="center">
                      {type.name}
                    </Text>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Meter Number */}
        {selectedDisco && (
          <View className="mb-6">
            <Input
              label="Meter Number"
              placeholder="Enter 10-13 digit meter number"
              value={meterNumber}
              onChangeText={handleMeterNumberChange}
              keyboardType="numeric"
              maxLength={13}
              leftIcon="flash-outline"
            />
            {isVerifying && (
              <View className="mt-2 flex-row items-center">
                <Text variant="caption" color="secondary">
                  Verifying meter number...
                </Text>
              </View>
            )}
            {meterNumber.length >= 10 && !customerInfo && !isVerifying && (
              <Button
                variant="outline"
                size="sm"
                onPress={() => handleVerify()}
                loading={isVerifying}
                className="mt-3"
              >
                Verify Meter
              </Button>
            )}
          </View>
        )}

        {/* Customer Info */}
        {customerInfo && (
          <Card variant="elevated" className="p-4 mb-6 bg-green-50">
            <View className="flex-row items-start">
              <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
              <View className="ml-3 flex-1">
                <Text variant="caption" color="secondary">
                  Customer Name
                </Text>
                <Text variant="bodyMedium" className="mt-1">
                  {customerInfo.name}
                </Text>
                <Text variant="caption" color="secondary" className="mt-2">
                  Address
                </Text>
                <Text variant="body" className="mt-1">
                  {customerInfo.address}
                </Text>
                <Text variant="caption" color="secondary" className="mt-2">
                  Meter Type
                </Text>
                <Text variant="body" className="mt-1">
                  {customerInfo.meterType.toUpperCase()}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Amount */}
        {customerInfo && (
          <View className="mb-6">
            <Input
              label="Amount"
              placeholder={`Minimum ${formatCurrency(minimumAmount)}`}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              leftIcon="cash-outline"
            />
          </View>
        )}

        {/* Info Card */}
        <Card variant="elevated" className="p-4 mb-6 bg-purple-50 dark:bg-purple-900/20">
          <View className="flex-row items-start">
            <Ionicons name="information-circle-outline" size={20} color="#5B55F6" />
            <View className="ml-3 flex-1">
              <Text variant="caption" color="secondary">
                • Minimum amount:{' '}
                {selectedDisco === 'ibadan-electric' ? '₦5,000 (Ibadan Electric)' : '₦1,000'} {'\n'}
                • Token will be displayed after payment (prepaid){'\n'}• Verify meter number before
                payment
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
        onConfirm={handleConfirmTransaction}
        serviceType="Electricity Payment"
        details={transactionDetails}
        amount={parseFloat(amount) || 0}
        currentBalance={balance}
        cashbackAvailable={cashbackAvailable}
        cashbackToEarn={cashbackToEarn}
      />

      {/* PIN Modal */}
      <PINModal
        visible={showPINModal}
        onClose={() => setShowPINModal(false)}
        onSubmit={handlePINSubmit}
        loading={isPaying}
        title="Enter PIN"
        subtitle="Confirm electricity payment"
      />
    </KeyboardAvoidingView>
  );
}

// Provider Skeleton
const ProviderSkeleton: React.FC = () => (
  <View className="flex-1 min-w-[30%]">
    <Card variant="elevated" className="p-3 items-center gap-2">
      <Skeleton width="90%" height={16} />
      <Skeleton width="70%" height={16} />
    </Card>
  </View>
);
