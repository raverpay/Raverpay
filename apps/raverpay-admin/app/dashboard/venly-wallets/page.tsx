'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import Link from 'next/link';
import { Search, Eye, Wallet, Users, TrendingUp, Percent } from 'lucide-react';

import { venlyWalletsApi } from '@/lib/api/venly-wallets';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

export default function VenlyWalletsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300, 2);
  const [hasWalletFilter, setHasWalletFilter] = useState<string>('all');

  const { data: walletsData, isLoading } = useQuery({
    queryKey: ['venly-wallets', page, debouncedSearch, hasWalletFilter],
    queryFn: () =>
      venlyWalletsApi.getWallets({
        page,
        limit: 20,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(hasWalletFilter !== 'all' && { hasWallet: hasWalletFilter === 'true' }),
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['venly-wallets-stats'],
    queryFn: () => venlyWalletsApi.getStats(),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Venly Wallets</h2>
          <p className="text-muted-foreground">Manage cryptocurrency wallets and users</p>
        </div>
        <Link href="/dashboard/venly-wallets/exchange-rates">
          <Button variant="outline" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Manage Exchange Rates
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Users
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers?.toLocaleString() || '0'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Users with Wallets
              </CardTitle>
              <Wallet className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.usersWithWallets?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Adoption Rate
              </CardTitle>
              <Percent className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.adoptionRate || '0'}%</div>
          </CardContent>
        </Card>

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
            <div className="text-2xl font-bold">{stats?.totalWallets?.toLocaleString() || '0'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Wallets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Crypto Wallet Users</CardTitle>
          <CardDescription>View all users and their crypto wallet status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={hasWalletFilter} onValueChange={setHasWalletFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Wallet Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="true">With Wallet</SelectItem>
                <SelectItem value="false">Without Wallet</SelectItem>
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
          ) : walletsData?.data && walletsData.data.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Wallet Status</TableHead>
                      <TableHead>Wallet Address</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {walletsData.data.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{user.phone}</TableCell>
                        <TableCell>
                          {user.hasVenlyWallet ? (
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-green-600" />
                              <span className="text-sm font-medium text-green-600">Active</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-gray-300" />
                              <span className="text-sm text-muted-foreground">None</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.wallets && user.wallets.length > 0 ? (
                            <span className="font-mono text-xs">
                              {user.wallets[0].walletAddress
                                ? `${user.wallets[0].walletAddress.substring(0, 6)}...${user.wallets[0].walletAddress.substring(38)}`
                                : 'N/A'}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(user.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/dashboard/users/${user.id}`}>
                            <Button variant="ghost" size="sm" className="gap-2">
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {walletsData.meta && (
                <Pagination
                  currentPage={page}
                  totalPages={walletsData.meta.totalPages}
                  totalItems={walletsData.meta.total}
                  itemsPerPage={walletsData.meta.limit}
                  onPageChange={setPage}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No users found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your filters or search query
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/venly-wallets/transactions">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                View Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Monitor all crypto transactions
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/venly-wallets/conversions">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                View Conversions
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Track crypto to Naira conversions
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/venly-wallets/analytics">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                View Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Analyze wallet adoption and usage
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
