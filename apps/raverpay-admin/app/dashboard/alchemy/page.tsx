'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Wallet, ArrowLeftRight, Activity, Zap, DollarSign, TrendingUp } from 'lucide-react';
import { alchemyApi } from '@/lib/api/alchemy';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const BLOCKCHAIN_COLORS: Record<string, string> = {
  BASE: 'bg-blue-100 text-blue-800',
  POLYGON: 'bg-purple-100 text-purple-800',
  ARBITRUM: 'bg-sky-100 text-sky-800',
};

const NETWORK_COLORS: Record<string, string> = {
  mainnet: 'bg-green-100 text-green-800',
  sepolia: 'bg-yellow-100 text-yellow-800',
  amoy: 'bg-orange-100 text-orange-800',
};

export default function AlchemyPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['alchemy-stats'],
    queryFn: () => alchemyApi.getStats(),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-8 w-8 text-purple-600" />
            Alchemy
          </h2>
          <p className="text-muted-foreground">
            Monitor Alchemy wallets, transactions, and gas spending
          </p>
        </div>
        <Badge variant="secondary" className="gap-2">
          <Zap className="h-3 w-3" />
          Powered by Alchemy
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Wallets
              </CardTitle>
              <Wallet className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.totalWallets?.toLocaleString() || '0'}
              </div>
            )}
            {!isLoading && stats && (
              <p className="text-xs text-muted-foreground mt-1">{stats.activeWallets} active</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Transactions
              </CardTitle>
              <ArrowLeftRight className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.totalTransactions?.toLocaleString() || '0'}
              </div>
            )}
            {!isLoading && stats && (
              <p className="text-xs text-muted-foreground mt-1">
                {stats.completedTransactions} completed
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Transactions
              </CardTitle>
              <Activity className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.pendingTransactions?.toLocaleString() || '0'}
              </div>
            )}
            {!isLoading && stats && (
              <p className="text-xs text-muted-foreground mt-1">
                {stats.failedTransactions} failed
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Gas Spent
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {parseFloat(stats?.totalGasSpent || '0').toFixed(4)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">ETH/POL/ARB</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/alchemy/wallets">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="h-4 w-4 text-purple-600" />
                Wallets
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              View and manage all Alchemy wallets (EOA & Smart Accounts)
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/alchemy/transactions">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Monitor all token transfers and transaction states
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/alchemy/gas-spending">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Gas Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Track gas spending and sponsorship analytics
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Blockchain Distribution */}
      {stats?.walletsByBlockchain && stats.walletsByBlockchain.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Wallets by Blockchain</CardTitle>
            <CardDescription>Distribution across supported networks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {stats.walletsByBlockchain.map((item) => (
                <div key={item.blockchain} className="text-center p-4 rounded-lg bg-muted/50">
                  <Badge
                    variant="outline"
                    className={`${BLOCKCHAIN_COLORS[item.blockchain] || 'bg-gray-100'} mb-2`}
                  >
                    {item.blockchain}
                  </Badge>
                  <p className="text-2xl font-bold">{item.count}</p>
                  <p className="text-xs text-muted-foreground">wallets</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Network Distribution */}
      {stats?.walletsByNetwork && stats.walletsByNetwork.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Wallets by Network</CardTitle>
            <CardDescription>Mainnet vs Testnet distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {stats.walletsByNetwork.map((item) => (
                <div key={item.network} className="text-center p-4 rounded-lg bg-muted/50">
                  <Badge
                    variant="outline"
                    className={`${NETWORK_COLORS[item.network] || 'bg-gray-100'} mb-2`}
                  >
                    {item.network}
                  </Badge>
                  <p className="text-2xl font-bold">{item.count}</p>
                  <p className="text-xs text-muted-foreground">wallets</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
