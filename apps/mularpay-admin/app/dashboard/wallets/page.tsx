'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Search, Eye, Wallet as WalletIcon, Lock, Unlock } from 'lucide-react';

import { walletsApi } from '@/lib/api/wallets';
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
import { formatCurrency } from '@/lib/utils';

export default function WalletsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [lockFilter, setLockFilter] = useState<string>('all');

  const { data: walletsData, isPending: isLoading } = useQuery({
    queryKey: ['wallets', page, search, lockFilter],
    queryFn: () =>
      walletsApi.getAll({
        page,
        limit: 20,
        ...(search && { search }),
        ...(lockFilter !== 'all' && { isLocked: lockFilter === 'locked' }),
        sortBy: 'balance',
        sortOrder: 'desc',
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['wallet-stats'],
    queryFn: () => walletsApi.getStatistics(),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Wallets</h2>
        <p className="text-muted-foreground">Monitor and manage user wallets</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Wallets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalWallets?.toLocaleString() || '0'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalBalance ? formatCurrency(parseFloat(stats.totalBalance)) : '₦0'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.averageBalance ? formatCurrency(parseFloat(stats.averageBalance)) : '₦0'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Locked Wallets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats?.lockedWallets?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle>Wallets List</CardTitle>
          <CardDescription>View and manage user wallets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by user email or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={lockFilter} onValueChange={setLockFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Lock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Wallets</SelectItem>
                <SelectItem value="unlocked">Unlocked</SelectItem>
                <SelectItem value="locked">Locked</SelectItem>
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
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Ledger Balance</TableHead>
                      <TableHead className="text-right">Daily Spent</TableHead>
                      <TableHead className="text-right">Monthly Spent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {walletsData.data.map((wallet) => (
                      <TableRow key={wallet.id}>
                        <TableCell>
                          {wallet.user ? (
                            <div>
                              <p className="font-medium">
                                {wallet.user.firstName} {wallet.user.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">{wallet.user.email}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(parseFloat(wallet.balance))}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(parseFloat(wallet.ledgerBalance))}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(parseFloat(wallet.dailySpent))}
                          <span className="text-xs text-muted-foreground">
                            {/* {' '}
                            / {formatCurrency(parseFloat(wallet.dailyLimit))} */}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(parseFloat(wallet.monthlySpent))}
                          <span className="text-xs text-muted-foreground">
                            {/* / {formatCurrency(parseFloat(wallet.monthlyLimit))} */}
                          </span>
                        </TableCell>
                        <TableCell>
                          {wallet.isLocked ? (
                            <Badge variant="destructive" className="gap-1">
                              <Lock className="h-3 w-3" />
                              Locked
                            </Badge>
                          ) : (
                            <Badge variant="success" className="gap-1">
                              <Unlock className="h-3 w-3" />
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/dashboard/wallets/${wallet.userId}`}>
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
                  currentPage={walletsData.meta.currentPage}
                  totalPages={walletsData.meta.totalPages}
                  totalItems={walletsData.meta.totalItems}
                  itemsPerPage={walletsData.meta.perPage}
                  onPageChange={setPage}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <WalletIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No wallets found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your filters or search query
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
