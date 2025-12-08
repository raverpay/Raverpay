'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Lock, Unlock, Clock, User, Mail, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface LockedAccount {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  lockedUntil: string | null;
  lastRateLimitLockAt: string;
  rateLimitLockReason: string;
  rateLimitLockCount: number;
}

export default function LockedAccountsPage() {
  const [accounts, setAccounts] = useState<LockedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<LockedAccount | null>(null);
  const [unlockReason, setUnlockReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchLockedAccounts();
  }, []);

  const fetchLockedAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/rate-limits/locked-accounts?limit=100');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.users);
      }
    } catch {
      console.error('Failed to load locked accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (accountId: string) => {
    setErrorMessage(null);

    if (!unlockReason.trim()) {
      setErrorMessage('Please provide a reason for unlocking this account');
      return;
    }

    setUnlockingId(accountId);
    try {
      const res = await fetch(`/api/admin/users/${accountId}/unlock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: unlockReason }),
      });

      if (res.ok) {
        setSelectedAccount(null);
        setUnlockReason('');
        fetchLockedAccounts();
        alert('Account unlocked successfully');
      } else {
        throw new Error('Failed to unlock account');
      }
    } catch {
      setErrorMessage('Failed to unlock account. Please try again.');
    } finally {
      setUnlockingId(null);
    }
  };

  const isPermanentLock = (account: LockedAccount) => {
    return account.lockedUntil === null && account.rateLimitLockReason;
  };

  const getLockDuration = (account: LockedAccount) => {
    if (isPermanentLock(account)) {
      return 'Permanent';
    }
    if (!account.lockedUntil) return 'Unknown';

    const unlockDate = new Date(account.lockedUntil);
    const now = new Date();
    const diff = unlockDate.getTime() - now.getTime();

    if (diff <= 0) return 'Expired (auto-unlocking soon)';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days !== 1 ? 's' : ''} remaining`;
    }
    return `${hours}h ${minutes}m remaining`;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Lock className="mx-auto h-8 w-8 animate-pulse text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading locked accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Locked Accounts</h1>
        <p className="text-muted-foreground">Accounts locked due to rate limit violations</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Locked</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permanent Locks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.filter(isPermanentLock).length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temporary Locks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accounts.filter((a) => !isPermanentLock(a)).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Locked Accounts List */}
      <Card>
        <CardHeader>
          <CardTitle>Locked Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="py-12 text-center">
              <Lock className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
              <p className="mt-2 text-muted-foreground">No locked accounts</p>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-start justify-between rounded-lg border p-4"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {account.firstName} {account.lastName}
                        </p>
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {account.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge variant={isPermanentLock(account) ? 'destructive' : 'secondary'}>
                        {getLockDuration(account)}
                      </Badge>
                      <Badge variant="outline">Lock #{account.rateLimitLockCount}</Badge>
                      {account.lockedUntil && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Until: {new Date(account.lockedUntil).toLocaleString()}
                        </span>
                      )}
                    </div>

                    <div className="rounded-md bg-muted p-2">
                      <p className="text-xs font-medium text-muted-foreground">Reason:</p>
                      <p className="text-sm">{account.rateLimitLockReason}</p>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Locked at: {new Date(account.lastRateLimitLockAt).toLocaleString()}
                    </p>
                  </div>

                  <Button
                    onClick={() => setSelectedAccount(account)}
                    variant="outline"
                    size="sm"
                    className="ml-4"
                  >
                    <Unlock className="mr-2 h-4 w-4" />
                    Unlock
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unlock Confirmation Dialog */}
      <Dialog open={!!selectedAccount} onOpenChange={() => setSelectedAccount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Account</DialogTitle>
            <DialogDescription>
              You are about to unlock the account for{' '}
              <strong>
                {selectedAccount?.firstName} {selectedAccount?.lastName}
              </strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm">
                <strong>Email:</strong> {selectedAccount?.email}
              </p>
              <p className="text-sm mt-1">
                <strong>Lock Reason:</strong> {selectedAccount?.rateLimitLockReason}
              </p>
              <p className="text-sm mt-1">
                <strong>Times Locked:</strong> {selectedAccount?.rateLimitLockCount}
              </p>
            </div>

            {errorMessage && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {errorMessage}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="unlockReason" className="text-sm font-medium">
                Reason for Unlocking (Required)
              </label>
              <Textarea
                id="unlockReason"
                placeholder="E.g., User contacted support and verified identity, false positive, testing, etc."
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedAccount(null);
                setErrorMessage(null);
                setUnlockReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedAccount && handleUnlock(selectedAccount.id)}
              disabled={!unlockReason.trim() || unlockingId === selectedAccount?.id}
            >
              {unlockingId === selectedAccount?.id ? 'Unlocking...' : 'Unlock Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
