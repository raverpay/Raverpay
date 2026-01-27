'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Wallet,
  Copy,
  ExternalLink,
  Shield,
  Zap,
  Activity,
  CheckCircle,
} from 'lucide-react';
import { alchemyApi } from '@/lib/api/alchemy';
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
import { useState } from 'react';

const BLOCKCHAIN_COLORS: Record<string, string> = {
  BASE: 'bg-blue-100 text-blue-800',
  POLYGON: 'bg-purple-100 text-purple-800',
  ARBITRUM: 'bg-sky-100 text-sky-800',
};

const STATE_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  COMPROMISED: 'bg-red-100 text-red-800',
  FROZEN: 'bg-gray-100 text-gray-800',
};

const TX_STATE_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

export default function WalletDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const walletId = params.id as string;
  const [copied, setCopied] = useState(false);

  const { data: wallet, isLoading } = useQuery({
    queryKey: ['alchemy-wallet', walletId],
    queryFn: () => alchemyApi.getWalletById(walletId),
    enabled: !!walletId,
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getBlockExplorerUrl = (blockchain: string, network: string, address: string) => {
    const explorers: Record<string, string> = {
      'BASE-sepolia': `https://sepolia.basescan.org/address/${address}`,
      'BASE-mainnet': `https://basescan.org/address/${address}`,
      'POLYGON-amoy': `https://amoy.polygonscan.com/address/${address}`,
      'POLYGON-mainnet': `https://polygonscan.com/address/${address}`,
      'ARBITRUM-sepolia': `https://sepolia.arbiscan.io/address/${address}`,
      'ARBITRUM-mainnet': `https://arbiscan.io/address/${address}`,
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

  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Wallet not found</p>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const explorerUrl = getBlockExplorerUrl(wallet.blockchain, wallet.network, wallet.address);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight">Wallet Details</h2>
          <p className="text-muted-foreground">{wallet.name || 'Unnamed Wallet'}</p>
        </div>
        <Badge className={STATE_COLORS[wallet.state]}>{wallet.state}</Badge>
      </div>

      {/* Wallet Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Address */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Address</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm bg-muted px-3 py-2 rounded flex-1">{wallet.address}</code>
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(wallet.address)}>
                  {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
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

            {/* Blockchain */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Blockchain</label>
              <div className="mt-1">
                <Badge variant="outline" className={BLOCKCHAIN_COLORS[wallet.blockchain]}>
                  {wallet.blockchain}
                </Badge>
                <span className="text-sm ml-2 text-muted-foreground">({wallet.network})</span>
              </div>
            </div>

            {/* Account Type */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Account Type</label>
              <div className="mt-1">
                <Badge
                  variant="outline"
                  className={
                    wallet.accountType === 'SMART_CONTRACT'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }
                >
                  {wallet.accountType === 'SMART_CONTRACT' ? (
                    <>
                      <Zap className="h-3 w-3 mr-1" />
                      Smart Contract
                    </>
                  ) : (
                    'EOA'
                  )}
                </Badge>
              </div>
            </div>

            {/* Gas Sponsored */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Gas Sponsorship</label>
              <div className="mt-1">
                {wallet.isGasSponsored ? (
                  <Badge className="bg-green-100 text-green-800">
                    <Zap className="h-3 w-3 mr-1" />
                    Enabled
                  </Badge>
                ) : (
                  <Badge variant="outline">Disabled</Badge>
                )}
              </div>
            </div>

            {/* Created */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <div className="mt-1 text-sm">{formatDate(wallet.createdAt)}</div>
            </div>

            {/* Updated */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
              <div className="mt-1 text-sm">{formatDate(wallet.updatedAt)}</div>
            </div>
          </div>

          {/* Gas Policy ID */}
          {wallet.gasPolicyId && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Gas Policy ID</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm bg-muted px-3 py-2 rounded flex-1">
                  {wallet.gasPolicyId}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(wallet.gasPolicyId!)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Info Card */}
      {wallet.user && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Owner Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <div className="mt-1 text-sm">
                  {wallet.user.firstName} {wallet.user.lastName}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="mt-1 text-sm">{wallet.user.email}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">User ID</label>
                <div className="mt-1">
                  <code className="text-xs bg-muted px-2 py-1 rounded">{wallet.user.id}</code>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      {wallet.alchemyTransactions && wallet.alchemyTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
            <CardDescription>Last 10 transactions for this wallet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wallet.alchemyTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{tx.reference}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{tx.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={TX_STATE_COLORS[tx.state]}>{tx.state}</Badge>
                      </TableCell>
                      <TableCell>
                        {tx.amount && tx.tokenSymbol ? (
                          <div>
                            <p className="text-sm font-medium">
                              {parseFloat(tx.amount).toFixed(4)}
                            </p>
                            <p className="text-xs text-muted-foreground">{tx.tokenSymbol}</p>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(tx.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
