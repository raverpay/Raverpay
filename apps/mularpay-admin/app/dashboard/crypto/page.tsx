'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Search, Eye, Bitcoin, TrendingUp, Clock } from 'lucide-react';

import { cryptoApi } from '@/lib/api/crypto';
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
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function CryptoPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: cryptoData, isLoading } = useQuery({
    queryKey: ['crypto', page, search, typeFilter, statusFilter],
    queryFn: () =>
      cryptoApi.getAll({
        page,
        limit: 20,
        ...(search && { search }),
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['crypto-stats'],
    queryFn: () => cryptoApi.getStatistics(),
  });

  // Calculate pending orders from byStatus array
  const pendingOrders =
    stats?.byStatus
      ?.filter((s) => s.status === 'PENDING' || s.status === 'PROCESSING')
      .reduce((sum, s) => sum + s.count, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Crypto Orders</h2>
        <p className="text-muted-foreground">Manage cryptocurrency buy and sell orders</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Orders
              </CardTitle>
              <Bitcoin className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCount?.toLocaleString() || '0'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Volume
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalVolumeNGN
                ? formatCurrency(
                    typeof stats.totalVolumeNGN === 'string'
                      ? parseFloat(stats.totalVolumeNGN)
                      : stats.totalVolumeNGN,
                  )
                : '₦0'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Review
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {pendingOrders.toLocaleString()}
            </div>
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
            <div className="text-2xl font-bold">{stats?.successRate || '0'}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle>Crypto Orders</CardTitle>
          <CardDescription>View and manage cryptocurrency transactions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by crypto or user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="BUY">Buy</SelectItem>
                <SelectItem value="SELL">Sell</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
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
          ) : cryptoData?.data && cryptoData.data.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Cryptocurrency</TableHead>
                      <TableHead className="text-right">Crypto Amount</TableHead>
                      <TableHead className="text-right">NGN Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cryptoData.data.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">{order.reference}</TableCell>
                        <TableCell>
                          <span className="text-xs">{order.type}</span>
                        </TableCell>
                        <TableCell>
                          {order.user ? (
                            <div>
                              <p className="text-sm font-medium">
                                {order.user.firstName} {order.user.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">{order.user.email}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">
                            {order.asset || order.type || 'N/A'}
                          </p>
                          {order.network && (
                            <p className="text-xs text-muted-foreground">{order.network}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {order.cryptoAmount ? parseFloat(order.cryptoAmount).toFixed(8) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {order.nairaAmount ? formatCurrency(parseFloat(order.nairaAmount)) : '₦0'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(order.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/dashboard/crypto/${order.id}`}>
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

              {cryptoData.meta && (
                <Pagination
                  currentPage={cryptoData.meta.currentPage}
                  totalPages={cryptoData.meta.totalPages}
                  totalItems={cryptoData.meta.totalItems}
                  itemsPerPage={cryptoData.meta.perPage}
                  onPageChange={setPage}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bitcoin className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No crypto orders found</p>
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
