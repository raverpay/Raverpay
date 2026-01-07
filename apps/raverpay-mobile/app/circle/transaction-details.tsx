// app/circle/transaction-details.tsx
import { Button, Card, ScreenHeader, Text } from '@/src/components/ui';
import {
  useAccelerateTransaction,
  useCancelTransaction,
  useCCTPTransfer_Single,
  useCircleTransaction,
} from '@/src/hooks/useCircleWallet';
import { useTheme } from '@/src/hooks/useTheme';
import { toast } from '@/src/lib/utils/toast';
import {
  CCTPTransferState,
  CircleBlockchain,
  CircleTransactionState,
} from '@/src/types/circle.types';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Linking, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STATE_INFO: Record<
  CircleTransactionState,
  { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  INITIATED: { label: 'Initiated', color: '#F59E0B', icon: 'time' },
  QUEUED: { label: 'Queued', color: '#F59E0B', icon: 'hourglass' },
  SENT: { label: 'Sent', color: '#3B82F6', icon: 'paper-plane' },
  CONFIRMED: { label: 'Confirmed', color: '#3B82F6', icon: 'checkmark-circle' },
  COMPLETE: {
    label: 'Complete',
    color: '#10B981',
    icon: 'checkmark-done-circle',
  },
  FAILED: { label: 'Failed', color: '#EF4444', icon: 'close-circle' },
  CANCELLED: { label: 'Cancelled', color: '#6B7280', icon: 'ban' },
  DENIED: { label: 'Denied', color: '#EF4444', icon: 'hand-left' },
  PENDING: { label: 'Pending', color: '#F59E0B', icon: 'hourglass' },
  STUCK: { label: 'Stuck', color: '#F59E0B', icon: 'alert-circle' },
  CLEARED: { label: 'Cleared', color: '#3B82F6', icon: 'checkmark-circle' },
};

const CCTP_STATE_INFO: Record<
  CCTPTransferState,
  { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  INITIATED: { label: 'Initiated', color: '#F59E0B', icon: 'time' },
  BURN_PENDING: { label: 'Burning', color: '#F59E0B', icon: 'flame' },
  BURN_COMPLETE: { label: 'Burned', color: '#3B82F6', icon: 'checkmark-circle' },
  ATTESTATION_PENDING: {
    label: 'Verifying',
    color: '#3B82F6',
    icon: 'shield-checkmark',
  },
  ATTESTATION_COMPLETE: {
    label: 'Verified',
    color: '#3B82F6',
    icon: 'shield-checkmark',
  },
  MINT_PENDING: { label: 'Minting', color: '#3B82F6', icon: 'download' },
  COMPLETE: {
    label: 'Bridged',
    color: '#10B981',
    icon: 'checkmark-done-circle',
  },
  FAILED: { label: 'Failed', color: '#EF4444', icon: 'close-circle' },
  CANCELLED: { label: 'Cancelled', color: '#6B7280', icon: 'ban' },
};

const BLOCKCHAIN_EXPLORERS: Record<CircleBlockchain, string> = {
  ETH: 'https://etherscan.io/tx/',
  'ETH-SEPOLIA': 'https://sepolia.etherscan.io/tx/',
  MATIC: 'https://polygonscan.com/tx/',
  'MATIC-AMOY': 'https://amoy.polygonscan.com/tx/',
  ARB: 'https://arbiscan.io/tx/',
  'ARB-SEPOLIA': 'https://sepolia.arbiscan.io/tx/',
  SOL: 'https://explorer.solana.com/tx/',
  'SOL-DEVNET': 'https://explorer.solana.com/tx/?cluster=devnet&tx=',
  AVAX: 'https://snowtrace.io/tx/',
  'AVAX-FUJI': 'https://testnet.snowtrace.io/tx/',
};

