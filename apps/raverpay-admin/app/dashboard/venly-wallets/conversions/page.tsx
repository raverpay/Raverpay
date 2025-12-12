'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Search, TrendingUp, DollarSign, Calendar } from 'lucide-react';

import { venlyWalletsApi } from '@/lib/api/venly-wallets';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

export default function ConversionsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300, 2);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: conversionsData, isLoading } = useQuery({
    queryKey: ['venly-conversions', page, debouncedSearch, statusFilter],
    queryFn: () =>
      venlyWalletsApi.getConversions({
        page,
        limit: 20,
        ...(debouncedSearch && { userId: debouncedSearch }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      }),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Crypto Conversions</h2>
        <p className="text-muted-foreground">Monitor crypto to Naira conversions</p>
      </div>

      {/* Stats Cards */}
      {conversionsData?.stats && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Volume (USD)
                </CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                $
                {parseFloat(conversionsData.stats.totalVolumeUSD).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Conversion
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                $
                {parseFloat(conversionsData.stats.averageConversionUSD).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Conversions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion History</CardTitle>
          <CardDescription>All crypto to Naira conversion transactions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by user ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
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
          ) : conversionsData?.data && conversionsData.data.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Token</TableHead>
                      <TableHead className="text-right">Crypto Amount</TableHead>
                      <TableHead className="text-right">USD Value</TableHead>
                      <TableHead className="text-right">Exchange Rate</TableHead>
                      <TableHead className="text-right">NGN Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversionsData.data.map((conversion) => (
                      <TableRow key={conversion.id}>
                        <TableCell className="text-sm">
                          {formatDate(conversion.createdAt)}
                        </TableCell>
                        <TableCell>
                          {conversion.user ? (
                            <div>
                              <p className="text-sm font-medium">
                                {conversion.user.firstName} {conversion.user.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {conversion.user.email}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{conversion.tokenSymbol}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {parseFloat(conversion.cryptoAmount).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 6,
                          })}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          $
                          {parseFloat(conversion.usdValue).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ₦
                          {parseFloat(conversion.exchangeRate).toLocaleString('en-NG', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(parseFloat(conversion.nairaAmount))}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={conversion.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {conversionsData.meta && (
                <Pagination
                  currentPage={page}
                  totalPages={conversionsData.meta.totalPages}
                  totalItems={conversionsData.meta.total}
                  itemsPerPage={conversionsData.meta.limit}
                  onPageChange={setPage}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No conversions found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Conversions will appear here when users convert crypto to Naira
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
