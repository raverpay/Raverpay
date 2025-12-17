'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import Link from 'next/link';
import { Search, Eye, ArrowUpRight, ArrowDownLeft, ExternalLink } from 'lucide-react';

import { circleApi, CircleTransactionState } from '@/lib/api/circle';
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
import { formatDate, truncateAddress } from '@/lib/utils';

const STATE_COLORS: Record<CircleTransactionState, string> = {
  INITIATED: 'bg-yellow-100 text-yellow-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  COMPLETE: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  DENIED: 'bg-red-100 text-red-800',
};

const BLOCKCHAIN_EXPLORERS: Record<string, string> = {
  ETH: 'https://etherscan.io/tx/',
  'ETH-SEPOLIA': 'https://sepolia.etherscan.io/tx/',
  MATIC: 'https://polygonscan.com/tx/',
  'MATIC-AMOY': 'https://amoy.polygonscan.com/tx/',
  ARB: 'https://arbiscan.io/tx/',
  'ARB-SEPOLIA': 'https://sepolia.arbiscan.io/tx/',
  SOL: 'https://explorer.solana.com/tx/',
  'SOL-DEVNET': 'https://explorer.solana.com/tx/?cluster=devnet&tx=',
  AVAX: 'https://snowtrace.io/tx/',
  'AVAX-FUJI': 'https://testnet.snowtrace.io/tx/',
};

export default function CircleTransactionsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300, 2);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['circle-transactions', page, debouncedSearch, typeFilter, stateFilter],
    queryFn: () =>
      circleApi.getTransactions({
        page,
        limit: 20,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(stateFilter !== 'all' && { state: stateFilter }),
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['circle-stats'],
    queryFn: () => circleApi.getStats(),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">USDC Transactions</h2>
          <p className="text-muted-foreground">Monitor all Circle USDC transfers</p>
        </div>
        <Link href="/dashboard/circle-wallets">
          <Button variant="outline">← Back to Wallets</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {stats?.transactionsByState?.map((item) => (
          <Card key={item.state}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{item.state}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>All USDC transactions across all wallets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by address, user, or tx hash..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="INBOUND">Received</SelectItem>
                <SelectItem value="OUTBOUND">Sent</SelectItem>
              </SelectContent>
            </Select>

            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="INITIATED">Initiated</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="COMPLETE">Complete</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
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
          ) : transactionsData?.data && transactionsData.data.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>From / To</TableHead>
                      <TableHead>Network</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionsData.data.map((tx) => {
                      const isInbound = tx.type === 'INBOUND';
                      const explorerUrl = tx.transactionHash
                        ? `${BLOCKCHAIN_EXPLORERS[tx.blockchain] || ''}${tx.transactionHash}`
                        : null;

                      return (
                        <TableRow key={tx.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {isInbound ? (
                                <ArrowDownLeft className="h-4 w-4 text-green-600" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4 text-red-600" />
                              )}
                              <span className="text-sm font-medium">
                                {isInbound ? 'Received' : 'Sent'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {tx.user ? (
                              <div>
                                <p className="text-sm font-medium">
                                  {tx.user.firstName} {tx.user.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">{tx.user.email}</p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`font-mono font-medium ${isInbound ? 'text-green-600' : 'text-red-600'}`}
                            >
                              {isInbound ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">USDC</span>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs font-mono">
                              {isInbound ? (
                                <span title={tx.sourceAddress || ''}>
                                  {truncateAddress(tx.sourceAddress || 'External')}
                                </span>
                              ) : (
                                <span title={tx.destinationAddress}>
                                  {truncateAddress(tx.destinationAddress)}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {tx.blockchain}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={STATE_COLORS[tx.state]}>{tx.state}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(tx.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {explorerUrl && (
                                <a
                                  href={explorerUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}
                              <Link href={`/dashboard/users/${tx.userId}`}>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {transactionsData.meta && (
                <Pagination
                  currentPage={page}
                  totalPages={transactionsData.meta.totalPages}
                  totalItems={transactionsData.meta.total}
                  itemsPerPage={transactionsData.meta.limit}
                  onPageChange={setPage}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ArrowUpRight className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No transactions found</p>
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

