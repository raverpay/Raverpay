'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Users,
  Wallet,
  DollarSign,
} from 'lucide-react';

import { analyticsApi } from '@/lib/api/analytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';

export default function AnalyticsPage() {
  const [revenueGroupBy, setRevenueGroupBy] = useState('day');
  const [dateRange, setDateRange] = useState('7d');

  const getDateParams = () => {
    const endDate = new Date();
    const startDate = new Date();
    switch (dateRange) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  };

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: () => analyticsApi.getDashboard(),
  });

  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['analytics-revenue', revenueGroupBy, dateRange],
    queryFn: () =>
      analyticsApi.getRevenue({
        groupBy: revenueGroupBy,
        ...getDateParams(),
      }),
  });

  const { data: userGrowthData, isLoading: userGrowthLoading } = useQuery({
    queryKey: ['analytics-user-growth', dateRange],
    queryFn: () => analyticsApi.getUserGrowth(getDateParams()),
  });

  const { data: transactionTrendsData, isLoading: transactionTrendsLoading } = useQuery({
    queryKey: ['analytics-transaction-trends', dateRange],
    queryFn: () => analyticsApi.getTransactionTrends(getDateParams()),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">Platform analytics and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dashboardLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {dashboardData?.users?.total?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData?.users?.active?.toLocaleString() || 0} active
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dashboardLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(dashboardData?.wallets?.totalBalance || '0')}
                </div>
                <p className="text-xs text-muted-foreground">Across all wallets</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dashboardLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {dashboardData?.transactions?.today?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">Transactions today</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dashboardLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(dashboardData?.revenue?.today || '0')}
                </div>
                <p className="text-xs text-muted-foreground">Revenue today</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Revenue Analytics</CardTitle>
              <CardDescription>Revenue breakdown by transaction type</CardDescription>
            </div>
            <Select value={revenueGroupBy} onValueChange={setRevenueGroupBy}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Group by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {revenueLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-3xl font-bold">
                    {formatCurrency(revenueData?.totalRevenue || '0')}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                  <p className="text-3xl font-bold">
                    {revenueData?.totalTransactions?.toLocaleString() || 0}
                  </p>
                </div>
              </div>

              {revenueData?.byType && revenueData.byType.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-4">Revenue by Type</h4>
                  <div className="space-y-3">
                    {revenueData.byType.map((item) => (
                      <div
                        key={item.type}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      >
                        <div>
                          <p className="font-medium">{item.type}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.count} transactions
                          </p>
                        </div>
                        <p className="font-bold">{formatCurrency(item.revenue)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Growth */}
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>New user registrations and KYC breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {userGrowthLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">New Users</p>
                  <p className="text-3xl font-bold">
                    {userGrowthData?.newUsers?.toLocaleString() || 0}
                  </p>
                </div>

                {userGrowthData?.byKYCTier && userGrowthData.byKYCTier.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">By KYC Tier</h4>
                    <div className="space-y-2">
                      {userGrowthData.byKYCTier.map((item) => (
                        <div
                          key={item.tier}
                          className="flex items-center justify-between py-2"
                        >
                          <span className="text-sm">{item.tier}</span>
                          <span className="font-medium">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {userGrowthData?.byStatus && userGrowthData.byStatus.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">By Status</h4>
                    <div className="space-y-2">
                      {userGrowthData.byStatus.map((item) => (
                        <div
                          key={item.status}
                          className="flex items-center justify-between py-2"
                        >
                          <span className="text-sm">{item.status}</span>
                          <span className="font-medium">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Trends</CardTitle>
            <CardDescription>Transaction volume and success rate</CardDescription>
          </CardHeader>
          <CardContent>
            {transactionTrendsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Total Volume</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(transactionTrendsData?.totalVolume || '0')}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                    <p className="text-2xl font-bold text-green-600">
                      {transactionTrendsData?.successRate || '0'}%
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Total Count</p>
                  <p className="text-2xl font-bold">
                    {transactionTrendsData?.totalCount?.toLocaleString() || 0}
                  </p>
                </div>

                {transactionTrendsData?.byStatus && transactionTrendsData.byStatus.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">By Status</h4>
                    <div className="space-y-2">
                      {transactionTrendsData.byStatus.map((item) => (
                        <div
                          key={item.status}
                          className="flex items-center justify-between py-2"
                        >
                          <span className="text-sm">{item.status}</span>
                          <span className="font-medium">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Items */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Items</CardTitle>
          <CardDescription>Items requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboardLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">Pending KYC</p>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                  {dashboardData?.pending?.kyc || 0}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900">
                <p className="text-sm text-red-800 dark:text-red-200">Failed Transactions</p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                  {dashboardData?.pending?.failedTransactions || 0}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-900">
                <p className="text-sm text-orange-800 dark:text-orange-200">Deletion Requests</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                  {dashboardData?.pending?.deletionRequests || 0}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
