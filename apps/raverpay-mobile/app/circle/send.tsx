// app/circle/send.tsx
import { CircleWalletCard } from '@/src/components/circle';
import {
  Button,
  Card,
  ConfirmationModal,
  Input,
  PINModal,
  ScreenHeader,
  Text,
} from '@/src/components/ui';
import { useCircleSDK } from '@/src/contexts/CircleSDKContext';
import {
  useCircleChains,
  useCircleWalletBalance,
  useCircleWallets,
  useEstimateFee,
  useTransferUsdc,
  useValidateAddress,
} from '@/src/hooks/useCircleWallet';
import { usePaymaster } from '@/src/hooks/usePaymaster';
import { useTheme } from '@/src/hooks/useTheme';
import { apiClient } from '@/src/lib/api/client';
import { paymasterService } from '@/src/services/paymaster.service';
import { userControlledWalletService } from '@/src/services/user-controlled-wallet.service';
import { useCircleStore } from '@/src/store/circle.store';
import { CircleFeeLevel } from '@/src/types/circle.types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FEE_LEVELS: {
  level: CircleFeeLevel;
  label: string;
  description: string;
}[] = [
  { level: 'LOW', label: 'Slow', description: '~5 min' },
  { level: 'MEDIUM', label: 'Standard', description: '~2 min' },
  { level: 'HIGH', label: 'Fast', description: '~30 sec' },
];

