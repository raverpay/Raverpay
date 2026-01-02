'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, AlertCircle, CheckCircle2, ExternalLink, Clock } from 'lucide-react';
import { feesApi, type FailedFee } from '@/lib/api/fees';
import { toast } from 'sonner';
import { format } from 'date-fns';
import Link from 'next/link';

export default function FeeRetriesPage() {
  const queryClient = useQueryClient();
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Fetch failed fees
  const {
    data: failedFeesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['failed-fees'],
    queryFn: () => feesApi.getFailedFees(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Retry mutation
  const retryMutation = useMutation({
    mutationFn: (retryId: string) => feesApi.retryFee(retryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['failed-fees'] });
      queryClient.invalidateQueries({ queryKey: ['fee-stats'] });
      toast.success('Fee retry initiated successfully');
      setRetryingId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to retry fee collection');
      setRetryingId(null);
    },
  });

  const handleRetry = (retryId: string) => {
    setRetryingId(retryId);
    retryMutation.mutate(retryId);
  };

  const failedFees = failedFeesData?.data || [];
  const hasFailedFees = failedFees.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Failed Fee Collections</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Monitor and retry failed fee collection attempts
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Status Alert */}
      {hasFailedFees ? (
        <Alert className="border-yellow-500">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <AlertDescription>
            <strong>{failedFees.length}</strong> failed fee collection
            {failedFees.length > 1 ? 's' : ''} detected. These will be automatically retried every 5
            minutes (max 3 attempts).
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-green-500">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription>
            <strong>All clear!</strong> No failed fee collections at this time.
          </AlertDescription>
        </Alert>
      )}

      {/* Failed Fees Table */}
      {hasFailedFees && (
        <Card>
          <CardHeader>
            <CardTitle>Retry Queue</CardTitle>
            <CardDescription>Failed fee collections pending retry</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Blockchain</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Next Retry</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failedFees.map((fee) => (
                    <TableRow key={fee.id}>
                      {/* Transaction ID */}
                      <TableCell>
                        <Link
                          href={`/dashboard/circle-wallets/transactions/${fee.mainTransferId}`}
                          className="text-blue-600 hover:underline font-mono text-xs"
                        >
                          {fee.mainTransferId.slice(0, 8)}...
                        </Link>
                      </TableCell>

                      {/* User */}
                      <TableCell>
                        {fee.user ? (
                          <div className="text-sm">
                            <div className="font-medium">
                              {fee.user.firstName} {fee.user.lastName}
                            </div>
                            <div className="text-xs text-gray-500">{fee.user.email}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">—</span>
                        )}
                      </TableCell>

                      {/* Fee Amount */}
                      <TableCell>
                        <span className="font-medium">{parseFloat(fee.fee).toFixed(4)} USDC</span>
                      </TableCell>

                      {/* Blockchain */}
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {fee.blockchain}
                        </Badge>
                      </TableCell>

                      {/* Retry Attempts */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={fee.retryCount >= fee.maxRetries ? 'destructive' : 'secondary'}
                          >
                            {fee.retryCount}/{fee.maxRetries}
                          </Badge>
                          {fee.retryCount >= fee.maxRetries && (
                            <span className="text-xs text-red-600">Max reached</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Next Retry */}
                      <TableCell>
                        {fee.nextRetryAt ? (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Clock className="h-3 w-3" />
                            {format(new Date(fee.nextRetryAt), 'MMM d, h:mm a')}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </TableCell>

                      {/* Error Message */}
                      <TableCell>
                        <div className="max-w-xs truncate text-xs text-red-600">
                          {fee.lastError || 'Unknown error'}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetry(fee.id)}
                          disabled={
                            retryingId === fee.id ||
                            retryMutation.isPending ||
                            fee.retryCount >= fee.maxRetries
                          }
                        >
                          {retryingId === fee.id ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              Retrying...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="mr-2 h-3 w-3" />
                              Retry Now
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Card */}
      <Card>
        <CardHeader>
          <CardTitle>About Automatic Retries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>Failed fee collections are automatically retried by the system:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Retry interval: Every 5 minutes</li>
            <li>Maximum attempts: 3 per failed fee</li>
            <li>After 3 failed attempts, manual intervention may be required</li>
          </ul>
          <p className="text-xs mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
            <strong>Note:</strong> Failed fees don't prevent the main transfer from succeeding.
            Users will receive their funds even if fee collection fails.
          </p>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Related Pages</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/dashboard/circle-wallets/fee-config">
            <Button variant="outline" size="sm">
              Fee Configuration
              <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          </Link>
          <Link href="/dashboard/circle-wallets/fee-collection">
            <Button variant="outline" size="sm">
              Collection Overview
              <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          </Link>
          <Link href="/dashboard/circle-wallets/transactions">
            <Button variant="outline" size="sm">
              All Transactions
              <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
