'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, DollarSign, Activity, BarChart3 } from 'lucide-react';

import { alchemyApi } from '@/lib/api/alchemy';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { formatDate } from '@/lib/utils';

const BLOCKCHAIN_COLORS: Record<string, string> = {
  BASE: 'bg-blue-100 text-blue-800',
  POLYGON: 'bg-purple-100 text-purple-800',
  ARBITRUM: 'bg-sky-100 text-sky-800',
};

export default function AlchemyGasSpendingPage() {
  const [page, setPage] = useState(1);
  const [blockchainFilter, setBlockchainFilter] = useState<string>('all');
  const [networkFilter, setNetworkFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7');

  // Calculate date range
  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange));
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  };

  const { startDate, endDate } = getDateRange();

  const { data: gasSpendingData, isLoading } = useQuery({
    queryKey: ['alchemy-gas-spending', page, blockchainFilter, networkFilter, startDate, endDate],
    queryFn: () =>
      alchemyApi.getGasSpending({
        page,
        limit: 20,
        startDate,
        endDate,
        ...(blockchainFilter !== 'all' && { blockchain: blockchainFilter }),
        ...(networkFilter !== 'all' && { network: networkFilter }),
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['alchemy-stats'],
    queryFn: () => alchemyApi.getStats(),
  });

  const averageGasPerTx =
    gasSpendingData?.summary.totalTransactions && gasSpendingData.summary.totalTransactions > 0
      ? parseFloat(gasSpendingData.summary.totalGasUsed) / gasSpendingData.summary.totalTransactions
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gas Spending Analytics</h2>
          <p className="text-muted-foreground">Track gas consumption and sponsorship</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
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
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {parseFloat(gasSpendingData?.summary.totalGasUsed || '0').toFixed(6)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Last {dateRange} days</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Transactions
              </CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {gasSpendingData?.summary.totalTransactions?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Last {dateRange} days</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Gas per TX
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{averageGasPerTx.toFixed(6)}</div>
                <p className="text-xs text-muted-foreground mt-1">ETH/POL/ARB</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                All-Time Gas Spent
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {parseFloat(stats?.totalGasSpent || '0').toFixed(6)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total across all time</p>
          </CardContent>
        </Card>
      </div>

      {/* Gas Spending Table */}
      <Card>
        <CardHeader>
          <CardTitle>Gas Spending Details</CardTitle>
          <CardDescription>Daily gas consumption by wallet and blockchain</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>

            <Select value={blockchainFilter} onValueChange={setBlockchainFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Blockchain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Blockchains</SelectItem>
                <SelectItem value="BASE">Base</SelectItem>
                <SelectItem value="POLYGON">Polygon</SelectItem>
                <SelectItem value="ARBITRUM">Arbitrum</SelectItem>
              </SelectContent>
            </Select>

            <Select value={networkFilter} onValueChange={setNetworkFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Networks</SelectItem>
                <SelectItem value="mainnet">Mainnet</SelectItem>
                <SelectItem value="sepolia">Sepolia</SelectItem>
                <SelectItem value="amoy">Amoy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : gasSpendingData?.data && gasSpendingData.data.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Wallet Address</TableHead>
                      <TableHead>Blockchain</TableHead>
                      <TableHead>Network</TableHead>
                      <TableHead>Total Gas Used</TableHead>
                      <TableHead>Transaction Count</TableHead>
                      <TableHead>Avg Gas per TX</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gasSpendingData.data.map((spending) => {
                      const avgGas =
                        spending.transactionCount > 0
                          ? parseFloat(spending.totalGasUsed) / spending.transactionCount
                          : 0;

                      return (
                        <TableRow key={spending.id}>
                          <TableCell className="text-sm">{formatDate(spending.date)}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {spending.walletAddress.slice(0, 6)}...
                              {spending.walletAddress.slice(-4)}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={BLOCKCHAIN_COLORS[spending.blockchain] || 'bg-gray-100'}
                            >
                              {spending.blockchain}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{spending.network}</span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">
                                {parseFloat(spending.totalGasUsed).toFixed(6)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {spending.blockchain === 'POLYGON' ? 'POL' : 'ETH'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{spending.transactionCount}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{avgGas.toFixed(6)}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {gasSpendingData.meta && (
                <Pagination
                  currentPage={page}
                  totalPages={gasSpendingData.meta.totalPages}
                  totalItems={gasSpendingData.meta.total}
                  itemsPerPage={gasSpendingData.meta.limit}
                  onPageChange={setPage}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No gas spending data found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your filters or date range
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
