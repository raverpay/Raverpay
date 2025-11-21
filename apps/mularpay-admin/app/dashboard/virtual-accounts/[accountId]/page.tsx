'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Snowflake, Unlock, XCircle, User } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

import { virtualAccountsApi } from '@/lib/api/virtual-accounts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, getApiErrorMessage } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { VirtualAccount } from '@/types';

export default function VirtualAccountDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [freezeReason, setFreezeReason] = useState('');
  const [closeReason, setCloseReason] = useState('');

  const { data: account, isPending: isLoading } = useQuery<VirtualAccount | VirtualAccount[]>({
    queryKey: ['virtual-account', resolvedParams.accountId],
    queryFn: () => virtualAccountsApi.getById(resolvedParams.accountId),
  });

  const freezeMutation = useMutation({
    mutationFn: (reason: string) => virtualAccountsApi.freeze(resolvedParams.accountId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-account', resolvedParams.accountId] });
      queryClient.invalidateQueries({ queryKey: ['virtual-accounts'] });
      toast.success('Virtual account frozen successfully');
      setFreezeReason('');
    },
    onError: (error: unknown) => {
      toast.error('Failed to freeze account', {
        description: getApiErrorMessage(error, 'Unable to freeze account'),
      });
    },
  });

  const unfreezeMutation = useMutation({
    mutationFn: () => virtualAccountsApi.unfreeze(resolvedParams.accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-account', resolvedParams.accountId] });
      queryClient.invalidateQueries({ queryKey: ['virtual-accounts'] });
      toast.success('Virtual account unfrozen successfully');
    },
    onError: (error: unknown) => {
      toast.error('Failed to unfreeze account', {
        description: getApiErrorMessage(error, 'Unable to unfreeze account'),
      });
    },
  });

  const closeMutation = useMutation({
    mutationFn: (reason: string) => virtualAccountsApi.close(resolvedParams.accountId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-account', resolvedParams.accountId] });
      queryClient.invalidateQueries({ queryKey: ['virtual-accounts'] });
      toast.success('Virtual account closed successfully');
      setCloseReason('');
    },
    onError: (error: unknown) => {
      toast.error('Failed to close account', {
        description: getApiErrorMessage(error, 'Unable to close account'),
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

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <p className="text-muted-foreground">Virtual account not found</p>
        <Button onClick={() => router.back()} variant="outline" className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const accounts: VirtualAccount[] = Array.isArray(account) ? account : [account];
  const primaryAccount = accounts[0];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'FROZEN':
        return (
          <Badge variant="warning" className="gap-1">
            <Snowflake className="h-3 w-3" />
            Frozen
          </Badge>
        );
      case 'CLOSED':
        return <Badge variant="destructive">Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // account is an array so adjust the below logic
  // Don't just pick the first account, check the status of all accounts
  const canFreeze = accounts.some((item) => item.status === 'ACTIVE');
  const canUnfreeze = accounts.some((item) => item.status === 'FROZEN');
  const canClose = accounts.some((item) => item.status === 'ACTIVE' || item.status === 'FROZEN');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Virtual Account Details</h2>
          <p className="text-muted-foreground font-mono">{primaryAccount?.accountNumber}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Virtual bank account details</CardDescription>
          </CardHeader>

          {accounts.map((acct) => (
            <CardContent className="space-y-4" key={acct.id}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Account Number</p>
                  <p className="text-lg font-mono font-bold">{acct.accountNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(acct.status)}</div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Account Name</p>
                <p className="text-sm">{acct.accountName || 'N/A'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Bank Name</p>
                  <p className="text-sm">{acct.bankName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Provider</p>
                  <p className="text-sm">{acct.provider || 'N/A'}</p>
                </div>
              </div>

              {acct.bankCode && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Bank Code</p>
                  <p className="text-sm font-mono">{acct.bankCode}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="text-sm">{formatDate(acct.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Updated</p>
                  <p className="text-sm">{formatDate(acct.updatedAt)}</p>
                </div>
              </div>

              {acct.frozenAt && (
                <div className="rounded-lg border border-orange-500 bg-orange-50 dark:bg-orange-950/20 p-4">
                  <p className="text-sm font-medium text-orange-600">Account Frozen</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(acct.frozenAt)}</p>
                  {acct.freezeReason && <p className="text-xs mt-2">{acct.freezeReason}</p>}
                </div>
              )}

              {acct.closedAt && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                  <p className="text-sm font-medium text-destructive">Account Closed</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(acct.closedAt)}</p>
                  {acct.closeReason && <p className="text-xs mt-2">{acct.closeReason}</p>}
                </div>
              )}
            </CardContent>
          ))}
        </Card>

        {/* User Information */}
        {primaryAccount && accounts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>Account owner details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {accounts.map(
                (acct) =>
                  acct.user && (
                    <>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">User</p>
                        <div className="flex items-center justify-between p-3 rounded-lg border">
                          <div>
                            <p className="font-medium">
                              {acct.user.firstName} {acct.user.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">{acct.user.email}</p>
                            <p className="text-xs text-muted-foreground">{acct.user.phone}</p>
                          </div>
                          <Link href={`/dashboard/users/${acct.user.id}`}>
                            <Button variant="outline" size="sm" className="gap-2">
                              <User className="h-4 w-4" />
                              View
                            </Button>
                          </Link>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Account Status</p>
                        <div className="mt-1">
                          <Badge
                            variant={acct.user.status === 'ACTIVE' ? 'success' : 'destructive'}
                          >
                            {acct.user.status}
                          </Badge>
                        </div>
                      </div>
                    </>
                  ),
              )}

              {primaryAccount?.metadata && Object.keys(primaryAccount.metadata).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Metadata</p>
                  <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">
                    {JSON.stringify(primaryAccount.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actions */}
      {(canFreeze || canUnfreeze || canClose) && (
        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
            <CardDescription>Manage this virtual account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {canFreeze && (
              <div className="space-y-3">
                <Label>Freeze Account</Label>
                <p className="text-sm text-muted-foreground">
                  Temporarily freeze this virtual account. Provide a reason.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Reason for freezing..."
                    value={freezeReason}
                    onChange={(e) => setFreezeReason(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => freezeReason && freezeMutation.mutate(freezeReason)}
                    disabled={!freezeReason || freezeMutation.isPending}
                    className="gap-2"
                  >
                    <Snowflake className="h-4 w-4" />
                    Freeze
                  </Button>
                </div>
              </div>
            )}

            {canUnfreeze && (
              <div className="space-y-3">
                <Label>Unfreeze Account</Label>
                <p className="text-sm text-muted-foreground">
                  Restore this frozen account to active status.
                </p>
                <Button
                  variant="default"
                  onClick={() => unfreezeMutation.mutate()}
                  disabled={unfreezeMutation.isPending}
                  className="gap-2"
                >
                  <Unlock className="h-4 w-4" />
                  Unfreeze Account
                </Button>
              </div>
            )}

            {canClose && (
              <div className="space-y-3">
                <Label>Close Account</Label>
                <p className="text-sm text-muted-foreground">
                  Permanently close this virtual account. This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Reason for closing..."
                    value={closeReason}
                    onChange={(e) => setCloseReason(e.target.value)}
                  />
                  <Button
                    variant="destructive"
                    onClick={() => closeReason && closeMutation.mutate(closeReason)}
                    disabled={!closeReason || closeMutation.isPending}
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Close
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
