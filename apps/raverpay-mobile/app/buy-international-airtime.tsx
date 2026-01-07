// app/buy-international-airtime.tsx

import {
  BottomSheet,
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
import { useCalculateCashback, useCashbackWallet } from '@/src/hooks/useCashback';
import { useTheme } from '@/src/hooks/useTheme';
import {
  useInternationalCountries,
  useInternationalOperators,
  useInternationalProductTypes,
  useInternationalVariations,
  usePurchaseInternationalAirtime,
} from '@/src/hooks/useVTU';
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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BuyInternationalAirtimeScreen() {
  const { isDark } = useTheme();
  const { balance } = useWalletStore();
  const { hasPinSet } = useUserStore();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  // Form state
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [selectedProductType, setSelectedProductType] = useState<any>(null);
  const [selectedOperator, setSelectedOperator] = useState<any>(null);
  const [selectedVariation, setSelectedVariation] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [billersCode, setBillersCode] = useState(''); // Recipient's phone number in international format
  const [showCountrySheet, setShowCountrySheet] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showPINModal, setShowPINModal] = useState(false);
  const [pendingCashback, setPendingCashback] = useState<{
    use: boolean;
    amount: number;
  }>({ use: false, amount: 0 });

  // API hooks
  const { data: countriesData, isPending: loadingCountries } = useInternationalCountries();
  const { data: productTypesData, isPending: loadingProductTypes } = useInternationalProductTypes(
    selectedCountry?.code || '',
    !!selectedCountry,
  );
  const { data: operatorsData, isPending: loadingOperators } = useInternationalOperators(
    selectedCountry?.code || '',
    selectedProductType?.id || '',
    !!selectedCountry && !!selectedProductType,
  );
  const { data: variationsData, isPending: loadingVariations } = useInternationalVariations(
    selectedOperator?.id || '',
    selectedProductType?.id || '',
    !!selectedOperator && !!selectedProductType,
  );
  const { mutate: purchaseAirtime, isPending: isPurchasing } = usePurchaseInternationalAirtime();

  // Cashback hooks
  const { data: cashbackWallet } = useCashbackWallet();
  const { mutate: calculateCashback } = useCalculateCashback();
  const cashbackAvailable = cashbackWallet?.availableBalance || 0;
  const [cashbackToEarn, setCashbackToEarn] = React.useState(0);

  // Sanitize data - filter out null/undefined values
  const countries = Array.isArray(countriesData)
    ? countriesData.filter((c: any) => c && c.code)
    : [];
  const productTypes = Array.isArray(productTypesData)
    ? productTypesData.filter((pt: any) => pt && pt.id)
    : [];
  const operators = Array.isArray(operatorsData)
    ? operatorsData.filter((op: any) => op && op.id)
    : [];
  const variations = Array.isArray(variationsData)
    ? variationsData.filter((v: any) => v && v.variation_code)
    : [];

  // Calculate cashback when variation changes
  React.useEffect(() => {
    if (selectedVariation && selectedOperator) {
      const amount =
        parseFloat(selectedVariation.variation_amount || selectedVariation.amount || 0) || 0;

      if (amount > 0) {
        calculateCashback(
          {
            serviceType: 'INTERNATIONAL_AIRTIME',
            provider: selectedOperator.id.toUpperCase(),
            amount: amount,
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
    } else {
      setCashbackToEarn(0);
    }
  }, [selectedVariation, selectedOperator, calculateCashback]);

  const handleCountryChange = (country: any) => {
    setSelectedCountry(country);
    setSelectedProductType(null);
    setSelectedOperator(null);
    setSelectedVariation(null);
    setShowCountrySheet(false);
  };

  const handleProductTypeChange = (productType: any) => {
    setSelectedProductType(productType);
    setSelectedOperator(null);
    setSelectedVariation(null);
  };

  const handleOperatorChange = (operator: any) => {
    setSelectedOperator(operator);
    setSelectedVariation(null);
  };

  const handlePurchase = () => {
    if (!selectedVariation) return;

    const amount =
      parseFloat(selectedVariation.variation_amount || selectedVariation.amount || 0) || 0;

    if (amount > balance) {
      Alert.alert('Insufficient Balance', 'Please fund your wallet to continue');
      return;
    }

    // Check if user has set a PIN
    if (!checkPinSetOrPrompt(hasPinSet)) {
      return;
    }

    setShowConfirmationModal(true);
  };

  const handleConfirmTransaction = (useCashback: boolean, cashbackAmount: number) => {
    setPendingCashback({ use: useCashback, amount: cashbackAmount });
    setShowConfirmationModal(false);
    setShowPINModal(true);
  };

  const handlePINSubmit = (pin: string) => {
    const variationCode = selectedVariation?.variation_code || selectedVariation?.code;

    if (
      !variationCode ||
      !selectedOperator?.id ||
      !selectedCountry?.code ||
      !selectedProductType?.id
    ) {
      Alert.alert(
        'Invalid Selection',
        'Please ensure all fields are selected correctly and try again.',
      );
      return;
    }

    purchaseAirtime(
      {
        billersCode,
        variationCode,
        operatorId: selectedOperator.id,
        countryCode: selectedCountry.code,
        productTypeId: selectedProductType.id,
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
              label: 'Country',
              value: selectedCountry?.name || '',
            },
            {
              label: 'Service Type',
              value: selectedProductType?.name || '',
            },
            {
              label: 'Operator',
              value: selectedOperator?.name || '',
            },
            {
              label: 'Package',
              value: selectedVariation?.name || '',
              highlight: true,
            },
            {
              label: 'Recipient Number',
              value: billersCode,
            },
            {
              label: 'Your Phone Number',
              value: phoneNumber,
            },
          ];

          router.push({
            pathname: '/transaction-success',
            params: {
              serviceType: 'International Airtime',
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

  const isFormValid =
    selectedCountry &&
    selectedProductType &&
    selectedOperator &&
    selectedVariation &&
    billersCode.length >= 8 &&
    phoneNumber.length === 11;

  // Prepare transaction details for confirmation modal
  const transactionDetails: TransactionDetail[] = [
    {
      label: 'Country',
      value: selectedCountry?.name || '',
    },
    {
      label: 'Service Type',
      value: selectedProductType?.name || '',
    },
    {
      label: 'Operator',
      value: selectedOperator?.name || '',
    },
    {
      label: 'Package',
      value: selectedVariation?.name || '',
      highlight: true,
    },
    {
      label: 'Recipient Number',
      value: billersCode,
    },
    {
      label: 'Your Phone Number',
      value: phoneNumber,
    },
  ];

  const packageAmount = selectedVariation
    ? parseFloat(selectedVariation.variation_amount || selectedVariation.amount || 0) || 0
    : 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50 dark:bg-gray-900"
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <ScreenHeader title="International Airtime" subtitle={balance} />

      <ScrollView
        className="flex-1 px-5 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Country Selection */}
        <View className="mb-6">
          <Text variant="h4" className="mb-2">
            Select Country
          </Text>
          {loadingCountries ? (
            <Skeleton width="100%" height={60} borderRadius={12} />
          ) : (
            <TouchableOpacity onPress={() => setShowCountrySheet(true)}>
              <Card variant="elevated" className="p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text variant="caption" color="secondary" className="mb-1">
                      Country
                    </Text>
                    <Text variant="bodyMedium">{selectedCountry?.name || 'Choose a country'}</Text>
                  </View>
                  <Ionicons name="chevron-down" size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
                </View>
              </Card>
            </TouchableOpacity>
          )}
        </View>

        {/* Product Type Selection */}
        {selectedCountry && (
          <View className="mb-6">
            <Text variant="h4" className="mb-2">
              Select Service Type
            </Text>
            {loadingProductTypes ? (
              <View className="flex-row gap-3">
                {[1, 2].map((i) => (
                  <View key={i} className="flex-1">
                    <Skeleton width="100%" height={60} borderRadius={12} />
                  </View>
                ))}
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {productTypes.map((type: any) => (
                  <TouchableOpacity
                    key={type.id}
                    onPress={() => handleProductTypeChange(type)}
                    style={{ width: 150 }}
                  >
                    <Card
                      variant={selectedProductType?.id === type.id ? 'filled' : 'elevated'}
                      className={`p-4 items-center ${
                        selectedProductType?.id === type.id
                          ? 'bg-purple-100 border-2 border-[#5B55F6]'
                          : ''
                      }`}
                    >
                      <Text variant="caption" align="center">
                        {type.name}
                      </Text>
                    </Card>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Operator Selection */}
        {selectedProductType && (
          <View className="">
            <Text variant="h4" className="mb-2">
              Select Operator
            </Text>
            {loadingOperators ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {[1, 2, 3].map((i) => (
                  <View key={i} style={{ width: 200 }}>
                    <OperatorSkeleton />
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={{ height: 80 }}>
                <FlashList
                  data={operators}
                  horizontal
                  keyExtractor={(operator: any) => operator.id}
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item: operator }) => (
                    <TouchableOpacity
                      onPress={() => handleOperatorChange(operator)}
                      style={{ width: 150, marginRight: 12 }}
                    >
                      <Card
                        variant={selectedOperator?.id === operator.id ? 'filled' : 'elevated'}
                        className={`p-4 ${
                          selectedOperator?.id === operator.id
                            ? 'bg-purple-100 dark:bg-purple-900/30 border-2 border-[#5B55F6]'
                            : ''
                        }`}
                      >
                        <Text variant="bodyMedium">{operator.name}</Text>
                      </Card>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </View>
        )}

        {/* Recipient Phone */}
        {selectedOperator && (
          <View className="mb-2">
            <Input
              label="Recipient Phone Number"
              placeholder="e.g., +1234567890"
              value={billersCode}
              onChangeText={setBillersCode}
              keyboardType="phone-pad"
              leftIcon="call-outline"
            />
          </View>
        )}

        {/* Your Phone Number - Show after recipient number */}
        {selectedOperator && billersCode && (
          <View className="mb-6">
            <Input
              label="Your Phone Number"
              placeholder="08012345678"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              maxLength={11}
              leftIcon="call-outline"
            />
            <Text variant="caption" color="secondary" className="mt-2">
              Your Nigerian phone number for transaction reference
            </Text>
          </View>
        )}

        {/* Package Selection */}
        {selectedOperator && billersCode && phoneNumber && (
          <View className="mb-6">
            <Text variant="h4" className="mb-4">
              Select Package
            </Text>
            {loadingVariations ? (
              <View className="gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <VariationSkeleton key={i} />
                ))}
              </View>
            ) : variations.length > 0 ? (
              <View className="gap-3">
                {variations.map((variation: any, index: number) => {
                  const variationCode = variation.variation_code || variation.code;
                  const selectedCode = selectedVariation?.variation_code || selectedVariation?.code;
                  const planAmount =
                    parseFloat(variation.variation_amount || variation.amount || 0) || 0;

                  return (
                    <TouchableOpacity
                      key={`${variationCode || 'var'}-${index}`}
                      onPress={() => setSelectedVariation(variation)}
                    >
                      <Card
                        variant={selectedCode === variationCode ? 'filled' : 'elevated'}
                        className={`p-4 ${
                          selectedCode === variationCode
                            ? 'bg-purple-100 border-2 border-[#5B55F6]'
                            : ''
                        }`}
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1">
                            <Text variant="bodyMedium">{variation.name}</Text>
                            <Text variant="caption" color="secondary" className="mt-1">
                              {variation.description || variation.validity}
                            </Text>
                          </View>
                          <Text variant="bodyMedium" className="text-[#5B55F6]">
                            {formatCurrency(planAmount)}
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
        )}

        {/* Info Card */}
        <Card variant="elevated" className="p-4 mb-6 bg-purple-50 dark:bg-purple-900/20">
          <View className="flex-row items-start">
            <Ionicons name="information-circle-outline" size={20} color="#5B55F6" />
            <View className="ml-3 flex-1">
              <Text variant="caption" color="secondary">
                • International airtime will be sent instantly{'\n'}• Enter recipient&apos;s number
                with country code{'\n'}• Your phone number is for transaction reference
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* Floating Purchase Button */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-5 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 24) }}
      >
        {!isFormValid && selectedVariation && !phoneNumber && (
          <Text variant="caption" color="secondary" align="center" className="mb-2">
            ⬆️ Please enter your phone number above
          </Text>
        )}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={handlePurchase}
          disabled={!isFormValid}
        >
          Buy Airtime
        </Button>
      </View>

      {/* Country Selection BottomSheet */}
      <BottomSheet visible={showCountrySheet} onClose={() => setShowCountrySheet(false)}>
        <View className="flex-row justify-between items-start mb-4">
          <View className="flex-1">
            <Text variant="h4" className="mb-1">
              Select Country
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowCountrySheet(false)}
            className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg"
          >
            <Ionicons name="close" size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
          </TouchableOpacity>
        </View>
        <View style={{ height: '100%' }}>
          <FlashList
            data={countries}
            keyExtractor={(country: any) => country.code}
            renderItem={({ item: country }) => (
              <TouchableOpacity onPress={() => handleCountryChange(country)} className="mb-3">
                <Card
                  variant={selectedCountry?.code === country.code ? 'filled' : 'elevated'}
                  className={`p-4 ${
                    selectedCountry?.code === country.code
                      ? 'bg-purple-100 dark:bg-purple-900/30 border-2 border-[#5B55F6]'
                      : ''
                  }`}
                >
                  <Text variant="bodyMedium">{country.name}</Text>
                </Card>
              </TouchableOpacity>
            )}
          />
        </View>
      </BottomSheet>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        onConfirm={handleConfirmTransaction}
        serviceType="International Airtime"
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
        loading={isPurchasing}
        title="Enter PIN"
        subtitle="Confirm international airtime purchase"
      />
    </KeyboardAvoidingView>
  );
}

// Operator Skeleton
const OperatorSkeleton: React.FC = () => (
  <Card variant="elevated" className="p-4">
    <Skeleton width="70%" height={18} />
  </Card>
);

// Variation Skeleton
const VariationSkeleton: React.FC = () => (
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
