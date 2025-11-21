'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Lock,
  Unlock,
  DollarSign,
  User,
  Activity,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

import { walletsApi } from '@/lib/api/wallets';
import { transactionsApi } from '@/lib/api/transactions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatCurrency, getApiErrorMessage } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function WalletDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [lockReason, setLockReason] = useState('');
  const [unlockReason, setUnlockReason] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustReason, setAdjustReason] = useState('');

  const { data: walletData, isLoading } = useQuery({
    queryKey: ['wallet', resolvedParams.userId],
    queryFn: () => walletsApi.getById(resolvedParams.userId),
  });

  const { data: recentTransactions } = useQuery({
    queryKey: ['wallet-transactions', resolvedParams.userId],
    queryFn: () =>
      transactionsApi.getAll({
        userId: resolvedParams.userId,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
  });

  const lockMutation = useMutation({
    mutationFn: (reason: string) => walletsApi.lock(resolvedParams.userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet', resolvedParams.userId] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toast.success('Wallet locked successfully');
      setLockReason('');
    },
    onError: (error: unknown) => {
      toast.error('Failed to lock wallet', {
        description: getApiErrorMessage(error, 'Unable to lock wallet'),
      });
    },
  });

  const unlockMutation = useMutation({
    mutationFn: (reason: string) => walletsApi.unlock(resolvedParams.userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet', resolvedParams.userId] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toast.success('Wallet unlocked successfully');
      setUnlockReason('');
    },
    onError: (error: unknown) => {
      toast.error('Failed to unlock wallet', {
        description: getApiErrorMessage(error, 'Unable to unlock wallet'),
      });
    },
  });

  const adjustMutation = useMutation({
    mutationFn: ({
      amount,
      type,
      reason,
    }: {
      amount: number;
      type: 'credit' | 'debit';
      reason: string;
    }) => walletsApi.adjust(resolvedParams.userId, amount, type, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet', resolvedParams.userId] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions', resolvedParams.userId] });
      toast.success('Wallet balance adjusted successfully');
      setAdjustAmount('');
      setAdjustReason('');
    },
    onError: (error: unknown) => {
      toast.error('Failed to adjust wallet balance', {
        description: getApiErrorMessage(error, 'Unable to adjust wallet balance'),
      });
    },
  });

  const resetLimitsMutation = useMutation({
    mutationFn: () => walletsApi.resetLimits(resolvedParams.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet', resolvedParams.userId] });
      toast.success('Spending limits reset successfully');
    },
    onError: (error: unknown) => {
      toast.error('Failed to reset limits', {
        description: getApiErrorMessage(error, 'Unable to reset limits'),
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

  if (!walletData) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <p className="text-muted-foreground">Wallet not found</p>
        <Button onClick={() => router.back()} variant="outline" className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const wallet = walletData;
  const canLock = !wallet.isLocked;
  const canUnlock = wallet.isLocked;

  console.log({ wallet });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight">Wallet Details</h2>
          <p className="text-muted-foreground">
            {wallet.user?.firstName} {wallet.user?.lastName}
          </p>
        </div>
        {wallet.isLocked ? (
          <Badge variant="destructive" className="gap-1">
            <Lock className="h-3 w-3" />
            Locked
          </Badge>
        ) : (
          <Badge variant="success" className="gap-1">
            <Unlock className="h-3 w-3" />
            Active
          </Badge>
        )}
      </div>

      {/* Balance Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Available Balance
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(parseFloat(wallet.balance))}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ledger Balance
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(parseFloat(wallet.ledgerBalance))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Daily Spent
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(parseFloat(wallet.dailySpent))}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Monthly Spent
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(parseFloat(wallet.monthlySpent))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Wallet Information */}
        <Card>
          <CardHeader>
            <CardTitle>Wallet Information</CardTitle>
            <CardDescription>Wallet details and limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available Balance</p>
                <p className="text-lg font-bold">
                  {formatCurrency(parseFloat(wallet.balance))}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ledger Balance</p>
                <p className="text-lg font-bold">
                  {formatCurrency(parseFloat(wallet.ledgerBalance))}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Daily Spent</p>
                <p className="text-sm">{formatCurrency(parseFloat(wallet.dailySpent))}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Spent</p>
                <p className="text-sm">{formatCurrency(parseFloat(wallet.monthlySpent))}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-sm">{formatDate(wallet.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Updated</p>
                <p className="text-sm">{formatDate(wallet.updatedAt)}</p>
              </div>
            </div>

            {wallet.lastResetAt && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Limit Reset</p>
                <p className="text-sm">{formatDate(wallet.lastResetAt)}</p>
              </div>
            )}

            <div className="pt-4">
              <Button
                variant="outline"
                onClick={() => resetLimitsMutation.mutate()}
                disabled={resetLimitsMutation.isPending}
                className="w-full"
              >
                Reset Spending Limits
              </Button>
            </div>

            {wallet.isLocked && wallet.lockReason && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                <p className="text-sm font-medium text-destructive">Lock Reason</p>
                <p className="text-xs mt-1">{wallet.lockReason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>Wallet owner details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {wallet.user && (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">User</p>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">
                        {wallet.user.firstName} {wallet.user.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{wallet.user.email}</p>
                    </div>
                    <Link href={`/dashboard/users/${wallet.user.id}`}>
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
                    <Badge variant={wallet.user.status === 'ACTIVE' ? 'success' : 'destructive'}>
                      {wallet.user.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">KYC Tier</p>
                  <p className="text-sm">Tier {wallet.user.kycTier || 1}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Wallet Actions</CardTitle>
          <CardDescription>Manage this wallet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Lock/Unlock */}
          {canLock && (
            <div className="space-y-3">
              <Label>Lock Wallet</Label>
              <p className="text-sm text-muted-foreground">
                Prevent all transactions on this wallet. Provide a reason.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Reason for locking..."
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                />
                <Button
                  variant="destructive"
                  onClick={() => lockReason && lockMutation.mutate(lockReason)}
                  disabled={!lockReason || lockMutation.isPending}
                  className="gap-2"
                >
                  <Lock className="h-4 w-4" />
                  Lock
                </Button>
              </div>
            </div>
          )}

          {canUnlock && (
            <div className="space-y-3">
              <Label>Unlock Wallet</Label>
              <p className="text-sm text-muted-foreground">
                Restore wallet to active status. Provide a reason.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Reason for unlocking..."
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                />
                <Button
                  variant="default"
                  onClick={() => unlockReason && unlockMutation.mutate(unlockReason)}
                  disabled={!unlockReason || unlockMutation.isPending}
                  className="gap-2"
                >
                  <Unlock className="h-4 w-4" />
                  Unlock
                </Button>
              </div>
            </div>
          )}

          {/* Adjust Balance */}
          <div className="space-y-3">
            <Label>Adjust Balance</Label>
            <p className="text-sm text-muted-foreground">
              Credit or debit the wallet balance. Provide amount and reason.
            </p>
            <div className="flex gap-2">
              <Select
                value={adjustType}
                onValueChange={(v) => setAdjustType(v as 'credit' | 'debit')}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="debit">Debit</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Amount..."
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
              />
              <Input
                placeholder="Reason..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={() =>
                  adjustAmount &&
                  adjustReason &&
                  adjustMutation.mutate({
                    amount: parseFloat(adjustAmount),
                    type: adjustType,
                    reason: adjustReason,
                  })
                }
                disabled={!adjustAmount || !adjustReason || adjustMutation.isPending}
                className="gap-2"
              >
                <DollarSign className="h-4 w-4" />
                Adjust
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      {recentTransactions?.data && recentTransactions.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Last 10 transactions on this wallet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.data.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono text-sm">{transaction.reference}</TableCell>
                      <TableCell>
                        <span className="text-xs">{transaction.type.replace(/_/g, ' ')}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(parseFloat(transaction.amount))}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={transaction.status} />
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(transaction.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/dashboard/transactions/${transaction.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
