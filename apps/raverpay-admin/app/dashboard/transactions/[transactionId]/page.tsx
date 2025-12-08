'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, Undo2, User } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

import { transactionsApi } from '@/lib/api/transactions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatCurrency, getApiErrorMessage } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function TransactionDetailPage({
  params,
}: {
  params: Promise<{ transactionId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [reverseReason, setReverseReason] = useState('');
  const [showReverseConfirm, setShowReverseConfirm] = useState(false);
  const [showRetryConfirm, setShowRetryConfirm] = useState(false);

  const { data: transaction, isLoading } = useQuery({
    queryKey: ['transaction', resolvedParams.transactionId],
    queryFn: () => transactionsApi.getById(resolvedParams.transactionId),
  });

  const reverseMutation = useMutation({
    mutationFn: (reason: string) => transactionsApi.reverse(resolvedParams.transactionId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction', resolvedParams.transactionId] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transaction reversed successfully');
      setReverseReason('');
    },
    onError: (error: unknown) => {
      toast.error('Failed to reverse transaction', {
        description: getApiErrorMessage(error, 'Unable to reverse transaction'),
      });
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => transactionsApi.retry(resolvedParams.transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction', resolvedParams.transactionId] });
      toast.success('Transaction retry initiated');
    },
    onError: (error: unknown) => {
      toast.error('Failed to retry transaction', {
        description: getApiErrorMessage(error, 'Unable to retry transaction'),
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <p className="text-muted-foreground">Transaction not found</p>
        <Button onClick={() => router.back()} variant="outline" className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const canReverse = transaction.status === 'COMPLETED' && !transaction.reversedAt;
  const canRetry = transaction.status === 'FAILED';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transaction Details</h2>
          <p className="text-muted-foreground font-mono">{transaction.reference}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Transaction Information */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Information</CardTitle>
            <CardDescription>Basic transaction details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Reference</p>
                <p className="text-sm font-mono">{transaction.reference}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="mt-1">
                  <StatusBadge status={transaction.status} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Type</p>
                <p className="text-sm">{transaction.type?.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Channel</p>
                <p className="text-sm">{transaction.channel || 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Amount</p>
                <p className="text-lg font-bold">
                  {formatCurrency(parseFloat(transaction.amount))}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fee</p>
                <p className="text-lg font-bold text-muted-foreground">
                  {formatCurrency(parseFloat(transaction.fee))}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
              <p className="text-xl font-bold">
                {formatCurrency(parseFloat(transaction.totalAmount))}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="text-sm">{transaction.description || 'N/A'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-sm">{formatDate(transaction.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Updated</p>
                <p className="text-sm">{formatDate(transaction.updatedAt)}</p>
              </div>
            </div>

            {transaction.reversedAt && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                <p className="text-sm font-medium text-destructive">Transaction Reversed</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(transaction.reversedAt)}
                </p>
                {transaction.reverseReason && (
                  <p className="text-xs mt-2">{transaction.reverseReason}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* User & Balance Information */}
        <Card>
          <CardHeader>
            <CardTitle>User & Balance Details</CardTitle>
            <CardDescription>User information and balance changes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {transaction.user && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">User</p>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">
                      {transaction.user.firstName} {transaction.user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{transaction.user.email}</p>
                    <p className="text-xs text-muted-foreground">{transaction.user.phone}</p>
                  </div>
                  <Link href={`/dashboard/users/${transaction.user.id}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <User className="h-4 w-4" />
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Balance Before</p>
                <p className="text-lg font-bold">
                  {formatCurrency(parseFloat(transaction.balanceBefore))}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Balance After</p>
                <p className="text-lg font-bold">
                  {formatCurrency(parseFloat(transaction.balanceAfter))}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Change</p>
                <p className="text-lg font-bold text-primary">
                  {parseFloat(transaction.balanceAfter) > parseFloat(transaction.balanceBefore)
                    ? '+'
                    : ''}
                  {formatCurrency(
                    parseFloat(transaction.balanceAfter) - parseFloat(transaction.balanceBefore),
                  )}
                </p>
              </div>
            </div>

            {transaction.provider && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Provider</p>
                <p className="text-sm">{transaction.provider}</p>
                {transaction.providerReference && (
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    {transaction.providerReference}
                  </p>
                )}
              </div>
            )}

            {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Metadata</p>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">
                  {JSON.stringify(transaction.metadata, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      {(canReverse || canRetry) && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Manage this transaction</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {canReverse && (
              <div className="space-y-3">
                <Label>Reverse Transaction</Label>
                <p className="text-sm text-muted-foreground">
                  This will refund the amount to the user&rsquo;s wallet. Please provide a reason.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Reason for reversal..."
                    value={reverseReason}
                    onChange={(e) => setReverseReason(e.target.value)}
                  />
                  <Button
                    variant="destructive"
                    onClick={() => setShowReverseConfirm(true)}
                    disabled={!reverseReason || reverseMutation.isPending}
                    className="gap-2"
                  >
                    <Undo2 className="h-4 w-4" />
                    Reverse
                  </Button>
                </div>
              </div>
            )}

            {canRetry && (
              <div className="space-y-3">
                <Label>Retry Transaction</Label>
                <p className="text-sm text-muted-foreground">
                  Attempt to process this failed transaction again.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowRetryConfirm(true)}
                  disabled={retryMutation.isPending}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Retry Transaction
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reverse Transaction Confirmation Dialog */}
      <ConfirmDialog
        open={showReverseConfirm}
        onOpenChange={setShowReverseConfirm}
        title="Reverse Transaction"
        description={`Are you sure you want to reverse this transaction? This will refund ${formatCurrency(parseFloat(transaction?.totalAmount || '0'))} to the user's wallet. This action cannot be undone.`}
        confirmText="Yes, Reverse"
        cancelText="Cancel"
        variant="danger"
        icon="reverse"
        isLoading={reverseMutation.isPending}
        onConfirm={async () => {
          await reverseMutation.mutateAsync(reverseReason);
          setShowReverseConfirm(false);
        }}
      />

      {/* Retry Transaction Confirmation Dialog */}
      <ConfirmDialog
        open={showRetryConfirm}
        onOpenChange={setShowRetryConfirm}
        title="Retry Transaction"
        description="Are you sure you want to retry this failed transaction? This will attempt to process it again."
        confirmText="Yes, Retry"
        cancelText="Cancel"
        variant="warning"
        icon="warning"
        isLoading={retryMutation.isPending}
        onConfirm={async () => {
          await retryMutation.mutateAsync();
          setShowRetryConfirm(false);
        }}
      />
    </div>
  );
}
