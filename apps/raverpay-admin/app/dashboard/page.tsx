'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api/analytics';
import { vtuApi } from '@/lib/api/vtu';
import { notificationsApi } from '@/lib/api/notifications';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  Wallet,
  CreditCard,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Trash2,
  Zap,
  Bell,
  Mail,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: dashboardData, isPending: isLoading } = useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: () => analyticsApi.getDashboard(),
  });

  const { data: vtpassBalance } = useQuery({
    queryKey: ['vtpass-balance'],
    queryFn: () => vtuApi.getBalance(),
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: queueStats } = useQuery({
    queryKey: ['notification-queue-stats'],
    queryFn: () => notificationsApi.getQueueStats(),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Overview of your platform</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-40 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Users"
          value={dashboardData?.users?.total?.toLocaleString()}
          description={`${dashboardData?.users?.active?.toLocaleString()} active users`}
          icon={Users}
        />
        <StatCard
          title="Total Balance"
          value={formatCurrency(parseFloat(dashboardData?.wallets?.totalBalance))}
          description="Platform wallet balance"
          icon={Wallet}
        />
        <StatCard
          title="VTPass Balance"
          value={formatCurrency(vtpassBalance?.balance || 0)}
          description="VTU provider balance"
          icon={Zap}
        />
        <StatCard
          title="Transactions Today"
          value={dashboardData?.transactions?.today?.toLocaleString()}
          description="Processed today"
          icon={CreditCard}
        />
        <StatCard
          title="Revenue Today"
          value={formatCurrency(parseFloat(dashboardData?.revenue?.today))}
          description="Fees collected"
          icon={DollarSign}
        />
      </div>

      {/* Pending Items */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending KYC</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.pending?.kyc}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting verification</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Failed Transactions</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {dashboardData?.pending?.failedTransactions}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Deletion Requests</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.pending?.deletionRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Notification Queue</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {queueStats?.queued || 0}
              {queueStats?.processing ? (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({queueStats.processing} processing)
                </span>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {queueStats?.sent || 0} sent, {queueStats?.failed || 0} failed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/dashboard/kyc"
              className="flex flex-col items-center justify-center gap-2 rounded-lg border p-6 hover:bg-accent transition-colors"
            >
              <CheckCircle className="h-8 w-8 text-primary" />
              <span className="font-medium">Review KYC</span>
              <span className="text-xs text-muted-foreground">
                {dashboardData?.pending?.kyc} pending
              </span>
            </Link>
            <Link
              href="/dashboard/transactions"
              className="flex flex-col items-center justify-center gap-2 rounded-lg border p-6 hover:bg-accent transition-colors"
            >
              <CreditCard className="h-8 w-8 text-primary" />
              <span className="font-medium">View Transactions</span>
              <span className="text-xs text-muted-foreground">
                {dashboardData?.transactions?.today} today
              </span>
            </Link>
            <Link
              href="/dashboard/users"
              className="flex flex-col items-center justify-center gap-2 rounded-lg border p-6 hover:bg-accent transition-colors"
            >
              <Users className="h-8 w-8 text-primary" />
              <span className="font-medium">Manage Users</span>
              <span className="text-xs text-muted-foreground">
                {dashboardData?.users?.total} total
              </span>
            </Link>
            <Link
              href="/dashboard/analytics"
              className="flex flex-col items-center justify-center gap-2 rounded-lg border p-6 hover:bg-accent transition-colors"
            >
              <DollarSign className="h-8 w-8 text-primary" />
              <span className="font-medium">View Analytics</span>
              <span className="text-xs text-muted-foreground">Revenue & insights</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
