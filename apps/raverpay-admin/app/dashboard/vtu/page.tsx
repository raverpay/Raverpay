'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import Link from 'next/link';
import { Search, Eye, Smartphone, Wifi, TrendingUp } from 'lucide-react';

import { vtuApi } from '@/lib/api/vtu';
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

export default function VTUPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300, 2);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: vtuData, isLoading } = useQuery({
    queryKey: ['vtu', page, debouncedSearch, typeFilter, statusFilter],
    queryFn: () =>
      vtuApi.getAll({
        page,
        limit: 20,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['vtu-stats'],
    queryFn: () => vtuApi.getStatistics(),
  });

  const totalOrders = stats?.totalCount ?? 0;
  const totalVolume = Number(stats?.totalVolume ?? 0);
  const successRate = stats?.successRate ?? '0';
  const failedOrders = stats?.failedOrders ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">VTU Orders</h2>
        <p className="text-muted-foreground">Manage airtime and data purchases</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Orders
              </CardTitle>
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalOrders ? totalOrders.toLocaleString() : '0'}
            </div>
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
              {totalVolume ? formatCurrency(totalVolume) : '₦0'}
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
            <div className="text-2xl font-bold">{successRate || '0'}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Failed Orders
              </CardTitle>
              <Wifi className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {failedOrders ? failedOrders.toLocaleString() : '0'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle>VTU Order History</CardTitle>
          <CardDescription>View and manage airtime and data orders</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by phone number or user..."
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
                <SelectItem value="AIRTIME">Airtime</SelectItem>
                <SelectItem value="DATA">Data</SelectItem>
                <SelectItem value="CABLE_TV">Cable TV</SelectItem>
                <SelectItem value="ELECTRICITY">Electricity</SelectItem>
                <SelectItem value="JAMB">JAMB</SelectItem>
                <SelectItem value="WAEC_REGISTRATION">WAEC Registration</SelectItem>
                <SelectItem value="WAEC_RESULT">WAEC Result</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
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
          ) : vtuData?.data && vtuData.data.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Network</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vtuData.data.map((order) => (
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
                        <TableCell className="font-mono text-sm">{order.phoneNumber}</TableCell>
                        <TableCell>
                          <span className="text-xs">{order.network || 'N/A'}</span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(parseFloat(order.amount))}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(order.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/dashboard/vtu/${order.id}`}>
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

              {vtuData.meta && (
                <Pagination
                  currentPage={page}
                  totalPages={vtuData.meta.totalPages}
                  totalItems={vtuData.meta.total}
                  itemsPerPage={vtuData.meta.limit}
                  onPageChange={setPage}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Smartphone className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No VTU orders found</p>
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
