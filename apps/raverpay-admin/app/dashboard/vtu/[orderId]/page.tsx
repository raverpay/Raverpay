'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, Undo2, User, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

import { vtuApi } from '@/lib/api/vtu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatCurrency, getApiErrorMessage } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function VTUDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refundReason, setRefundReason] = useState('');

  const { data: order, isLoading } = useQuery({
    queryKey: ['vtu-order', resolvedParams.orderId],
    queryFn: () => vtuApi.getById(resolvedParams.orderId),
  });

  const refundMutation = useMutation({
    mutationFn: (reason: string) => vtuApi.refund(resolvedParams.orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vtu-order', resolvedParams.orderId] });
      queryClient.invalidateQueries({ queryKey: ['vtu'] });
      toast.success('Order refunded successfully');
      setRefundReason('');
    },
    onError: (error: unknown) => {
      toast.error('Failed to refund order', {
        description: getApiErrorMessage(error, 'Unable to refund order'),
      });
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => vtuApi.retry(resolvedParams.orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vtu-order', resolvedParams.orderId] });
      toast.success('Order retry initiated');
    },
    onError: (error: unknown) => {
      toast.error('Failed to retry order', {
        description: getApiErrorMessage(error, 'Unable to retry order'),
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

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <p className="text-muted-foreground">Order not found</p>
        <Button onClick={() => router.back()} variant="outline" className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const canRefund = order.status === 'COMPLETED' && !order.refundedAt;
  const canRetry = order.status === 'FAILED';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">VTU Order Details</h2>
          <p className="text-muted-foreground font-mono">{order.reference}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Order Information */}
        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
            <CardDescription>VTU order details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Reference</p>
                <p className="text-sm font-mono">{order.reference}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="mt-1">
                  <StatusBadge status={order.status} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Type</p>
                <p className="text-sm flex items-center gap-2">
                  {order.type === 'AIRTIME' ? (
                    <Smartphone className="h-4 w-4" />
                  ) : (
                    <Smartphone className="h-4 w-4" />
                  )}
                  {order.type}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Network</p>
                <p className="text-sm">{order.network || 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone Number</p>
                <p className="text-sm font-mono">{order.phoneNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Amount</p>
                <p className="text-lg font-bold">{formatCurrency(parseFloat(order.amount))}</p>
              </div>
            </div>

            {order.dataBundle && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Data Bundle</p>
                <p className="text-sm">{order.dataBundle}</p>
              </div>
            )}

            {/* Education Services - Display PINs/Tokens */}
            {(order.type === 'JAMB' ||
              order.type === 'WAEC_REGISTRATION' ||
              order.type === 'WAEC_RESULT') &&
              order.providerToken && (
                <div className="rounded-lg border border-primary bg-primary/5 p-4">
                  <p className="text-sm font-medium text-primary mb-2">
                    {order.type === 'JAMB' && 'JAMB PIN'}
                    {order.type === 'WAEC_REGISTRATION' && 'Registration Token'}
                    {order.type === 'WAEC_RESULT' && 'Result Checker Cards'}
                  </p>
                  {order.type === 'WAEC_RESULT' ? (
                    <div className="space-y-2">
                      {(() => {
                        try {
                          const cards = JSON.parse(order.providerToken);
                          return Array.isArray(cards) ? (
                            cards.map((card: any, idx: number) => (
                              <div
                                key={idx}
                                className="bg-background p-2 rounded border text-xs font-mono"
                              >
                                <div>
                                  <strong>Serial:</strong> {card.Serial}
                                </div>
                                <div>
                                  <strong>PIN:</strong> {card.Pin}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs font-mono">{order.providerToken}</p>
                          );
                        } catch {
                          return <p className="text-xs font-mono">{order.providerToken}</p>;
                        }
                      })()}
                    </div>
                  ) : (
                    <p className="text-lg font-mono font-bold tracking-wide">
                      {order.providerToken}
                    </p>
                  )}
                </div>
              )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-sm">{formatDate(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Updated</p>
                <p className="text-sm">{formatDate(order.updatedAt)}</p>
              </div>
            </div>

            {order.completedAt && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-sm">{formatDate(order.completedAt)}</p>
              </div>
            )}

            {order.refundedAt && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                <p className="text-sm font-medium text-destructive">Order Refunded</p>
                <p className="text-xs text-muted-foreground mt-1">{formatDate(order.refundedAt)}</p>
                {order.refundReason && <p className="text-xs mt-2">{order.refundReason}</p>}
              </div>
            )}

            {order.failureReason && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                <p className="text-sm font-medium text-destructive">Failure Reason</p>
                <p className="text-xs mt-1">{order.failureReason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User & Provider Information */}
        <Card>
          <CardHeader>
            <CardTitle>User & Provider Details</CardTitle>
            <CardDescription>Customer and service provider information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.user && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">User</p>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">
                      {order.user.firstName} {order.user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{order.user.email}</p>
                    <p className="text-xs text-muted-foreground">{order.user.phone}</p>
                  </div>
                  <Link href={`/dashboard/users/${order.user.id}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <User className="h-4 w-4" />
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {order.provider && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Provider</p>
                <p className="text-sm">{order.provider}</p>
                {order.providerReference && (
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    {order.providerReference}
                  </p>
                )}
              </div>
            )}

            {order.providerResponse && Object.keys(order.providerResponse).length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Provider Response</p>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">
                  {JSON.stringify(order.providerResponse, null, 2)}
                </pre>
              </div>
            )}

            {order.metadata && Object.keys(order.metadata).length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Metadata</p>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">
                  {JSON.stringify(order.metadata, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      {(canRefund || canRetry) && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Manage this VTU order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {canRefund && (
              <div className="space-y-3">
                <Label>Refund Order</Label>
                <p className="text-sm text-muted-foreground">
                  This will refund the amount to the user&rsquo;s wallet. Please provide a reason.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Reason for refund..."
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                  />
                  <Button
                    variant="destructive"
                    onClick={() => refundReason && refundMutation.mutate(refundReason)}
                    disabled={!refundReason || refundMutation.isPending}
                    className="gap-2"
                  >
                    <Undo2 className="h-4 w-4" />
                    Refund
                  </Button>
                </div>
              </div>
            )}

            {canRetry && (
              <div className="space-y-3">
                <Label>Retry Order</Label>
                <p className="text-sm text-muted-foreground">
                  Attempt to process this failed order again.
                </p>
                <Button
                  variant="outline"
                  onClick={() => retryMutation.mutate()}
                  disabled={retryMutation.isPending}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Retry Order
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
