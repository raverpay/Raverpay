'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  CheckCircle,
  Clock,
  ArrowLeftRight,
  AlertCircle,
  XCircle,
  Wallet,
  User,
  LucideIcon,
} from 'lucide-react';
import { alchemyApi } from '@/lib/api/alchemy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import { useState } from 'react';
import Link from 'next/link';

const STATE_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

const STATE_ICONS: Record<string, LucideIcon> = {
  PENDING: Clock,
  SUBMITTED: ArrowLeftRight,
  CONFIRMED: AlertCircle,
  COMPLETED: CheckCircle,
  FAILED: XCircle,
};

const BLOCKCHAIN_COLORS: Record<string, string> = {
  BASE: 'bg-blue-100 text-blue-800',
  POLYGON: 'bg-purple-100 text-purple-800',
  ARBITRUM: 'bg-sky-100 text-sky-800',
};

export default function TransactionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const txId = params.id as string;
  const [copied, setCopied] = useState(false);

  const { data: transaction, isLoading } = useQuery({
    queryKey: ['alchemy-transaction', txId],
    queryFn: () => alchemyApi.getTransactionById(txId),
    enabled: !!txId,
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getBlockExplorerUrl = (blockchain: string, network: string, hash: string) => {
    const explorers: Record<string, string> = {
      'BASE-sepolia': `https://sepolia.basescan.org/tx/${hash}`,
      'BASE-mainnet': `https://basescan.org/tx/${hash}`,
      'POLYGON-amoy': `https://amoy.polygonscan.com/tx/${hash}`,
      'POLYGON-mainnet': `https://polygonscan.com/tx/${hash}`,
      'ARBITRUM-sepolia': `https://sepolia.arbiscan.io/tx/${hash}`,
      'ARBITRUM-mainnet': `https://arbiscan.io/tx/${hash}`,
    };
    return explorers[`${blockchain}-${network}`];
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <ArrowLeftRight className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Transaction not found</p>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const StateIcon = STATE_ICONS[transaction.state] || ArrowLeftRight;
  const explorerUrl = transaction.transactionHash
    ? getBlockExplorerUrl(transaction.blockchain, transaction.network, transaction.transactionHash)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight">Transaction Details</h2>
          <p className="text-muted-foreground">
            <code className="text-sm">{transaction.reference}</code>
          </p>
        </div>
        <Badge className={`${STATE_COLORS[transaction.state]} gap-1`}>
          <StateIcon className="h-3 w-3" />
          {transaction.state}
        </Badge>
      </div>

      {/* Transaction Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Transaction Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Reference */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Reference</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm bg-muted px-3 py-2 rounded flex-1">
                  {transaction.reference}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(transaction.reference)}
                >
                  {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <div className="mt-1">
                <Badge variant="outline">{transaction.type}</Badge>
              </div>
            </div>

            {/* Blockchain */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Blockchain</label>
              <div className="mt-1">
                <Badge variant="outline" className={BLOCKCHAIN_COLORS[transaction.blockchain]}>
                  {transaction.blockchain}
                </Badge>
                <span className="text-sm ml-2 text-muted-foreground">({transaction.network})</span>
              </div>
            </div>

            {/* Amount */}
            {transaction.amount && transaction.tokenSymbol && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Amount</label>
                <div className="mt-1">
                  <p className="text-lg font-semibold">
                    {parseFloat(transaction.amount).toFixed(4)} {transaction.tokenSymbol}
                  </p>
                </div>
              </div>
            )}

            {/* Source Address */}
            {transaction.sourceAddress && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">From</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm bg-muted px-3 py-2 rounded flex-1">
                    {transaction.sourceAddress}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(transaction.sourceAddress!)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Destination Address */}
            {transaction.destinationAddress && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">To</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm bg-muted px-3 py-2 rounded flex-1">
                    {transaction.destinationAddress}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(transaction.destinationAddress!)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Transaction Hash */}
            {transaction.transactionHash && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Transaction Hash
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm bg-muted px-3 py-2 rounded flex-1">
                    {transaction.transactionHash}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(transaction.transactionHash!)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  {explorerUrl && (
                    <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Block Number */}
            {transaction.blockNumber && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Block Number</label>
                <div className="mt-1 text-sm">{transaction.blockNumber.toString()}</div>
              </div>
            )}

            {/* Confirmations */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Confirmations</label>
              <div className="mt-1 text-sm">{transaction.confirmations}</div>
            </div>

            {/* Gas Used */}
            {transaction.gasUsed && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Gas Used</label>
                <div className="mt-1 text-sm">{transaction.gasUsed}</div>
              </div>
            )}

            {/* Created */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <div className="mt-1 text-sm">{formatDate(transaction.createdAt)}</div>
            </div>

            {/* Completed */}
            {transaction.completedAt && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Completed</label>
                <div className="mt-1 text-sm">{formatDate(transaction.completedAt)}</div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {transaction.errorMessage && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <label className="text-sm font-medium text-red-800">Error Message</label>
              <p className="text-sm text-red-700 mt-1">{transaction.errorMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Info Card */}
      {transaction.user && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <div className="mt-1 text-sm">
                  {transaction.user.firstName} {transaction.user.lastName}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="mt-1 text-sm">{transaction.user.email}</div>
              </div>
              <div className="md:col-span-2">
                <Link href={`/dashboard/users/${transaction.user.id}`}>
                  <Button variant="outline" size="sm">
                    View User Profile
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wallet Info Card */}
      {transaction.wallet && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Wallet Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Wallet Address</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm bg-muted px-3 py-2 rounded flex-1">
                    {transaction.wallet.address}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(transaction.wallet!.address)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Blockchain</label>
                <div className="mt-1">
                  <Badge
                    variant="outline"
                    className={BLOCKCHAIN_COLORS[transaction.wallet.blockchain]}
                  >
                    {transaction.wallet.blockchain}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Network</label>
                <div className="mt-1 text-sm">{transaction.wallet.network}</div>
              </div>
              <div className="md:col-span-2">
                <Link href={`/dashboard/alchemy/wallets/${transaction.wallet.id}`}>
                  <Button variant="outline" size="sm">
                    View Wallet Details
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
