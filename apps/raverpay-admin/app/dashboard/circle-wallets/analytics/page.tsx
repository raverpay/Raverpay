'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  TrendingUp,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { circleApi } from '@/lib/api/circle';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface FeeAnalytics {
  period: {
    startDate: string;
    endDate: string;
    blockchain?: string;
  };
  summary: {
    totalFeesCollected: string;
    totalTransactions: number;
    averageFeePerTransaction: string;
    feeCollectionSuccessRate: string;
    totalGasEstimate: string;
    netProfit: string;
  };
  feesByBlockchain: Array<{
    blockchain: string;
    feesCollected: string;
    transactionCount: number;
    averageFee: string;
    successRate: string;
  }>;
  dailyFees: Array<{
    date: string;
    feesCollected: string;
    transactionCount: number;
  }>;
  recentTransactions: Array<{
    id: string;
    reference: string;
    amount: string;
    feeAmount: string;
    blockchain: string;
    state: string;
    createdAt: string;
  }>;
}

type TimeRange = '7d' | '30d' | 'month' | 'custom';

export default function CircleAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedBlockchain, setSelectedBlockchain] = useState<string>('all');

  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case '7d':
        return { startDate: subDays(now, 7), endDate: now };
      case '30d':
        return { startDate: subDays(now, 30), endDate: now };
      case 'month':
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
      case 'custom':
        return {
          startDate: customStartDate ? new Date(customStartDate) : subDays(now, 30),
          endDate: customEndDate ? new Date(customEndDate) : now,
        };
      default:
        return { startDate: subDays(now, 30), endDate: now };
    }
  };

  const dateRange = getDateRange();

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useQuery<{ data: FeeAnalytics }>({
    queryKey: ['fee-analytics', timeRange, customStartDate, customEndDate, selectedBlockchain],
    queryFn: () =>
      circleApi.getFeeAnalytics({
        startDate: format(dateRange.startDate, 'yyyy-MM-dd'),
        endDate: format(dateRange.endDate, 'yyyy-MM-dd'),
        blockchain: selectedBlockchain === 'all' ? undefined : selectedBlockchain,
      }),
  });

  const analytics = analyticsData?.data;

  const exportToCSV = () => {
    if (!analytics) return;

    const headers = ['Date', 'Fees Collected (USDC)', 'Transaction Count'];
    const rows = analytics.dailyFees.map((day) => [
      day.date,
      day.feesCollected,
      day.transactionCount.toString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `circle-fee-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fee Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Track fee collection, gas costs, and profit margins
          </p>
        </div>
        <Button onClick={exportToCSV} disabled={!analytics}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Time Range</Label>
              <Select value={timeRange} onValueChange={(v: TimeRange) => setTimeRange(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {timeRange === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Blockchain</Label>
              <Select value={selectedBlockchain} onValueChange={setSelectedBlockchain}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All chains" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Chains</SelectItem>
                  <SelectItem value="BASE-SEPOLIA">Base Sepolia</SelectItem>
                  <SelectItem value="OP-SEPOLIA">Optimism Sepolia</SelectItem>
                  <SelectItem value="ARB-SEPOLIA">Arbitrum Sepolia</SelectItem>
                  <SelectItem value="MATIC-AMOY">Polygon Amoy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fees Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${analytics?.summary.totalFeesCollected || '0.00'} USDC
            </div>
            <p className="text-xs text-gray-500 flex items-center mt-1">
              <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
              {analytics?.summary.totalTransactions || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Fee</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${analytics?.summary.averageFeePerTransaction || '0.00'}
            </div>
            <p className="text-xs text-gray-500">Per transaction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.summary.feeCollectionSuccessRate || '0'}%
            </div>
            <p className="text-xs text-gray-500">Fee collection</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Gas Cost</CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${analytics?.summary.totalGasEstimate || '0.00'}
            </div>
            <p className="text-xs text-gray-500 flex items-center mt-1">
              Net Profit:{' '}
              <span className="text-green-500 ml-1">
                ${analytics?.summary.netProfit || '0.00'}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Fees by Blockchain */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Fees by Blockchain
            </CardTitle>
            <CardDescription>Breakdown by network</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Blockchain</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
                  <TableHead className="text-right">Txns</TableHead>
                  <TableHead className="text-right">Avg</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics?.feesByBlockchain.map((item) => (
                  <TableRow key={item.blockchain}>
                    <TableCell className="font-medium">{item.blockchain}</TableCell>
                    <TableCell className="text-right">${item.feesCollected}</TableCell>
                    <TableCell className="text-right">{item.transactionCount}</TableCell>
                    <TableCell className="text-right">${item.averageFee}</TableCell>
                  </TableRow>
                ))}
                {(!analytics?.feesByBlockchain || analytics.feesByBlockchain.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">
                      No data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Daily Fees */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Daily Fees
            </CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Fees Collected</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics?.dailyFees.slice(0, 7).map((day) => (
                  <TableRow key={day.date}>
                    <TableCell>{format(new Date(day.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">${day.feesCollected}</TableCell>
                    <TableCell className="text-right">{day.transactionCount}</TableCell>
                  </TableRow>
                ))}
                {(!analytics?.dailyFees || analytics.dailyFees.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">
                      No data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Fee Transactions</CardTitle>
          <CardDescription>Latest fee collection transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Blockchain</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics?.recentTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-mono text-sm">{tx.reference}</TableCell>
                  <TableCell>{tx.blockchain}</TableCell>
                  <TableCell className="text-right">${tx.amount}</TableCell>
                  <TableCell className="text-right text-green-600">${tx.feeAmount}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        tx.state === 'CONFIRMED'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : tx.state === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {tx.state}
                    </span>
                  </TableCell>
                  <TableCell>{format(new Date(tx.createdAt), 'MMM d, HH:mm')}</TableCell>
                </TableRow>
              ))}
              {(!analytics?.recentTransactions || analytics.recentTransactions.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    No transactions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invoice Reconciliation Notice */}
      <Alert>
        <DollarSign className="h-4 w-4" />
        <AlertDescription>
          <strong>Circle Invoice Reconciliation:</strong> Compare monthly fee collection against
          Circle&apos;s invoices to verify gas costs. This data should be reviewed monthly for
          accurate accounting.
        </AlertDescription>
      </Alert>
    </div>
  );
}