export default function CircleTransactionDetailsScreen() {
  const { isDark } = useTheme();
  const { id, type } = useLocalSearchParams<{ id: string; type?: string }>();
  const insets = useSafeAreaInsets();
  const isCCTP = type === 'CCTP';

  const {
    data: circleTx,
    isLoading: isLoadingTx,
    refetch: refetchTx,
  } = useCircleTransaction(id || '', { enabled: !isCCTP });

  const {
    data: cctpTx,
    isLoading: isLoadingCCTP,
    refetch: refetchCCTP,
  } = useCCTPTransfer_Single(id || '', { enabled: isCCTP });

  const transaction = isCCTP ? cctpTx : circleTx;
  const isLoading = isCCTP ? isLoadingCCTP : isLoadingTx;
  const refetch = isCCTP ? refetchCCTP : refetchTx;

  const { mutateAsync: cancelTx, isPending: isCancelling } = useCancelTransaction();
  const { mutateAsync: accelerateTx, isPending: isAccelerating } = useAccelerateTransaction();

  const handleCopy = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    toast.success({
      title: 'Copied',
      message: `${label} copied to clipboard`,
    });
  };

  const handleViewExplorer = (txHash?: string, blockchain?: CircleBlockchain) => {
    if (txHash && blockchain) {
      const explorerUrl = BLOCKCHAIN_EXPLORERS[blockchain];
      if (explorerUrl) {
        Linking.openURL(`${explorerUrl}${txHash}`);
      }
    }
  };

  const handleCancel = async () => {
    if (transaction && !isCCTP) {
      try {
        await cancelTx(transaction.id);
        refetch();
      } catch {
        // Error handled in hook
      }
    }
  };

  const handleAccelerate = async () => {
    if (transaction && !isCCTP) {
      try {
        await accelerateTx(transaction.id);
        refetch();
      } catch {
        // Error handled in hook
      }
    }
  };

  if (isLoading || !transaction) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 justify-center items-center">
        <ActivityIndicator size="large" color="#2775CA" />
      </View>
    );
  }

  const stateInfo = isCCTP
    ? CCTP_STATE_INFO[transaction.state as CCTPTransferState]
    : STATE_INFO[transaction.state as CircleTransactionState];

  const isInbound = !isCCTP && (transaction as any).type === 'INBOUND';
  // CCTP is always outbound from source perspective, but effectively a transfer.

  const canCancel = !isCCTP && ['INITIATED', 'PENDING'].includes(transaction.state as string);
  const canAccelerate = !isCCTP && (transaction.state as string) === 'PENDING';

  // Normalize fields
  const amount = isCCTP ? (transaction as any).amount : (transaction as any).amounts?.[0] || '0';
  const blockchain = isCCTP
    ? (transaction as any).destinationChain
    : (transaction as any).blockchain;
  const sourceAddress = isCCTP ? null : (transaction as any).sourceAddress; // CCTP object in types doesn't show sourceAddress explicitly in the interface I saw earlier, checking types again...
  // CCTPTransfer interface: sourceWalletId, destinationAddress, sourceChain, destinationChain, amount.
  // It doesn't seem to have sourceAddress string.

  const destinationAddress = transaction.destinationAddress;
  const txHash = isCCTP
    ? (transaction as any).mintTxHash || (transaction as any).burnTxHash
    : (transaction as any).transactionHash;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScreenHeader title={isCCTP ? 'Bridge Details' : 'Transaction Details'} />

      <ScrollView
        className="flex-1 p-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 50 }}
      >
        {/* Status Header */}
        <Card variant="elevated" className="p-6 mb-6 items-center">
          <View
            className="w-16 h-16 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: stateInfo?.color ? stateInfo.color + '20' : '#E5E7EB' }}
          >
            <Ionicons
              name={stateInfo?.icon || 'help'}
              size={32}
              color={stateInfo?.color || '#9CA3AF'}
            />
          </View>
          <Text variant="h4" weight="bold" className="mb-2 dark:text-white">
            {isInbound ? '+' : isCCTP ? '' : '-'}${parseFloat(amount).toFixed(2)} USDC
          </Text>
          <View className="flex-row items-center">
            <View
              className="w-2 h-2 rounded-full mr-2"
              style={{ backgroundColor: stateInfo?.color || '#9CA3AF' }}
            />
            <Text style={{ color: stateInfo?.color || '#9CA3AF' }} className="font-medium">
              {stateInfo?.label || transaction.state}
            </Text>
          </View>
        </Card>

        {/* Transaction Details */}
        <Card variant="elevated" className="p-4 mb-4">
          <Text variant="h6" weight="semibold" className="mb-4 dark:text-white">
            Details
          </Text>

          <DetailRow
            label="Type"
            value={isCCTP ? 'Bridge Transfer' : isInbound ? 'Received' : 'Sent'}
            icon={isCCTP ? 'git-compare' : isInbound ? 'arrow-down' : 'arrow-up'}
          />
          <DetailRow label="Token" value="USDC" />
          <DetailRow label="Network" value={blockchain} />
          {!isCCTP &&
            (transaction as any).serviceFee &&
            parseFloat((transaction as any).serviceFee) > 0 && (
              <DetailRow
                label="Service Fee"
                value={`$${parseFloat((transaction as any).serviceFee).toFixed(6)} USDC`}
                icon={(transaction as any).feeCollected ? 'checkmark-circle' : 'alert-circle'}
              />
            )}
          {!isCCTP &&
            (transaction as any).totalAmount &&
            parseFloat((transaction as any).totalAmount) > 0 && (
              <DetailRow
                label="Total Deducted"
                value={`$${parseFloat((transaction as any).totalAmount).toFixed(2)} USDC`}
              />
            )}
          <DetailRow label="Date" value={new Date(transaction.createdAt).toLocaleString()} />
          {isCCTP && <DetailRow label="From Network" value={(transaction as any).sourceChain} />}
        </Card>

        {/* Addresses */}
        <Card variant="elevated" className="p-4 mb-4">
          <Text variant="h6" weight="semibold" className="mb-4 dark:text-white">
            Addresses
          </Text>

          {sourceAddress && (
            <TouchableOpacity
              onPress={() => handleCopy(sourceAddress, 'Source address')}
              className="mb-4"
            >
              <Text variant="caption" color="secondary" className="mb-1">
                From
              </Text>
              <View className="flex-row items-center justify-between bg-gray-100 dark:bg-gray-800 p-2 rounded">
                <Text variant="caption" className="font-mono flex-1 dark:text-white">
                  {sourceAddress}
                </Text>
                <Ionicons name="copy-outline" size={16} color="#2775CA" />
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => handleCopy(destinationAddress, 'Destination address')}>
            <Text variant="caption" color="secondary" className="mb-1">
              To
            </Text>
            <View className="flex-row items-center justify-between bg-gray-100 dark:bg-gray-800 p-2 rounded">
              <Text variant="caption" className="font-mono flex-1 dark:text-white">
                {destinationAddress}
              </Text>
              <Ionicons name="copy-outline" size={16} color="#2775CA" />
            </View>
          </TouchableOpacity>
        </Card>

        {/* Transaction Hash */}
        {txHash && (
          <Card variant="elevated" className="p-4 mb-4">
            <Text variant="h6" weight="semibold" className="mb-4 dark:text-white">
              Blockchain Info
            </Text>

            <TouchableOpacity
              onPress={() => handleCopy(txHash, 'Transaction hash')}
              className="mb-4"
            >
              <Text variant="caption" color="secondary" className="mb-1">
                {isCCTP
                  ? (transaction as any).mintTxHash
                    ? 'Mint Hash'
                    : 'Burn Hash'
                  : 'Transaction Hash'}
              </Text>
              <View className="flex-row items-center justify-between bg-gray-100 dark:bg-gray-800 p-2 rounded">
                <Text
                  variant="caption"
                  className="font-mono flex-1 dark:text-white"
                  numberOfLines={1}
                >
                  {txHash}
                </Text>
                <Ionicons name="copy-outline" size={16} color="#2775CA" />
              </View>
            </TouchableOpacity>

            {!isCCTP && (transaction as any).networkFee && (
              <DetailRow label="Network Fee" value={`$${(transaction as any).networkFee}`} />
            )}
            {!isCCTP && (transaction as any).gasUsed && (
              <DetailRow label="Gas Used" value={(transaction as any).gasUsed} />
            )}
            {isCCTP && (transaction as any).totalFee && (
              <DetailRow label="Bridge Fee" value={`$${(transaction as any).totalFee}`} />
            )}

            <Button
              variant="outline"
              size="sm"
              fullWidth
              onPress={() => handleViewExplorer(txHash, blockchain)}
              icon={<Ionicons name="open-outline" size={16} color="#2775CA" />}
              className="mt-2"
            >
              View on Explorer
            </Button>
          </Card>
        )}

        {/* Memo */}
        {!isCCTP && (transaction as any).memo && (
          <Card variant="elevated" className="p-4 mb-4">
            <Text variant="h6" weight="semibold" className="mb-2 dark:text-white">
              Memo
            </Text>
            <Text variant="body" color="secondary">
              {(transaction as any).memo}
            </Text>
          </Card>
        )}

        {/* Actions */}
        {(canCancel || canAccelerate) && (
          <Card variant="filled" className="p-4 mb-4">
            <Text variant="bodyMedium" weight="semibold" className="mb-3 dark:text-white">
              Actions
            </Text>
            <View className="flex-row">
              {canAccelerate && (
                <Button
                  variant="outline"
                  size="sm"
                  onPress={handleAccelerate}
                  loading={isAccelerating}
                  disabled={isAccelerating || isCancelling}
                  className="flex-1 mr-2"
                  icon={<Ionicons name="flash" size={16} color="#2775CA" />}
                >
                  Speed Up
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  onPress={handleCancel}
                  loading={isCancelling}
                  disabled={isAccelerating || isCancelling}
                  className="flex-1 ml-2"
                  icon={<Ionicons name="close-circle" size={16} color="#EF4444" />}
                >
                  Cancel
                </Button>
              )}
            </View>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

// Helper component for detail rows
function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View className="flex-row justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
      <Text variant="body" color="secondary">
        {label}
      </Text>
      <View className="flex-row items-center">
        {icon && <Ionicons name={icon} size={16} color="#9CA3AF" className="mr-1" />}
        <Text variant="body" weight="medium" className="dark:text-white">
          {value}
        </Text>
      </View>
    </View>
  );
}
