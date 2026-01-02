'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Copy, Wallet, TrendingUp, ExternalLink, AlertCircle } from 'lucide-react';
import { feesApi } from '@/lib/api/fees';
import { circleApi } from '@/lib/api/circle';
import { toast } from 'sonner';
import Link from 'next/link';

export default function FeeCollectionPage() {
  // Fetch fee config to get collection wallet address
  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: ['fee-config'],
    queryFn: () => feesApi.getConfig(),
  });

  // Fetch fee statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['fee-stats'],
    queryFn: () => feesApi.getStats(),
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Address copied to clipboard');
  };

  const getCollectionWalletAddress = () => {
    if (!configData?.data?.collectionWallets) return null;
    const wallets = Object.values(configData.data.collectionWallets);
    // Return the first wallet address (they should all be the same for EVM chains)
    return wallets[0] || null;
  };

  const collectionWallet = getCollectionWalletAddress();

  if (configLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fee Collection Wallet</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Monitor and manage collected transaction fees
        </p>
      </div>

      {/* Wallet Address Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Collection Wallet Address
          </CardTitle>
          <CardDescription>
            This wallet receives all transaction fees across all blockchains
          </CardDescription>
        </CardHeader>
        <CardContent>
          {collectionWallet ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <code className="flex-1 text-sm font-mono break-all">{collectionWallet}</code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(collectionWallet)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                This same address works for all EVM-compatible chains (Base, Optimism, Arbitrum,
                Polygon)
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">No collection wallet configured</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {parseFloat(statsData?.data?.totalCollected || '0').toFixed(4)} USDC
            </div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {parseFloat(statsData?.data?.thisMonthCollected || '0').toFixed(4)} USDC
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {statsData?.data?.collectedCount || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {parseFloat(statsData?.data?.thisWeekCollected || '0').toFixed(4)} USDC
            </div>
            <p className="text-xs text-gray-500 mt-1">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {parseFloat(statsData?.data?.todayCollected || '0').toFixed(4)} USDC
            </div>
            <p className="text-xs text-gray-500 mt-1">Last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Collection Performance */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Collection Performance</CardTitle>
            <CardDescription>Fee collection success metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Success Rate */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Success Rate</span>
                <span className="font-semibold">
                  {statsData?.data?.successRate?.toFixed(1) || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${statsData?.data?.successRate || 0}%` }}
                />
              </div>
            </div>

            {/* Average Fee */}
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Average Fee</span>
              <span className="font-semibold">
                {parseFloat(statsData?.data?.averageFee || '0').toFixed(4)} USDC
              </span>
            </div>

            {/* Failed Collections */}
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Failed Collections</span>
              <div className="flex items-center gap-2">
                <Badge variant={statsData?.data?.failedCount ? 'destructive' : 'secondary'}>
                  {statsData?.data?.failedCount || 0}
                </Badge>
                {statsData?.data?.pendingRetries ? (
                  <span className="text-xs text-gray-500">
                    ({statsData.data.pendingRetries} retrying)
                  </span>
                ) : null}
              </div>
            </div>

            {/* View Failed Button */}
            {statsData?.data?.failedCount ? (
              <Link href="/dashboard/circle-wallets/fee-retries">
                <Button variant="outline" className="w-full">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  View Failed Collections
                </Button>
              </Link>
            ) : null}
          </CardContent>
        </Card>

        {/* Configured Blockchains */}
        <Card>
          <CardHeader>
            <CardTitle>Configured Blockchains</CardTitle>
            <CardDescription>Fee collection enabled on these networks</CardDescription>
          </CardHeader>
          <CardContent>
            {configData?.data?.collectionWallets ? (
              <div className="space-y-2">
                {Object.entries(configData.data.collectionWallets).map(([chain, address]) => (
                  <div
                    key={chain}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          chain.includes('MAINNET') ? 'bg-green-500' : 'bg-yellow-500'
                        }`}
                      />
                      <div>
                        <div className="font-medium text-sm">{chain}</div>
                        <div className="text-xs text-gray-500 font-mono">
                          {address.slice(0, 10)}...{address.slice(-8)}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {chain.includes('MAINNET') ? 'Production' : 'Testnet'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-sm text-gray-500 py-8">
                No blockchains configured
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage fee collection settings</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/dashboard/circle-wallets/fee-config">
            <Button variant="outline">
              Configure Fee Settings
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/dashboard/circle-wallets/fee-retries">
            <Button variant="outline">
              View Retry Queue
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/dashboard/circle-wallets/transactions">
            <Button variant="outline">
              View All Transactions
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
