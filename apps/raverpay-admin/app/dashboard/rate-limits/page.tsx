'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, AlertTriangle, Activity, Globe, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';

interface ViolationStats {
  total24h: number;
  totalToday: number;
  uniqueIPs: number;
  uniqueUsers: number;
  topEndpoint: string;
  topCountry: string;
}

interface RecentViolation {
  id: string;
  endpoint: string;
  method: string;
  ip: string;
  country: string | null;
  city: string | null;
  userId: string | null;
  violatedAt: string;
  limit: number;
}

interface LockedAccount {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  lockedUntil: string | null;
  lastRateLimitLockAt: string;
  rateLimitLockReason: string;
  rateLimitLockCount: number;
}

export default function RateLimitsPage() {
  const [stats, setStats] = useState<ViolationStats | null>(null);
  const [recentViolations, setRecentViolations] = useState<RecentViolation[]>([]);
  const [lockedAccounts, setLockedAccounts] = useState<LockedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, violationsRes, lockedRes] = await Promise.all([
        fetch('/api/admin/rate-limits/stats'),
        fetch('/api/admin/rate-limits/violations?limit=10'),
        fetch('/api/admin/rate-limits/locked-accounts?limit=10'),
      ]);

      if (statsRes.ok && violationsRes.ok) {
        const statsData = await statsRes.json();
        const violationsData = await violationsRes.json();
        setStats(statsData);
        setRecentViolations(violationsData.violations);
      }

      if (lockedRes.ok) {
        const lockedData = await lockedRes.json();
        setLockedAccounts(lockedData.users);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Activity className="mx-auto h-8 w-8 animate-pulse text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rate Limit Monitoring</h1>
        <p className="text-muted-foreground">Monitor and manage API rate limiting violations</p>
      </div>

      {/* Locked Accounts Alert */}
      {lockedAccounts.length > 0 && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-500">
              <AlertTriangle className="h-5 w-5" />
              {lockedAccounts.length} Account{lockedAccounts.length !== 1 ? 's' : ''} Locked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              These accounts are currently locked due to rate limit violations
            </p>
            <Link
              href="/dashboard/rate-limits/locked-accounts"
              className="text-sm font-medium text-primary hover:underline"
            >
              View and manage locked accounts →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 24 Hours</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total24h || 0}</div>
            <p className="text-xs text-muted-foreground">Total violations detected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalToday || 0}</div>
            <p className="text-xs text-muted-foreground">Violations since midnight</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique IPs</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.uniqueIPs || 0}</div>
            <p className="text-xs text-muted-foreground">Different IP addresses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.uniqueUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Authenticated users</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="violations">
            <Link href="/dashboard/rate-limits/violations">Violations</Link>
          </TabsTrigger>
          <TabsTrigger value="metrics">
            <Link href="/dashboard/rate-limits/metrics">Analytics</Link>
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Link href="/dashboard/rate-limits/settings">Settings</Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Top Targets */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Most Targeted Endpoint
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md bg-muted p-4">
                  <code className="text-sm">{stats?.topEndpoint || 'No data'}</code>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Top Source Country
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.topCountry || 'Unknown'}</div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Violations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Recent Violations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentViolations.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Shield className="mx-auto h-12 w-12 opacity-20" />
                  <p className="mt-2">No violations detected</p>
                  <p className="text-sm">Your API is secure! 🎉</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentViolations.map((violation) => (
                    <div
                      key={violation.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-medium">
                            {violation.method} {violation.endpoint}
                          </code>
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/20 dark:text-red-400">
                            Limit: {violation.limit}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>IP: {violation.ip}</span>
                          {violation.country && (
                            <span>
                              📍 {violation.city}, {violation.country}
                            </span>
                          )}
                          {violation.userId && <span>User: {violation.userId.slice(0, 8)}...</span>}
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {new Date(violation.violatedAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                  <Link
                    href="/dashboard/rate-limits/violations"
                    className="block text-center text-sm text-primary hover:underline"
                  >
                    View all violations →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
