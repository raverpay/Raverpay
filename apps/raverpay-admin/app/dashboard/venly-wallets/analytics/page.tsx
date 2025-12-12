'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Calendar, Download } from 'lucide-react';

import { venlyWalletsApi } from '@/lib/api/venly-wallets';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AnalyticsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['venly-analytics', startDate, endDate],
    queryFn: () =>
      venlyWalletsApi.getAnalytics({
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      }),
  });

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const getTotalTransactions = () => {
    if (!analytics?.byStatus) return 0;
    return analytics.byStatus.reduce((sum, item) => sum + item.count, 0);
  };

  const getCompletedPercentage = () => {
    if (!analytics?.byStatus) return '0';
    const total = getTotalTransactions();
    if (total === 0) return '0';
    const completed = analytics.byStatus.find((s) => s.status === 'COMPLETED')?.count || 0;
    return ((completed / total) * 100).toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Venly Wallet Analytics</h2>
          <p className="text-muted-foreground">Analyze wallet adoption and transaction patterns</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Date Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Date Range Filter</CardTitle>
          <CardDescription>Filter analytics by date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : analytics ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Transactions
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getTotalTransactions().toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Success Rate
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{getCompletedPercentage()}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Conversions
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.conversions.totalCount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                $
                {parseFloat(analytics.conversions.totalVolumeUSD).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                total volume
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Transactions by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions by Type</CardTitle>
            <CardDescription>Distribution of transaction types</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : analytics && analytics.byType.length > 0 ? (
              <div className="space-y-4">
                {analytics.byType.map((item) => {
                  const total = getTotalTransactions();
                  const percentage = total > 0 ? (item.count / total) * 100 : 0;
                  return (
                    <div key={item.type} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.type.replace('_', ' ')}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {item.count.toLocaleString()}
                          </span>
                          <span className="font-medium">{percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Volume: ${parseFloat(item.volumeUSD).toLocaleString('en-US')}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-12">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Transactions by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions by Status</CardTitle>
            <CardDescription>Transaction completion rates</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : analytics && analytics.byStatus.length > 0 ? (
              <div className="space-y-4">
                {analytics.byStatus.map((item) => {
                  const total = getTotalTransactions();
                  const percentage = total > 0 ? (item.count / total) * 100 : 0;
                  const getColor = (status: string) => {
                    switch (status) {
                      case 'COMPLETED':
                        return 'bg-green-600';
                      case 'PENDING':
                        return 'bg-yellow-600';
                      case 'FAILED':
                        return 'bg-red-600';
                      default:
                        return 'bg-gray-600';
                    }
                  };
                  return (
                    <div key={item.status} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.status}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {item.count.toLocaleString()}
                          </span>
                          <span className="font-medium">{percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getColor(item.status)} transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-12">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Transaction Volume (Last 30 Days)</CardTitle>
          <CardDescription>Transaction count and volume over time</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : analytics && analytics.dailyVolume.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-7 gap-2">
                {analytics.dailyVolume
                  .slice(0, 28)
                  .reverse()
                  .map((item) => (
                    <div key={item.date} className="space-y-1">
                      <div className="text-xs text-center text-muted-foreground">
                        {new Date(item.date).getDate()}
                      </div>
                      <div
                        className="bg-primary rounded-sm transition-all hover:bg-primary/80"
                        style={{
                          height: `${Math.max((item.count / 10) * 100, 10)}px`,
                        }}
                        title={`${item.count} transactions - $${item.volume}`}
                      />
                      <div className="text-xs text-center font-medium">{item.count}</div>
                    </div>
                  ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4">
                Hover over bars to see details
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-12">No volume data available</p>
          )}
        </CardContent>
      </Card>

      {/* Conversion Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Analytics</CardTitle>
          <CardDescription>Crypto to Naira conversion metrics</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : analytics ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Conversions</p>
                <p className="text-2xl font-bold">
                  {analytics.conversions.totalCount.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Volume (USD)</p>
                <p className="text-2xl font-bold">
                  $
                  {parseFloat(analytics.conversions.totalVolumeUSD).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Average Amount</p>
                <p className="text-2xl font-bold">
                  $
                  {parseFloat(analytics.conversions.averageAmountUSD).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
