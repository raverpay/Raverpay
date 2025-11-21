'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, User, Gift } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';

import { giftcardsApi } from '@/lib/api/giftcards';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatCurrency, getApiErrorMessage } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function GiftCardDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [approvalAmount, setApprovalAmount] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const { data: order, isLoading } = useQuery({
    queryKey: ['giftcard-order', resolvedParams.orderId],
    queryFn: () => giftcardsApi.getById(resolvedParams.orderId),
  });

  const approveMutation = useMutation({
    mutationFn: (amount: number) => giftcardsApi.approve(resolvedParams.orderId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['giftcard-order', resolvedParams.orderId] });
      queryClient.invalidateQueries({ queryKey: ['giftcards'] });
      toast.success('Gift card order approved successfully');
      setApprovalAmount('');
    },
    onError: (error: unknown) => {
      toast.error('Failed to approve order', {
        description: getApiErrorMessage(error, 'Unable to approve order'),
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => giftcardsApi.reject(resolvedParams.orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['giftcard-order', resolvedParams.orderId] });
      queryClient.invalidateQueries({ queryKey: ['giftcards'] });
      toast.success('Gift card order rejected');
      setRejectReason('');
    },
    onError: (error: unknown) => {
      toast.error('Failed to reject order', {
        description: getApiErrorMessage(error, 'Unable to reject order'),
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

  const canApprove = order.status === 'PENDING' || order.status === 'PROCESSING';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gift Card Order Details</h2>
          <p className="text-muted-foreground font-mono">{order.reference}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Order Information */}
        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
            <CardDescription>Gift card order details</CardDescription>
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
                  <Gift className="h-4 w-4" />
                  {order.type}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Card Category</p>
                <p className="text-sm">{order.cardCategory || 'N/A'}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Card Name</p>
              <p className="text-lg font-bold">{order.cardName || 'N/A'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Card Value</p>
                <p className="text-lg font-bold">
                  {order.cardValue ? `$${parseFloat(order.cardValue).toFixed(2)}` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Amount (NGN)</p>
                <p className="text-lg font-bold">{formatCurrency(parseFloat(order.amount))}</p>
              </div>
            </div>

            {order.rate && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Exchange Rate</p>
                <p className="text-sm">₦{parseFloat(order.rate).toFixed(2)} per $1</p>
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

            {order.rejectReason && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                <p className="text-sm font-medium text-destructive">Rejection Reason</p>
                <p className="text-xs mt-1">{order.rejectReason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle>User & Card Details</CardTitle>
            <CardDescription>Customer information and card images</CardDescription>
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

            {order.cardImages && order.cardImages.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Card Images</p>
                <div className="grid grid-cols-2 gap-2">
                  {order.cardImages.map((image, index) => (
                    <div
                      key={index}
                      className="relative aspect-video rounded-lg overflow-hidden border"
                    >
                      <Image
                        src={image}
                        alt={`Card image ${index + 1}`}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {order.cardCode && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Card Code</p>
                <p className="text-sm font-mono bg-muted p-2 rounded">{order.cardCode}</p>
              </div>
            )}

            {order.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Notes</p>
                <p className="text-sm">{order.notes}</p>
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
      {canApprove && (
        <Card>
          <CardHeader>
            <CardTitle>Review Actions</CardTitle>
            <CardDescription>Approve or reject this gift card order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Approve Order</Label>
              <p className="text-sm text-muted-foreground">
                Enter the final amount to credit the user&rsquo;s wallet (in NGN)
              </p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Amount in NGN..."
                  value={approvalAmount}
                  onChange={(e) => setApprovalAmount(e.target.value)}
                />
                <Button
                  variant="default"
                  onClick={() =>
                    approvalAmount && approveMutation.mutate(parseFloat(approvalAmount))
                  }
                  disabled={!approvalAmount || approveMutation.isPending}
                  className="gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Reject Order</Label>
              <p className="text-sm text-muted-foreground">
                Provide a reason for rejecting this order
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Reason for rejection..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <Button
                  variant="destructive"
                  onClick={() => rejectReason && rejectMutation.mutate(rejectReason)}
                  disabled={!rejectReason || rejectMutation.isPending}
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
