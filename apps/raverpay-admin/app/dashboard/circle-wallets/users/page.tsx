'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import Link from 'next/link';
import {
  Search,
  Eye,
  Users,
  Mail,
  Shield,
  Key,
  CheckCircle,
  XCircle,
} from 'lucide-react';

import { circleApi } from '@/lib/api/circle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

const AUTH_METHOD_COLORS: Record<string, string> = {
  EMAIL: 'bg-blue-100 text-blue-800',
  PIN: 'bg-purple-100 text-purple-800',
  SOCIAL: 'bg-green-100 text-green-800',
};

const STATUS_COLORS: Record<string, string> = {
  ENABLED: 'bg-green-100 text-green-800',
  DISABLED: 'bg-red-100 text-red-800',
};

export default function CircleUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300, 2);
  const [authMethodFilter, setAuthMethodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['circle-users', page, debouncedSearch, authMethodFilter, statusFilter],
    queryFn: () =>
      circleApi.getCircleUsers({
        page,
        limit: 20,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(authMethodFilter !== 'all' && { authMethod: authMethodFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['circle-users-stats'],
    queryFn: () => circleApi.getCircleUsersStats(),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Circle Users</h2>
          <p className="text-muted-foreground">Manage user-controlled wallet users</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Users
              </CardTitle>
              <Users className="h-4 w-4 text-[#3B82F6]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalUsers?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Email Auth
              </CardTitle>
              <Mail className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.emailAuthUsers?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                PIN Auth
              </CardTitle>
              <Key className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.pinAuthUsers?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Users
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.activeUsers?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Circle Users</CardTitle>
          <CardDescription>View all users with user-controlled wallets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email or Circle user ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={authMethodFilter} onValueChange={setAuthMethodFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Auth Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="PIN">PIN</SelectItem>
                <SelectItem value="SOCIAL">Social</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ENABLED">Enabled</SelectItem>
                <SelectItem value="DISABLED">Disabled</SelectItem>
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
          ) : usersData?.data && usersData.data.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Circle User ID</TableHead>
                      <TableHead>Auth Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>PIN Status</TableHead>
                      <TableHead>Wallets</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersData.data.map((circleUser) => (
                      <TableRow key={circleUser.id}>
                        <TableCell>
                          {circleUser.user ? (
                            <div>
                              <p className="text-sm font-medium">
                                {circleUser.user.firstName} {circleUser.user.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">{circleUser.user.email}</p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm font-medium">{circleUser.email || 'N/A'}</p>
                              <p className="text-xs text-muted-foreground">No linked user</p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {circleUser.circleUserId.substring(0, 16)}...
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={AUTH_METHOD_COLORS[circleUser.authMethod] || 'bg-gray-100'}
                          >
                            {circleUser.authMethod}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[circleUser.status]}>
                            {circleUser.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {circleUser.pinStatus ? (
                            <Badge
                              variant="outline"
                              className={
                                circleUser.pinStatus === 'ENABLED'
                                  ? 'bg-green-50 text-green-700'
                                  : 'bg-gray-50 text-gray-700'
                              }
                            >
                              {circleUser.pinStatus}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {circleUser._count?.wallets || 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(circleUser.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/dashboard/circle-wallets/users/${circleUser.id}`}>
                            <Button variant="ghost" size="sm" className="gap-2">
                              <Eye className="h-4 w-4" />
                              View Details
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {usersData.meta && (
                <Pagination
                  currentPage={page}
                  totalPages={usersData.meta.totalPages}
                  totalItems={usersData.meta.total}
                  itemsPerPage={usersData.meta.limit}
                  onPageChange={setPage}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No Circle users found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your filters or search query
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/circle-wallets">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#2775CA]" />
                All Wallets
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              View all Circle wallets
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/circle-wallets/transactions">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                Email Auth Users
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Users with email authentication
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/circle-wallets/paymaster-analytics">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4 text-purple-600" />
                PIN Auth Users
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Users with PIN authentication
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
