'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Wallet,
  User,
  Copy,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
} from 'lucide-react';

import { circleApi } from '@/lib/api/circle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

const STATE_COLORS = {
  LIVE: 'bg-green-100 text-green-800',
  FROZEN: 'bg-red-100 text-red-800',
};

const BLOCKCHAIN_COLORS: Record<string, string> = {
  ETH: 'bg-blue-100 text-blue-800',
  'ETH-SEPOLIA': 'bg-blue-50 text-blue-600',
  MATIC: 'bg-purple-100 text-purple-800',
  'MATIC-AMOY': 'bg-purple-50 text-purple-600',
  ARB: 'bg-sky-100 text-sky-800',
  'ARB-SEPOLIA': 'bg-sky-50 text-sky-600',
  SOL: 'bg-gradient-to-r from-purple-100 to-green-100 text-purple-800',
  'SOL-DEVNET': 'bg-purple-50 text-purple-600',
  AVAX: 'bg-red-100 text-red-800',
  'AVAX-FUJI': 'bg-red-50 text-red-600',
};

const BLOCKCHAIN_EXPLORERS: Record<string, string> = {
  ETH: 'https://etherscan.io/address/',
  'ETH-SEPOLIA': 'https://sepolia.etherscan.io/address/',
  MATIC: 'https://polygonscan.com/address/',
  'MATIC-AMOY': 'https://amoy.polygonscan.com/address/',
  ARB: 'https://arbiscan.io/address/',
  'ARB-SEPOLIA': 'https://sepolia.arbiscan.io/address/',
  SOL: 'https://explorer.solana.com/address/',
  'SOL-DEVNET': 'https://explorer.solana.com/address/?cluster=devnet&address=',
  AVAX: 'https://snowtrace.io/address/',
  'AVAX-FUJI': 'https://testnet.snowtrace.io/address/',
};

const TX_STATE_COLORS = {
  INITIATED: 'bg-yellow-100 text-yellow-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  COMPLETE: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  DENIED: 'bg-red-100 text-red-800',
};

export default function WalletDetailsPage() {
  const params = useParams();
  const walletId = params.id as string;

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['circle-wallet', walletId],
    queryFn: () => circleApi.getWalletById(walletId),
    enabled: !!walletId,
  });

  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['circle-wallet-transactions', walletId],
    queryFn: () =>
      circleApi.getTransactions({
        page: 1,
        limit: 10,
        // We'll filter by wallet on the backend if needed, for now show user's transactions
        userId: wallet?.userId,
      }),
    enabled: !!wallet?.userId,
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (walletLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Wallet Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The wallet you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href="/dashboard/circle-wallets">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Wallets
          </Button>
        </Link>
      </div>
    );
  }

  const explorerUrl = `${BLOCKCHAIN_EXPLORERS[wallet.blockchain] || ''}${wallet.address}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/circle-wallets">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Wallet Details</h2>
            <p className="text-muted-foreground">Circle USDC Wallet</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={STATE_COLORS[wallet.state]}>{wallet.state}</Badge>
          <Badge variant="outline" className={BLOCKCHAIN_COLORS[wallet.blockchain]}>
            {wallet.blockchain}
          </Badge>
        </div>
      </div>

      {/* Main Wallet Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-blue-100">
                <Wallet className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>Wallet Information</CardTitle>
                <CardDescription>Developer-controlled USDC wallet</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Wallet Address */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Wallet Address</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-sm bg-muted px-3 py-2 rounded flex-1 font-mono">
                {wallet.address}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(wallet.address, 'Wallet address')}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="icon">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>

          {/* Wallet Details Grid */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Account Type</label>
              <div className="text-sm mt-1 font-medium">{wallet.accountType}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Custody Type</label>
              <div className="text-sm mt-1">{wallet.custodyType}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">State</label>
              <div className="mt-1">
                <Badge className={STATE_COLORS[wallet.state]}>{wallet.state}</Badge>
              </div>
            </div>
          </div>

          {/* IDs */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Circle Wallet ID</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                  {wallet.circleWalletId}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => copyToClipboard(wallet.circleWalletId, 'Circle wallet ID')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Wallet Set ID</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                  {wallet.walletSetId}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => copyToClipboard(wallet.walletSetId, 'Wallet set ID')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created At</label>
              <div className="text-sm mt-1">{formatDate(wallet.createdAt)}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
              <div className="text-sm mt-1">{formatDate(wallet.updatedAt)}</div>
            </div>
          </div>

          {/* Optional Fields */}
          {wallet.name && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Wallet Name</label>
              <div className="text-sm mt-1">{wallet.name}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Information */}
      {wallet.user && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Wallet Owner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <div className="text-sm mt-1">
                  {wallet.user.firstName} {wallet.user.lastName}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="text-sm mt-1">{wallet.user.email}</div>
              </div>
            </div>
            {wallet.user.phone && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <div className="text-sm mt-1">{wallet.user.phone}</div>
              </div>
            )}
            <Link href={`/dashboard/users/${wallet.userId}`}>
              <Button variant="outline" className="w-full mt-2">
                View Full User Profile
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Transaction Statistics */}
      {wallet._count && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Transaction Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{wallet._count.transactions}</div>
            <p className="text-sm text-muted-foreground mt-1">Total Transactions</p>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest transactions from this wallet</CardDescription>
            </div>
            <Link href={`/dashboard/circle-wallets/transactions?userId=${wallet.userId}`}>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : transactionsData?.data && transactionsData.data.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionsData.data.slice(0, 5).map((tx) => {
                    const isInbound = tx.type === 'INBOUND';
                    const totalAmount = tx.amounts.reduce(
                      (sum, amt) => sum + parseFloat(amt || '0'),
                      0,
                    );

                    return (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isInbound ? (
                              <ArrowDownLeft className="h-4 w-4 text-green-600" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4 text-red-600" />
                            )}
                            <span className="text-sm">{isInbound ? 'Received' : 'Sent'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-mono text-sm ${isInbound ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {isInbound ? '+' : '-'}${totalAmount.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={TX_STATE_COLORS[tx.state]}>{tx.state}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(tx.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/dashboard/circle-wallets/transactions/${tx.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
