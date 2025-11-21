'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, User, Bitcoin } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';

import { cryptoApi } from '@/lib/api/crypto';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatCurrency, getApiErrorMessage } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function CryptoDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [approvalAmount, setApprovalAmount] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const { data: order, isLoading } = useQuery({
    queryKey: ['crypto-order', resolvedParams.orderId],
    queryFn: () => cryptoApi.getById(resolvedParams.orderId),
  });

  const approveMutation = useMutation({
    mutationFn: (amount: number) => cryptoApi.approve(resolvedParams.orderId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crypto-order', resolvedParams.orderId] });
      queryClient.invalidateQueries({ queryKey: ['crypto'] });
      toast.success('Crypto order approved successfully');
      setApprovalAmount('');
    },
    onError: (error: unknown) => {
      toast.error('Failed to approve order', {
        description: getApiErrorMessage(error, 'Unable to approve order'),
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => cryptoApi.reject(resolvedParams.orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crypto-order', resolvedParams.orderId] });
      queryClient.invalidateQueries({ queryKey: ['crypto'] });
      toast.success('Crypto order rejected');
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
          <h2 className="text-3xl font-bold tracking-tight">Crypto Order Details</h2>
          <p className="text-muted-foreground font-mono">{order.reference}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Order Information */}
        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
            <CardDescription>Cryptocurrency order details</CardDescription>
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
                  <Bitcoin className="h-4 w-4" />
                  {order.type}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cryptocurrency</p>
                <p className="text-sm">{order.asset || 'N/A'}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Network</p>
              <p className="text-sm">{order.network || 'N/A'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Crypto Amount</p>
                <p className="text-lg font-bold font-mono">
                  {order.cryptoAmount ? parseFloat(order.cryptoAmount).toFixed(8) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">NGN Amount</p>
                <p className="text-lg font-bold">{formatCurrency(parseFloat(order.nairaAmount))}</p>
              </div>
            </div>

            {order.rate && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Exchange Rate</p>
                <p className="text-sm">₦{parseFloat(order.rate).toFixed(2)} per unit</p>
              </div>
            )}

            {order.walletAddress && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Wallet Address</p>
                <p className="text-sm font-mono bg-muted p-2 rounded break-all">
                  {order.walletAddress}
                </p>
              </div>
            )}

            {order.txHash && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Transaction Hash</p>
                <p className="text-sm font-mono bg-muted p-2 rounded break-all">{order.txHash}</p>
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

            {order.rejectionReason && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                <p className="text-sm font-medium text-destructive">Rejection Reason</p>
                <p className="text-xs mt-1">{order.rejectionReason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User & Transaction Details */}
        <Card>
          <CardHeader>
            <CardTitle>User & Transaction Details</CardTitle>
            <CardDescription>Customer information and proof of transaction</CardDescription>
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

            {order.proofImages && order.proofImages.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Proof of Transaction
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {order.proofImages.map((image, index) => (
                    <div
                      key={index}
                      className="relative aspect-video rounded-lg overflow-hidden border"
                    >
                      <Image
                        src={image}
                        alt={`Proof ${index + 1}`}
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
            <CardDescription>Approve or reject this crypto order</CardDescription>
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
