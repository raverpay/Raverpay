'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';

import { circleApi, CircleTransactionState } from '@/lib/api/circle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, truncateAddress } from '@/lib/utils';
import { toast } from 'sonner';

const STATE_COLORS: Record<CircleTransactionState, string> = {
  INITIATED: 'bg-yellow-100 text-yellow-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  COMPLETE: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  DENIED: 'bg-red-100 text-red-800',
};

const STATE_ICONS: Record<CircleTransactionState, React.ReactNode> = {
  INITIATED: <Clock className="h-5 w-5 text-yellow-600" />,
  PENDING: <Clock className="h-5 w-5 text-yellow-600" />,
  CONFIRMED: <CheckCircle2 className="h-5 w-5 text-blue-600" />,
  COMPLETE: <CheckCircle2 className="h-5 w-5 text-green-600" />,
  FAILED: <XCircle className="h-5 w-5 text-red-600" />,
  CANCELLED: <XCircle className="h-5 w-5 text-gray-600" />,
  DENIED: <XCircle className="h-5 w-5 text-red-600" />,
};

const BLOCKCHAIN_EXPLORERS: Record<string, string> = {
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

export default function TransactionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const transactionId = params.id as string;

  const { data: transaction, isLoading } = useQuery({
    queryKey: ['circle-transaction', transactionId],
    queryFn: () => circleApi.getTransactionById(transactionId),
    enabled: !!transactionId,
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Transaction Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The transaction you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href="/dashboard/circle-wallets/transactions">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Transactions
          </Button>
        </Link>
      </div>
    );
  }

  const isInbound = transaction.type === 'INBOUND';
  const totalAmount = transaction.amounts.reduce((sum, amt) => sum + parseFloat(amt || '0'), 0);
  const explorerUrl = transaction.transactionHash
    ? `${BLOCKCHAIN_EXPLORERS[transaction.blockchain] || ''}${transaction.transactionHash}`
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/circle-wallets/transactions">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Transaction Details</h2>
            <p className="text-muted-foreground">
              {isInbound ? 'Received' : 'Sent'} USDC Transaction
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {STATE_ICONS[transaction.state]}
          <Badge className={STATE_COLORS[transaction.state]}>{transaction.state}</Badge>
        </div>
      </div>

      {/* Main Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isInbound ? (
                <div className="p-3 rounded-full bg-green-100">
                  <ArrowDownLeft className="h-6 w-6 text-green-600" />
                </div>
              ) : (
                <div className="p-3 rounded-full bg-red-100">
                  <ArrowUpRight className="h-6 w-6 text-red-600" />
                </div>
              )}
              <div>
                <CardTitle className="text-2xl">
                  <span className={isInbound ? 'text-green-600' : 'text-red-600'}>
                    {isInbound ? '+' : '-'}${totalAmount.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground text-lg ml-2">USDC</span>
                </CardTitle>
                <CardDescription>{isInbound ? 'Received from' : 'Sent to'}</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Transaction ID */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Transaction Reference
            </label>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-sm bg-muted px-3 py-2 rounded flex-1">
                {transaction.reference || transaction.circleTransactionId}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  copyToClipboard(
                    transaction.reference || transaction.circleTransactionId,
                    'Reference',
                  )
                }
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Addresses */}
          <div className="grid md:grid-cols-2 gap-4">
            {transaction.sourceAddress && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">From Address</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm bg-muted px-3 py-2 rounded flex-1 truncate">
                    {transaction.sourceAddress}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(transaction.sourceAddress!, 'Source address')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">To Address</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm bg-muted px-3 py-2 rounded flex-1 truncate">
                  {transaction.destinationAddress}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    copyToClipboard(transaction.destinationAddress, 'Destination address')
                  }
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Blockchain & Transaction Hash */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Network</label>
              <div className="mt-1">
                <Badge variant="outline" className="text-sm">
                  {transaction.blockchain}
                </Badge>
              </div>
            </div>
            {transaction.transactionHash && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Transaction Hash
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm bg-muted px-3 py-2 rounded flex-1 truncate">
                    {transaction.transactionHash}
                  </code>
                  {explorerUrl && (
                    <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="icon">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Amounts (if multiple) */}
          {transaction.amounts.length > 1 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Batch Transfer Amounts
              </label>
              <div className="mt-1 space-y-1">
                {transaction.amounts.map((amount, index) => (
                  <div key={index} className="text-sm bg-muted px-3 py-2 rounded">
                    Transfer {index + 1}: ${parseFloat(amount).toFixed(2)} USDC
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fees */}
          {transaction.networkFee && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Network Fee</label>
                <div className="text-sm mt-1">{transaction.networkFee}</div>
              </div>
              {transaction.networkFeeUsd && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Fee (USD)</label>
                  <div className="text-sm mt-1">${transaction.networkFeeUsd}</div>
                </div>
              )}
            </div>
          )}

          {/* Timestamps */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created At</label>
              <div className="text-sm mt-1">{formatDate(transaction.createdAt)}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
              <div className="text-sm mt-1">{formatDate(transaction.updatedAt)}</div>
            </div>
          </div>

          {/* Error Info */}
          {transaction.errorReason && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <label className="text-sm font-medium text-red-800">Error</label>
              <div className="text-sm text-red-700 mt-1">{transaction.errorReason}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User & Wallet Info */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* User Card */}
        {transaction.user && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <div className="text-sm mt-1">
                  {transaction.user.firstName} {transaction.user.lastName}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="text-sm mt-1">{transaction.user.email}</div>
              </div>
              <Link href={`/dashboard/users/${transaction.userId}`}>
                <Button variant="outline" className="w-full mt-2">
                  View User Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Wallet Card */}
        {transaction.wallet && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Wallet Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Address</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                    {transaction.wallet.address}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => copyToClipboard(transaction.wallet!.address, 'Wallet address')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Type</label>
                <div className="text-sm mt-1">{transaction.wallet.accountType}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">State</label>
                <div className="mt-1">
                  <Badge variant="outline">{transaction.wallet.state}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