export default function CircleSendScreen() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: wallets, isLoading: isLoadingWallets } = useCircleWallets();
  const { data: chainsData } = useCircleChains();
  const { selectedWallet, setSelectedWallet, getUsdcBalance } = useCircleStore();
  const { mutateAsync: transfer, isPending: isTransferring } = useTransferUsdc();
  const { mutateAsync: estimateFee } = useEstimateFee();
  const { mutateAsync: validateAddress } = useValidateAddress();
  const { generatePermit, submitUserOp, signPermitChallenge } = usePaymaster();
  const { executeChallenge, isInitialized: sdkInitialized } = useCircleSDK();

  // Load balance for selected wallet
  useCircleWalletBalance(selectedWallet?.id || '');

  const [destinationAddress, setDestinationAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [memo] = useState('');
  const [feeLevel, setFeeLevel] = useState<CircleFeeLevel>('MEDIUM');
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  const [addressValid, setAddressValid] = useState<boolean | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showWalletPicker, setShowWalletPicker] = useState(false);

  // Service fee state
  const [serviceFee, setServiceFee] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [feeConfig, setFeeConfig] = useState<{
    enabled: boolean;
    percentage: number;
    minFeeUsdc: number;
  } | null>(null);

  // Debug logs for fee system

  // Paymaster state
  const [usePaymasterGas, setUsePaymasterGas] = useState(false);
  const [paymasterFeeUsdc, setPaymasterFeeUsdc] = useState<string | null>(null);
  const [isPaymasterCompatible, setIsPaymasterCompatible] = useState(false);
  const [isSigningPermit, setIsSigningPermit] = useState(false); // Loading state for Paymaster flow

  const chainMeta = chainsData?.chains?.find((c) => c.blockchain === selectedWallet?.blockchain);
  const isSponsoredChain = chainMeta?.feeLabel?.includes('Free');

  // Fetch fee configuration on mount
  useEffect(() => {
    const fetchFeeConfig = async () => {
      try {
        const response = await apiClient.get('/circle/fees/config');

        if (response.data.success) {
          setFeeConfig(response.data.data);
        }
      } catch (error) {
        console.error('❌ Failed to fetch fee config:', error);
      }
    };
    fetchFeeConfig();
  }, []);

  // Calculate service fee when amount changes
  useEffect(() => {
    if (!amount || !feeConfig) {
      setServiceFee(0);
      setTotalAmount(0);
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setServiceFee(0);
      setTotalAmount(0);
      return;
    }

    if (!feeConfig.enabled) {
      setServiceFee(0);
      setTotalAmount(amountNum);
      return;
    }

    // Calculate fee
    const calculatedFee = amountNum * (feeConfig.percentage / 100);
    const finalFee = Math.max(calculatedFee, feeConfig.minFeeUsdc);
    const total = amountNum + finalFee;

    setServiceFee(Number(finalFee.toFixed(6)));
    setTotalAmount(Number(total.toFixed(6)));
  }, [amount, feeConfig]);

  // Validate address when it changes
  useEffect(() => {
    const validateAddr = async () => {
      if (destinationAddress.length >= 40 && selectedWallet) {
        try {
          const result = await validateAddress({
            address: destinationAddress,
            blockchain: selectedWallet.blockchain,
          });
          setAddressValid(result.data.isValid);
        } catch {
          setAddressValid(false);
        }
      } else {
        setAddressValid(null);
      }
    };
    validateAddr();
  }, [destinationAddress, selectedWallet, validateAddress]);

  // Estimate fee when amount or feeLevel changes
  useEffect(() => {
    const estimate = async () => {
      if (
        amount &&
        parseFloat(amount) > 0 &&
        destinationAddress &&
        selectedWallet &&
        addressValid
      ) {
        // Check if chain is sponsored
        const chainMeta = chainsData?.chains?.find(
          (c) => c.blockchain === selectedWallet.blockchain,
        );
        const isSponsored = chainMeta?.feeLabel?.includes('Free');

        if (isSponsored) {
          setEstimatedFee('0.00');
          return;
        }

        try {
          const result = await estimateFee({
            walletId: selectedWallet.id,
            destinationAddress,
            amount,
            blockchain: selectedWallet.blockchain,
            feeLevel, // Include feeLevel in estimation
          });
          // Use the fee estimate for the selected level
          const feeLevelKey = feeLevel.toLowerCase() as 'low' | 'medium' | 'high';
          const feeData = result.data[feeLevelKey];
          setEstimatedFee(feeData?.networkFee ?? result.data.maxFee ?? null);
        } catch {
          setEstimatedFee(null);
        }
      }
    };
    estimate();
  }, [amount, destinationAddress, selectedWallet, addressValid, estimateFee, chainsData, feeLevel]);

  // Check Paymaster compatibility when wallet changes
  // Paymaster is available for:
  // 1. USER-controlled SCA wallets
  // 2. MODULAR wallets (always support gasless)
  useEffect(() => {
    const checkCompatibility = async () => {
      // Check if it's a modular wallet (always supports paymaster)
      const isModularWallet = (selectedWallet as any)?.type === 'MODULAR';

      // Paymaster requires: SCA account type AND USER custody type (not developer-controlled)
      const isUserControlledSCA =
        selectedWallet &&
        selectedWallet.accountType === 'SCA' &&
        selectedWallet.custodyType === 'USER';

      if (isModularWallet) {
        // Modular wallets always support paymaster
        setIsPaymasterCompatible(true);
        setUsePaymasterGas(true); // Auto-enable for modular wallets
      } else if (isUserControlledSCA) {
        try {
          const { data } = await paymasterService.checkCompatibility(selectedWallet.id);
          setIsPaymasterCompatible(data.isPaymasterCompatible);

          // Auto-enable Paymaster for user-controlled wallets
          if (data.isPaymasterCompatible) {
            setUsePaymasterGas(true);
          }
        } catch {
          setIsPaymasterCompatible(false);
        }
      } else {
        setIsPaymasterCompatible(false);
        setUsePaymasterGas(false);
      }
    };
    checkCompatibility();
  }, [selectedWallet]);

  // Estimate Paymaster fee in USDC when enabled (debounced)
  // Use a simple estimate instead of calling generatePermit repeatedly
  const estimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any pending estimation
    if (estimationTimeoutRef.current) {
      clearTimeout(estimationTimeoutRef.current);
    }

    const estimatePaymasterFee = async () => {
      if (
        usePaymasterGas &&
        amount &&
        parseFloat(amount) > 0 &&
        destinationAddress &&
        selectedWallet &&
        addressValid
      ) {
        // Use a simple estimate based on blockchain
        // Actual gas will be calculated when user confirms
        const estimatedGas: Record<string, string> = {
          'ETH-SEPOLIA': '0.60',
          'MATIC-AMOY': '0.10',
          'ARB-SEPOLIA': '0.30',
          'BASE-SEPOLIA': '0.30',
          'AVAX-FUJI': '0.40',
        };
        setPaymasterFeeUsdc(estimatedGas[selectedWallet.blockchain] || '0.60');
      } else {
        setPaymasterFeeUsdc(null);
      }
    };

    // Debounce the estimation by 500ms
    estimationTimeoutRef.current = setTimeout(estimatePaymasterFee, 500);

    return () => {
      if (estimationTimeoutRef.current) {
        clearTimeout(estimationTimeoutRef.current);
      }
    };
  }, [usePaymasterGas, amount, destinationAddress, selectedWallet, addressValid]);

  const currentBalance = selectedWallet ? getUsdcBalance(selectedWallet.id) : '0';

  const handleMaxAmount = () => {
    setAmount(currentBalance);
  };

  const handleReviewTransaction = () => {
    setShowConfirmationModal(true);
  };

  const handleConfirmTransaction = () => {
    setShowConfirmationModal(false);

    // For user-controlled wallets, ALL transactions need Circle SDK WebView for signing
    // The app PIN modal is only for developer-controlled wallets
    if (selectedWallet?.custodyType === 'USER') {
      handleSend();
    } else {
      // For developer-controlled wallets, show app PIN modal
      setShowPinModal(true);
    }
  };

  const handleSend = async () => {
    if (!selectedWallet || !destinationAddress || !amount) return;

    // Show loading for User-controlled flow (both Paymaster and Regular)
    if (selectedWallet.custodyType === 'USER') {
      setIsSigningPermit(true);
    }

    try {
      if (selectedWallet.custodyType === 'USER') {
        // User-controlled wallet flow (ALWAYS requires Circle SDK WebView)
        setShowPinModal(false);

        // Get user token from secure storage
        const userToken = await SecureStore.getItemAsync('circle_user_token');
        const encryptionKey = await SecureStore.getItemAsync('circle_encryption_key');

        if (!userToken || !encryptionKey) {
          Alert.alert('Authentication Required', 'Please set up your Circle wallet first.', [
            { text: 'OK' },
          ]);
          return;
        }

        if (!sdkInitialized) {
          Alert.alert(
            'SDK Not Ready',
            'Circle SDK is still initializing. Please wait a moment and try again.',
            [{ text: 'OK' }],
          );
          return;
        }

        let sdkInput: {
          challengeId: string;
          userToken?: string;
          encryptionKey?: string;
        };

        if (usePaymasterGas) {
          // --- Paymaster Flow ---
          console.log('[PaymasterFlow] Getting sign permit challenge...');
          const challengeResult = await signPermitChallenge({
            walletId: selectedWallet.id,
            amount,
            blockchain: selectedWallet.blockchain,
            userToken,
            destinationAddress,
          });

          if (!challengeResult) {
            throw new Error('Failed to create signing challenge');
          }
          console.log('[PaymasterFlow] Got challengeId:', challengeResult.challengeId);
          sdkInput = challengeResult;
        } else {
          // --- Regular Flow (Deploy Wallet / Normal Transfer) ---
          console.log('[RegularFlow] Creating transaction for signing...');
          const txResult = await userControlledWalletService.createTransaction({
            walletId: selectedWallet.id,
            destinationAddress,
            amount,
            feeLevel,
            memo: memo || undefined,
          });
          console.log('[RegularFlow] Got challengeId:', txResult.challengeId);
          sdkInput = txResult;
        }

        // Use fresh tokens from API response if available
        const freshUserToken = sdkInput.userToken || userToken;
        const freshEncryptionKey = sdkInput.encryptionKey || encryptionKey;

        // Update SecureStore with fresh tokens
        if (sdkInput.userToken) {
          await SecureStore.setItemAsync('circle_user_token', sdkInput.userToken);
        }
        if (sdkInput.encryptionKey) {
          await SecureStore.setItemAsync('circle_encryption_key', sdkInput.encryptionKey);
        }

        // Execute challenge via Circle SDK WebView
        console.log('[CircleFlow] Executing challenge via WebView...');
        const sdkResult = await executeChallenge(freshUserToken, freshEncryptionKey, [
          sdkInput.challengeId,
        ]);

        console.log('[CircleFlow] SDK result:', sdkResult);

        if (sdkResult.result.resultType !== 'success') {
          throw new Error(sdkResult.result.error?.message || 'Signing failed');
        }

        if (usePaymasterGas) {
          // For Paymaster, we need to submit the UserOp after signing
          console.log('[PaymasterFlow] Submitting UserOperation...');
          const result = await submitUserOp({
            walletId: selectedWallet.id,
            destinationAddress,
            amount,
            blockchain: selectedWallet.blockchain,
            // For Paymaster, we use the challengeId as the permit signature reference
            permitSignature: sdkInput.challengeId,
            feeLevel,
            memo: memo || undefined,
          });

          if (result?.userOpHash) {
            router.replace(`/circle/paymaster-status?userOpHash=${result.userOpHash}` as any);
          } else {
            router.replace('/circle');
          }
        } else {
          // For Regular transfers, Circle handles submission after signing
          // Just show success
          // Wait a moment for backend to sync (optional, but good UX)
          router.replace('/circle');
          Alert.alert('Success', 'Transaction sent successfully!');
        }
      } else if (usePaymasterGas) {
        // Developer-controlled wallet Paymaster flow (no WebView needed)
        const permitData = await generatePermit({
          walletId: selectedWallet.id,
          amount,
          blockchain: selectedWallet.blockchain,
        });

        if (!permitData) {
          throw new Error('Failed to generate permit');
        }

        const result = await submitUserOp({
          walletId: selectedWallet.id,
          destinationAddress,
          amount,
          blockchain: selectedWallet.blockchain,
          permitSignature: permitData.typedData,
          feeLevel,
          memo: memo || undefined,
        });

        setShowPinModal(false);

        if (result?.userOpHash) {
          router.replace(`/circle/paymaster-status?userOpHash=${result.userOpHash}` as any);
        } else {
          router.replace('/circle');
        }
      } else {
        // Regular transfer (developer-controlled, native gas)
        const result = await transfer({
          walletId: selectedWallet.id,
          destinationAddress,
          amount,
          feeLevel,
          memo: memo || undefined,
        });
        setShowPinModal(false);

        if (result?.data?.transactionId) {
          console.log({ result });
          router.replace(`/circle/transaction-status?transactionId=${result.data.transactionId}`);
        } else {
          router.replace('/circle');
        }
      }
    } catch (error: any) {
      console.error('[PaymasterFlow] Error:', error);

      // Check for wallet not deployed error
      const errorMessage = error.message || '';
      const isWalletNotDeployed =
        errorMessage.includes('undeployed wallet') ||
        errorMessage.includes('Cannot generate a signature');

      if (isWalletNotDeployed) {
        Alert.alert(
          'Wallet Not Activated',
          'Your self-custody wallet needs to be activated before using gas-free transfers.\n\n' +
            'To activate:\n' +
            '1. Get some test ETH from a faucet\n' +
            '2. Make a small transfer first\n\n' +
            'After your first transfer, gas-free transactions will work!',
          [
            {
              text: 'Get Test ETH',
              onPress: () => {
                // Open Circle faucet
                Linking.openURL('https://faucet.circle.com/');
              },
            },
            { text: 'OK' },
          ],
        );
      } else {
        Alert.alert(
          'Transaction Failed',
          error.message || 'Failed to send transaction. Please try again.',
          [{ text: 'OK' }],
        );
      }
    } finally {
      // Reset loading state
      setIsSigningPermit(false);
    }
  };

  const canSubmit =
    selectedWallet &&
    destinationAddress &&
    addressValid &&
    amount &&
    parseFloat(amount) > 0 &&
    totalAmount <= parseFloat(currentBalance); // Check total amount (amount + fee)

  if (isLoadingWallets) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 justify-center items-center">
        <ActivityIndicator size="large" color="#2775CA" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-50 dark:bg-gray-900"
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScreenHeader title="Send USDC" subtitleText="Transfer to any address" />

      <ScrollView
        className="flex-1 p-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Source Wallet */}
        <Text variant="bodyMedium" weight="semibold" className="mb-2 dark:text-white">
          From Wallet
        </Text>
        <TouchableOpacity onPress={() => setShowWalletPicker(!showWalletPicker)}>
          {selectedWallet && (
            <CircleWalletCard wallet={selectedWallet} usdcBalance={currentBalance} isSelected />
          )}
        </TouchableOpacity>

        {showWalletPicker && (
          <Card variant="outlined" className="mb-4 p-2">
            {wallets?.map((wallet) => (
              <TouchableOpacity
                key={wallet.id}
                onPress={() => {
                  setSelectedWallet(wallet);
                  setShowWalletPicker(false);
                }}
                className="py-2"
              >
                <CircleWalletCard
                  wallet={wallet}
                  usdcBalance={getUsdcBalance(wallet.id)}
                  isSelected={selectedWallet?.id === wallet.id}
                />
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {/* Destination Address */}
        <Card variant="elevated" className="p-4 mb-4">
          <Text variant="bodyMedium" weight="semibold" className="mb-2 dark:text-white">
            Recipient Address
          </Text>
          <Input
            value={destinationAddress}
            onChangeText={setDestinationAddress}
            placeholder="0x... or blockchain address"
            autoCapitalize="none"
            autoCorrect={false}
            className="font-mono"
            multiline
            numberOfLines={2}
          />
          {addressValid === true && (
            <View className="flex-row items-center mt-2">
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text variant="caption" className="text-green-500 ml-1">
                Valid address
              </Text>
            </View>
          )}
          {addressValid === false && (
            <View className="flex-row items-center mt-2">
              <Ionicons name="close-circle" size={16} color="#EF4444" />
              <Text variant="caption" className="text-red-500 ml-1">
                Invalid address for this network
              </Text>
            </View>
          )}
        </Card>

        {/* Amount */}
        <Card variant="elevated" className="p-4 mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text variant="bodyMedium" weight="semibold" className="dark:text-white">
              Amount
            </Text>
            <TouchableOpacity onPress={handleMaxAmount}>
              <Text variant="caption" className="text-[#2775CA]">
                Max: ${currentBalance}
              </Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row items-center">
            <Text variant="h4" className="mr-2 dark:text-white">
              $
            </Text>
            <Input
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              className="flex-1 text-2xl font-bold"
            />
            <Text variant="bodyMedium" color="secondary" className="ml-2">
              USDC
            </Text>
          </View>
          {totalAmount > parseFloat(currentBalance) && (
            <Text variant="caption" className="text-red-500 mt-2">
              Insufficient balance. Need {totalAmount.toFixed(6)} USDC ({amount} +{' '}
              {serviceFee.toFixed(6)} fee), Available: {currentBalance} USDC
            </Text>
          )}
          {serviceFee > 0 && totalAmount <= parseFloat(currentBalance) && (
            <Text variant="caption" className="text-gray-600 dark:text-gray-400 mt-2">
              + {serviceFee.toFixed(6)} USDC service fee
            </Text>
          )}
        </Card>

        {/* Fee Level */}
        <Card variant="elevated" className="p-4 mb-4">
          <Text variant="bodyMedium" weight="semibold" className="mb-3 dark:text-white">
            Transaction Speed
          </Text>
          <View className="flex-row justify-between">
            {FEE_LEVELS.map((fee) => (
              <TouchableOpacity
                key={fee.level}
                onPress={() => setFeeLevel(fee.level)}
                className={`flex-1 mx-1 p-3 rounded-lg border ${
                  feeLevel === fee.level
                    ? 'border-[#2775CA] bg-[#2775CA]/10'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <Text
                  variant="caption"
                  weight="semibold"
                  align="center"
                  className={feeLevel === fee.level ? 'text-[#2775CA]' : 'dark:text-white'}
                >
                  {fee.label}
                </Text>
                <Text variant="caption" color="tertiary" align="center">
                  {fee.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {estimatedFee && (
            <View className="flex-row items-center justify-center mt-3">
              <Ionicons name="flash" size={14} color="#9CA3AF" />
              <Text variant="caption" color="secondary" className="ml-1">
                Est. gas fee: ${estimatedFee}
              </Text>
            </View>
          )}
        </Card>

        {/* Paymaster - Pay Gas in USDC */}
        {isPaymasterCompatible && (
          <Card variant="elevated" className="p-4 mb-4">
            <View className="flex-row justify-between items-center mb-2">
              <View className="flex-1">
                <Text variant="bodyMedium" weight="semibold" className="dark:text-white">
                  Pay Gas in USDC
                </Text>
                <Text variant="caption" color="secondary" className="mt-1">
                  Use USDC instead of {selectedWallet?.blockchain.split('-')[0]} for gas fees
                </Text>
              </View>
              <Switch
                value={usePaymasterGas}
                onValueChange={setUsePaymasterGas}
                trackColor={{ false: '#D1D5DB', true: '#2775CA' }}
                thumbColor={usePaymasterGas ? '#FFFFFF' : '#F3F4F6'}
              />
            </View>
            {usePaymasterGas && paymasterFeeUsdc && (
              <View className="flex-row items-center justify-center mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Ionicons name="wallet" size={14} color="#2775CA" />
                <Text variant="caption" className="text-[#2775CA] ml-1">
                  Gas fee: ${paymasterFeeUsdc} USDC
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Memo */}
        {/* <Card variant="elevated" className="p-4 mb-6">
          <Text variant="bodyMedium" weight="semibold" className="mb-2 dark:text-white">
            Memo (Optional)
          </Text>
          <Input
            value={memo}
            onChangeText={setMemo}
            placeholder="Add a note..."
            multiline
            numberOfLines={2}
          />
        </Card> */}

        {/* Summary */}
        {canSubmit && (
          <Card variant="filled" className="p-4 mb-6">
            <Text variant="bodyMedium" weight="semibold" className="mb-2 dark:text-white">
              Summary
            </Text>
            <View className="flex-row justify-between mb-1">
              <Text variant="body" color="secondary">
                Amount
              </Text>
              <Text variant="body" weight="semibold" className="dark:text-white">
                ${amount} USDC
              </Text>
            </View>
            {serviceFee > 0 && (
              <View className="flex-row justify-between mb-1">
                <Text variant="body" color="secondary">
                  Service Fee (0.5%)
                </Text>
                <Text variant="body" className="dark:text-white">
                  ${serviceFee.toFixed(6)} USDC
                </Text>
              </View>
            )}
            <View className="flex-row justify-between mb-1">
              <Text variant="body" color="secondary">
                Network Fee {usePaymasterGas && '(USDC)'}
              </Text>
              <Text
                variant="body"
                className={isSponsoredChain ? 'text-green-600 font-semibold' : 'dark:text-white'}
              >
                {isSponsoredChain
                  ? `⚡ ${chainMeta?.feeLabel || 'Free'}`
                  : `~$${usePaymasterGas ? paymasterFeeUsdc || '0.00' : estimatedFee || '0.00'}`}
              </Text>
            </View>
            <View className="border-t border-gray-200 dark:border-gray-700 my-2" />
            <View className="flex-row justify-between">
              <Text variant="body" color="secondary">
                Total
              </Text>
              <Text variant="bodyMedium" weight="bold" className="dark:text-white">
                ${totalAmount.toFixed(6)} USDC
              </Text>
            </View>
          </Card>
        )}

        {/* Send Button */}
        {(() => {
          const chainMeta = chainsData?.chains?.find(
            (c) => c.blockchain === selectedWallet?.blockchain,
          );
          const isSupported = !!chainMeta;

          return (
            <View>
              {!isSupported && selectedWallet && (
                <Text variant="caption" className="text-red-500 mb-2 text-center">
                  This blockchain is no longer supported for new transactions.
                </Text>
              )}
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onPress={handleReviewTransaction}
                disabled={!canSubmit || isTransferring || !isSupported}
                loading={isTransferring}
                className="bg-[#2775CA]"
              >
                Review & Send
              </Button>
            </View>
          );
        })()}
      </ScrollView>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        onConfirm={() => handleConfirmTransaction()}
        serviceType="USDC Transfer"
        details={[
          {
            label: 'Network',
            value: selectedWallet?.blockchain || '',
          },
          {
            label: 'To Address',
            value: `${destinationAddress.slice(0, 10)}...${destinationAddress.slice(-8)}`,
          },
          {
            label: 'Amount',
            value: `$${amount} USDC`,
            highlight: true,
          },
          ...(serviceFee > 0
            ? [
                {
                  label: 'Service Fee',
                  value: `$${serviceFee.toFixed(6)} USDC`,
                },
              ]
            : []),
          {
            label: 'Network Fee',
            value: isSponsoredChain ? '⚡ Free (Sponsored)' : `~$${estimatedFee || '0.00'}`,
          },
          ...(serviceFee > 0
            ? [
                {
                  label: 'Total',
                  value: `$${totalAmount.toFixed(6)} USDC`,
                  highlight: true,
                },
              ]
            : []),
          ...(memo
            ? [
                {
                  label: 'Memo',
                  value: memo,
                },
              ]
            : []),
        ]}
        amount={totalAmount || parseFloat(amount) || 0}
        currentBalance={parseFloat(currentBalance)}
        cashbackAvailable={0}
        cashbackToEarn={0}
        currencyType="USDC"
      />

      {/* PIN Modal */}
      <PINModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSubmit={handleSend}
        title="Enter PIN to Send"
        loading={isTransferring}
        subtitle={`Sending $${amount} USDC to ${destinationAddress.slice(0, 10)}...`}
      />

      {/* Paymaster Signing Loading Overlay */}
      {isSigningPermit && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <View className="items-center p-8 rounded-2xl bg-white dark:bg-gray-800 mx-8 shadow-lg">
            <ActivityIndicator size="large" color="#2775CA" />
            <Text variant="h5" weight="semibold" className="mt-4 text-center dark:text-white">
              Preparing Transaction
            </Text>
            <Text
              variant="bodyMedium"
              className="mt-2 text-center text-gray-500 dark:text-gray-400"
            >
              Please wait while we prepare your transaction for signing...
            </Text>
            <Text variant="caption" className="mt-4 text-center text-blue-600 dark:text-blue-400">
              Circle PIN will be required next
            </Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
