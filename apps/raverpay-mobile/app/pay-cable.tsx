// app/pay-cable.tsx

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
import { CABLE_PROVIDERS } from '@/src/constants/vtu';
import { useCalculateCashback, useCashbackWallet } from '@/src/hooks/useCashback';
import { useTheme } from '@/src/hooks/useTheme';
import { useCableTVPlans, usePayCableTV, useVerifySmartcard } from '@/src/hooks/useVTU';
import { formatCurrency } from '@/src/lib/utils/formatters';
import { checkPinSetOrPrompt } from '@/src/lib/utils/pin-helper';
import { handleSuccessfulTransaction } from '@/src/lib/utils/rating-helper';
import { useUserStore } from '@/src/store/user.store';
import { useWalletStore } from '@/src/store/wallet.store';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
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

// Using CABLE_PROVIDERS from constants instead

export default function PayCableScreen() {
  const { isDark } = useTheme();
  const { balance } = useWalletStore();
  const { hasPinSet, user } = useUserStore();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [smartcardNumber, setSmartcardNumber] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showPINModal, setShowPINModal] = useState(false);
  const [pendingCashback, setPendingCashback] = useState<{
    use: boolean;
    amount: number;
  }>({ use: false, amount: 0 });

  const { data: plansData, isLoading: loadingPlans } = useCableTVPlans(
    selectedProvider || '',
    !!selectedProvider,
  );

  const { mutate: verifySmartcard, isPending: isVerifying } = useVerifySmartcard();
  const { mutate: payCable, isPending: isPaying } = usePayCableTV();

  // Cashback hooks
  const { data: cashbackWallet } = useCashbackWallet();
  const { mutate: calculateCashback } = useCalculateCashback();
  const cashbackAvailable = cashbackWallet?.availableBalance || 0;

  const packages = Array.isArray(plansData?.plans)
    ? plansData.plans.filter((pkg: any) => pkg && (pkg.code || pkg.variation_code))
    : [];

  // State for cashback to earn
  const [cashbackToEarn, setCashbackToEarn] = React.useState(0);

  // Calculate cashback when package or provider changes
  React.useEffect(() => {
    if (selectedProvider && selectedPackage) {
      const packageAmount = parseFloat(
        selectedPackage.variation_amount || selectedPackage.amount || 0,
      );

      if (packageAmount > 0) {
        calculateCashback(
          {
            serviceType: 'CABLE_TV',
            provider: selectedProvider.toUpperCase(),
            amount: packageAmount,
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
      }
    } else {
      setCashbackToEarn(0);
    }
  }, [selectedPackage, selectedProvider, calculateCashback]);

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    setSmartcardNumber('');
    setCustomerInfo(null);
    setSelectedPackage(null);
  };

  const handleSmartcardChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '').slice(0, 10);
    const previousLength = smartcardNumber.length;
    setSmartcardNumber(numericValue);

    if (customerInfo) {
      setCustomerInfo(null);
    }
    if (selectedPackage) {
      setSelectedPackage(null);
    }

    if (
      selectedProvider &&
      numericValue.length === 10 &&
      numericValue.length > previousLength &&
      !customerInfo
    ) {
      handleVerify(numericValue);
    }
  };

  const handleVerify = (cardNumber?: string) => {
    const numberToVerify = cardNumber || smartcardNumber;

    if (!selectedProvider) {
      Alert.alert('Select Provider', 'Please choose a provider first.');
      return;
    }

    if (numberToVerify.length !== 10) {
      Alert.alert('Invalid Smartcard', 'Smartcard number must be 10 digits');
      return;
    }

    verifySmartcard(
      {
        provider: selectedProvider!,
        smartcardNumber: numberToVerify,
      },
      {
        onSuccess: (data) => {
          setCustomerInfo({
            name: data.customerName,
            currentPlan: data.currentPlan,
            dueDate: data.dueDate,
          });
        },
      },
    );
  };

  const handlePayment = () => {
    if (!selectedPackage) return;

    const packageAmount = parseFloat(
      selectedPackage.variation_amount || selectedPackage.amount || 0,
    );

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

  const handleConfirmTransaction = (cashbackDecision: { use: boolean; amount: number }) => {
    setPendingCashback(cashbackDecision);
    setShowConfirmationModal(false);
    setShowPINModal(true);
  };

  const handlePINSubmit = (pin: string) => {
    const productCode = selectedPackage?.variation_code || selectedPackage?.code;

    if (!productCode) {
      Alert.alert('Invalid Package', 'Please select a valid package and try again.');
      return;
    }

    const phoneNumber = __DEV__ ? '08011111111' : user?.phone || smartcardNumber || '08011111111';

    payCable(
      {
        provider: selectedProvider!,
        smartcardNumber,
        subscriptionType: 'change',
        productCode,
        quantity: 1,
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
                CABLE_PROVIDERS.find((p) => p.id === selectedProvider)?.name ||
                selectedProvider ||
                '',
            },
            {
              label: 'Smartcard Number',
              value: smartcardNumber,
            },
            {
              label: 'Customer Name',
              value: customerInfo?.name || '',
            },
            {
              label: 'Package',
              value: selectedPackage?.name || '',
              highlight: true,
            },
          ];

          if (customerInfo?.currentPlan) {
            successDetails.push({
              label: 'Current Plan',
              value: customerInfo.currentPlan,
            });
          }

          router.push({
            pathname: '/transaction-success',
            params: {
              serviceType: 'Cable TV Subscription',
              amount: packageAmount.toString(),
              reference: data.reference || '',
              cashbackEarned: cashbackToEarn.toString(),
              cashbackRedeemed: pendingCashback.use ? pendingCashback.amount.toString() : '0',
              details: JSON.stringify(successDetails),
            },
          });
        },
        onError: () => {
          setShowPINModal(false);
        },
      },
    );
  };

  const isFormValid = selectedProvider && customerInfo && selectedPackage;

  // Prepare transaction details for confirmation modal
  const transactionDetails: TransactionDetail[] = [
    {
      label: 'Provider',
      value: CABLE_PROVIDERS.find((p) => p.id === selectedProvider)?.name || selectedProvider || '',
    },
    {
      label: 'Smartcard Number',
      value: smartcardNumber,
    },
    {
      label: 'Customer Name',
      value: customerInfo?.name || '',
    },
    {
      label: 'Package',
      value: selectedPackage?.name || '',
      highlight: true,
    },
  ];

  if (customerInfo?.currentPlan) {
    transactionDetails.push({
      label: 'Current Plan',
      value: customerInfo.currentPlan,
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
      <ScreenHeader title="Pay Cable TV" subtitle={balance} />

      <ScrollView
        className="flex-1 px-5 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Provider Selection */}
        <View className="mb-6">
          <Text variant="h4" className="mb-4">
            Select Provider
          </Text>
          <View className="flex-row gap-3">
            {CABLE_PROVIDERS.map((provider) => (
              <TouchableOpacity
                key={provider.id}
                className="flex-1"
                onPress={() => handleProviderChange(provider.id)}
              >
                <Card
                  variant={selectedProvider === provider.id ? 'filled' : 'elevated'}
                  className={`p-4 items-center ${
                    selectedProvider === provider.id
                      ? 'bg-purple-100 border-2 border-[#5B55F6]'
                      : ''
                  }`}
                >
                  <Image
                    source={provider.image}
                    className="w-12 h-12 mb-2 rounded-full border-2 border-gray-300 dark:border-gray-700"
                    resizeMode="contain"
                  />
                  <Text variant="caption" align="center" weight="semibold">
                    {provider.name}
                  </Text>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Smartcard Number */}
        {selectedProvider && (
          <View className="mb-6">
            <Input
              label="Smartcard Number"
              placeholder="1234567890"
              value={smartcardNumber}
              onChangeText={handleSmartcardChange}
              keyboardType="numeric"
              maxLength={10}
              leftIcon="card-outline"
            />
            {smartcardNumber.length === 10 && !customerInfo && (
              <Button
                variant="outline"
                size="sm"
                onPress={() => handleVerify()}
                loading={isVerifying}
                className="mt-3"
              >
                Verify Smartcard
              </Button>
            )}
            {isVerifying && (
              <Text variant="caption" color="secondary" className="mt-2">
                Verifying smartcard...
              </Text>
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
                {customerInfo.currentPlan && (
                  <>
                    <Text variant="caption" color="secondary" className="mt-2">
                      Current Plan
                    </Text>
                    <Text variant="body" className="mt-1">
                      {customerInfo.currentPlan}
                    </Text>
                  </>
                )}
                {customerInfo.dueDate && (
                  <>
                    <Text variant="caption" color="secondary" className="mt-2">
                      Due Date
                    </Text>
                    <Text variant="body" className="mt-1">
                      {customerInfo.dueDate}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </Card>
        )}

        {/* Packages */}
        {selectedProvider && customerInfo && (
          <View className="mb-6">
            <Text variant="h4" className="mb-4">
              Select Package
            </Text>
            {loadingPlans ? (
              <View className="flex-row flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <PackageSkeleton key={i} />
                ))}
              </View>
            ) : packages.length > 0 ? (
              <View style={{ height: 600 }}>
                <FlashList
                  data={packages}
                  numColumns={3}
                  keyExtractor={(pkg, index) => {
                    const pkgCode = pkg.variation_code || pkg.code || 'pkg';
                    return `${pkgCode}-${index}`;
                  }}
                  renderItem={({ item: pkg }) => {
                    const packageCode = pkg.variation_code || pkg.code;
                    const selectedCode = selectedPackage?.variation_code || selectedPackage?.code;
                    const planAmount = parseFloat(pkg.variation_amount || pkg.amount || 0) || 0;

                    return (
                      <TouchableOpacity
                        onPress={() => setSelectedPackage(pkg)}
                        className="mb-2 px-1"
                        style={{ width: '95%', marginHorizontal: '2.5%' }}
                      >
                        <Card
                          variant={selectedCode === packageCode ? 'filled' : 'elevated'}
                          className={`p-3 ${
                            selectedCode === packageCode
                              ? 'bg-purple-100 border-2 border-[#5B55F6]'
                              : ''
                          }`}
                        >
                          <View>
                            <Text
                              variant="caption"
                              weight="semibold"
                              numberOfLines={2}
                              className="text-center"
                            >
                              {pkg.name}
                            </Text>
                            <Text
                              variant="caption"
                              color="secondary"
                              className="mt-1 text-center"
                              numberOfLines={1}
                            >
                              {pkg.validity || pkg.description}
                            </Text>
                            <Text
                              variant="bodyMedium"
                              className="text-[#5B55F6] mt-2 text-center"
                              weight="semibold"
                            >
                              {formatCurrency(planAmount)}
                            </Text>
                          </View>
                        </Card>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            ) : (
              <Card variant="elevated" className="p-4">
                <Text variant="body" color="secondary" align="center">
                  No packages available
                </Text>
              </Card>
            )}
          </View>
        )}

        {/* Info Card */}
        <Card variant="elevated" className="p-4 mb-6 bg-purple-50 dark:bg-purple-900/20">
          <View className="flex-row items-start">
            <Ionicons name="information-circle-outline" size={20} color="#5B55F6" />
            <View className="ml-3 flex-1">
              <Text variant="caption" color="secondary">
                • Subscription is processed instantly{'\n'}• Verify smartcard before payment{'\n'}•
                Renewal extends current subscription
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
        serviceType="Cable TV Subscription"
        details={transactionDetails}
        amount={packageAmount}
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
        subtitle="Confirm cable TV payment"
      />
    </KeyboardAvoidingView>
  );
}

// Package Skeleton (3-column grid layout)
const PackageSkeleton: React.FC = () => (
  <View className="mb-2 px-1" style={{ width: '33.33%' }}>
    <Card variant="elevated" className="p-3">
      <Skeleton width="100%" height={16} className="mb-2" />
      <Skeleton width="80%" height={14} className="mb-2" />
      <Skeleton width={60} height={16} className="mt-2" />
    </Card>
  </View>
);
