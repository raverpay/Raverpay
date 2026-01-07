// app/crypto/convert.tsx
import { Button, Card, Input, PINModal, ScreenHeader, Text } from '@/src/components/ui';
import { useConvertCrypto, useCryptoWallet } from '@/src/hooks/useCryptoWallet';
import { toast } from '@/src/lib/utils/toast';
import { cryptoService } from '@/src/services/crypto.service';
import { ConversionQuote, TokenSymbol } from '@/src/types/crypto.types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';

import { useTheme } from '@/src/hooks/useTheme';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const TOKENS: TokenSymbol[] = ['USDT', 'USDC'];

export default function ConvertCryptoScreen() {
  const { isDark } = useTheme();
  const { data: wallet } = useCryptoWallet();
  const { mutateAsync: convertToNaira } = useConvertCrypto();
  const balances = wallet?.balances || [];

  const [selectedToken, setSelectedToken] = useState<TokenSymbol>('USDT');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<ConversionQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  const selectedBalance = balances.find((b) => b.tokenSymbol === selectedToken);
  const insets = useSafeAreaInsets();
  // Get quote when amount changes
  useEffect(() => {
    const getQuote = async () => {
      if (!amount || parseFloat(amount) <= 0) {
        setQuote(null);
        return;
      }

      try {
        setIsLoadingQuote(true);
        const quoteData = await cryptoService.getConversionQuote({
          tokenSymbol: selectedToken,
          cryptoAmount: amount,
        });
        setQuote(quoteData);
      } catch {
        setQuote(null);
      } finally {
        setIsLoadingQuote(false);
      }
    };

    // Debounce
    const timer = setTimeout(getQuote, 500);
    return () => clearTimeout(timer);
  }, [amount, selectedToken]);

  const handleConvert = () => {
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      toast.error({
        title: 'Invalid Amount',
        message: 'Please enter a valid amount',
      });
      return;
    }

    if (selectedBalance && parseFloat(amount) > parseFloat(selectedBalance.balance)) {
      toast.error({
        title: 'Insufficient Balance',
        message: "You don't have enough balance for this conversion",
      });
      return;
    }

    if (!quote) {
      toast.error({
        title: 'Quote Error',
        message: 'Unable to get conversion quote. Please try again.',
      });
      return;
    }

    setShowPinModal(true);
  };

  const handlePinSubmit = async (pin: string) => {
    try {
      await convertToNaira({
        tokenSymbol: selectedToken,
        cryptoAmount: amount,
        pin,
      });

      toast.success({
        title: 'Conversion Successful',
        message: `₦${quote?.netAmount || '0'} has been added to your wallet`,
      });
      setShowPinModal(false);
      router.back();
    } catch {
      // Error handled in hook
      setShowPinModal(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <ScreenHeader title="Convert to Naira" />

      <ScrollView
        className=""
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
          paddingVertical: 16,
        }}
      >
        <View className="px-4">
          {/* Token Selection */}
          <Text variant="h7" weight="semibold" className="mb-2">
            Select Token
          </Text>
          <View className="flex-row mb-6 gap-2">
            {TOKENS.map((token) => (
              <Button
                key={token}
                variant={selectedToken === token ? 'primary' : 'outline'}
                size="md"
                onPress={() => setSelectedToken(token)}
                className="flex-1"
              >
                {token}
              </Button>
            ))}
          </View>

          {/* Available Balance */}
          {selectedBalance && (
            <Card variant="filled" className="p-4 mb-6">
              <Text variant="caption" color="secondary" className="mb-1">
                Available Balance
              </Text>
              <Text variant="h4" weight="bold">
                {parseFloat(selectedBalance.balance).toFixed(4)} {selectedToken}
              </Text>
              <Text variant="caption" color="secondary">
                ≈ ${parseFloat(selectedBalance.usdValue).toFixed(2)}
              </Text>
            </Card>
          )}

          {/* Amount */}
          <Input
            label="Amount to Convert"
            placeholder="0.00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            leftIcon="cash-outline"
            rightIcon="checkmark-circle-outline"
          />
          <View className="mb-6">
            <Text variant="caption" color="secondary">
              {selectedToken}
            </Text>
          </View>

          {/* Conversion Preview */}
          {isLoadingQuote && (
            <Card variant="elevated" className="p-6 mb-6 items-center">
              <ActivityIndicator size="small" color="#5B55F6" />
              <Text variant="body" color="secondary" className="mt-2">
                Getting quote...
              </Text>
            </Card>
          )}

          {quote && !isLoadingQuote && (
            <Card variant="elevated" className="p-6 mb-6">
              <Text variant="h6" weight="bold" className="mb-4">
                Conversion Details
              </Text>

              <View className="flex-row justify-between mb-3">
                <Text variant="body" color="secondary">
                  USD Value
                </Text>
                <Text variant="body" weight="semibold">
                  ${quote.usdValue}
                </Text>
              </View>

              <View className="flex-row justify-between mb-3">
                <Text variant="body" color="secondary">
                  Exchange Rate
                </Text>
                <Text variant="body" weight="semibold">
                  ₦{quote.exchangeRate}
                </Text>
              </View>

              <View className="flex-row justify-between mb-3">
                <Text variant="body" color="secondary">
                  Naira Amount
                </Text>
                <Text variant="body" weight="semibold">
                  ₦{quote.nairaAmount}
                </Text>
              </View>

              <View className="flex-row justify-between mb-3">
                <Text variant="body" color="secondary">
                  Fee ({quote.feePercentage}%)
                </Text>
                <Text variant="body" weight="semibold" color="error">
                  -₦{quote.fee}
                </Text>
              </View>

              <View className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                <View className="flex-row justify-between">
                  <Text variant="h6" weight="bold">
                    You&apos;ll Receive
                  </Text>
                  <Text variant="h6" weight="bold" color="success">
                    ₦{quote.netAmount}
                  </Text>
                </View>
              </View>

              <Text variant="caption" color="tertiary" className="mt-3">
                Quote expires in 5 minutes
              </Text>
            </Card>
          )}

          {/* Convert Button */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleConvert}
            disabled={!amount || !quote}
          >
            Convert to Naira
          </Button>

          {/* Notice */}
          <Card variant="filled" className="p-4 mt-6 bg-green-50">
            <View className="flex-row items-start">
              <Ionicons name="information-circle-outline" size={20} color="#10B981" />
              <Text variant="caption" color="secondary" className="ml-2 flex-1">
                Converted Naira will be instantly added to your main wallet
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>

      <PINModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSubmit={handlePinSubmit}
        title="Confirm Conversion"
        subtitle={`Enter your 6-digit crypto PIN to convert ${amount} ${selectedToken} to ₦${quote?.netAmount || '0'}`}
        pinLength={6}
      />
    </View>
  );
}
