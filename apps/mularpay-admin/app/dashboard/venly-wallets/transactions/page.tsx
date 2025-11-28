'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Search, Eye, Flag, ExternalLink, TrendingUp, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';

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
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300, 2);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState('');

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['venly-transactions', page, debouncedSearch, typeFilter, statusFilter],
    queryFn: () =>
      venlyWalletsApi.getTransactions({
        page,
        limit: 20,
        ...(debouncedSearch && { userId: debouncedSearch }),
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      }),
  });

  const flagMutation = useMutation({
    mutationFn: ({ txId, reason }: { txId: string; reason: string }) =>
      venlyWalletsApi.flagTransaction(txId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venly-transactions'] });
      toast.success('Transaction flagged successfully');
      setFlagDialogOpen(false);
      setFlagReason('');
      setSelectedTxId(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to flag transaction');
    },
  });

  const handleFlag = (txId: string) => {
    setSelectedTxId(txId);
    setFlagDialogOpen(true);
  };

  const handleFlagSubmit = () => {
    if (!selectedTxId || !flagReason.trim()) {
      toast.error('Please provide a reason for flagging');
      return;
    }

    flagMutation.mutate({ txId: selectedTxId, reason: flagReason });
  };

  const getPolygonScanUrl = (hash: string) => {
    const network = process.env.NEXT_PUBLIC_VENLY_ENV === 'sandbox' ? 'mumbai' : 'polygon';
    return `https://${network}.polygonscan.com/tx/${hash}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Transaction Monitoring</h2>
        <p className="text-muted-foreground">Track all blockchain transactions in real-time</p>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Crypto Transactions</CardTitle>
          <CardDescription>Monitor send, receive, and conversion transactions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by user ID or transaction hash..."
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
                <SelectItem value="SEND">Send</SelectItem>
                <SelectItem value="RECEIVE">Receive</SelectItem>
                <SelectItem value="CRYPTO_TO_NAIRA">Conversion</SelectItem>
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
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tx Hash</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionsData.data.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm">{formatDate(tx.createdAt)}</TableCell>
                        <TableCell>
                          {tx.user ? (
                            <div>
                              <p className="text-sm font-medium">
                                {tx.user.firstName} {tx.user.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">{tx.user.email}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {tx.type === 'SEND' && <ArrowUpRight className="h-4 w-4 text-red-600" />}
                            {tx.type === 'RECEIVE' && <ArrowDownRight className="h-4 w-4 text-green-600" />}
                            {tx.type === 'CRYPTO_TO_NAIRA' && <TrendingUp className="h-4 w-4 text-blue-600" />}
                            <span className="text-sm">{tx.type.replace('_', ' ')}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {parseFloat(tx.amount).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 6,
                          })}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{tx.currency}</span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={tx.status} />
                        </TableCell>
                        <TableCell>
                          {tx.transactionHash ? (
                            <a
                              href={getPolygonScanUrl(tx.transactionHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs font-mono text-blue-600 hover:underline"
                            >
                              {`${tx.transactionHash.substring(0, 6)}...${tx.transactionHash.substring(60)}`}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1"
                              onClick={() => handleFlag(tx.id)}
                            >
                              <Flag className="h-3 w-3" />
                              Flag
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
              <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No transactions found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your filters or search query
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Flag Transaction Dialog */}
      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag Transaction as Suspicious</DialogTitle>
            <DialogDescription>
              Provide a reason for flagging this transaction. This will be logged for review.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for flagging</Label>
              <Textarea
                id="reason"
                placeholder="E.g., Unusual transaction pattern, suspected fraud, etc."
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFlagSubmit} disabled={flagMutation.isPending}>
              {flagMutation.isPending ? 'Flagging...' : 'Flag Transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
