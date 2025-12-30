'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Activity, Zap } from 'lucide-react';
import { paymasterApi, PaymasterStats } from '@/lib/api/paymaster';

export default function PaymasterAnalyticsPage() {
  const [stats, setStats] = useState<PaymasterStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await paymasterApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const formatUsdc = (amount: string) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const statCards = stats
    ? [
        {
          title: 'Total UserOperations',
          value: stats.totalUserOps.toLocaleString(),
          description: `${stats.confirmedUserOps} confirmed, ${stats.pendingUserOps} pending`,
          icon: Activity,
          color: 'text-blue-600',
        },
        {
          title: 'Total Gas Spent',
          value: formatUsdc(stats.totalGasSpentUsdc),
          description: 'Total USDC spent on gas fees',
          icon: DollarSign,
          color: 'text-green-600',
        },
        {
          title: 'Average Gas Per TX',
          value: formatUsdc(stats.averageGasPerTxUsdc),
          description: 'Average USDC per transaction',
          icon: TrendingUp,
          color: 'text-purple-600',
        },
        {
          title: 'Success Rate',
          value: `${((stats.confirmedUserOps / stats.totalUserOps) * 100).toFixed(1)}%`,
          description: 'Confirmed vs total operations',
          icon: Zap,
          color: 'text-orange-600',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Paymaster Analytics</h1>
        <p className="text-muted-foreground">Monitor Paymaster usage and gas fee statistics</p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Last 7 days of Paymaster usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Chart placeholder - Integrate with charting library
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gas Cost Trends</CardTitle>
            <CardDescription>Average gas cost over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Chart placeholder - Integrate with charting library
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chain Distribution</CardTitle>
          <CardDescription>Paymaster usage by blockchain</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Chart placeholder - Integrate with charting library
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
