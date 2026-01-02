'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, Copy, ExternalLink, Key, Wallet, Zap } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, truncateAddress } from '@/lib/utils';
import { toast } from 'sonner';
import { circleApi } from '@/lib/api/circle';

export default function ModularWalletDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: wallet, isLoading } = useQuery({
    queryKey: ['modular-wallet', id],
    queryFn: () => circleApi.getModularWalletById(id),
  });

  const { data: passkeys } = useQuery({
    queryKey: ['modular-wallet-passkeys', id],
    queryFn: () => circleApi.getModularWalletPasskeys(id),
    enabled: !!wallet,
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Wallet not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/circle-wallets/modular">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Modular Wallets
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              Modular Wallet Details
            </h2>
            <p className="text-muted-foreground">View wallet information and passkey credentials</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          <Zap className="h-3 w-3 mr-1" />
          Gasless
        </Badge>
      </div>

      {/* Wallet Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Wallet Information</CardTitle>
            <CardDescription>Smart contract wallet details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Wallet Address</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm bg-muted px-3 py-2 rounded flex-1 font-mono">
                  {wallet.address}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(wallet.address, 'Address')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(`https://amoy.polygonscan.com/address/${wallet.address}`, '_blank')
                  }
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Blockchain</label>
              <div className="mt-1">
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  {wallet.blockchain}
                </Badge>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Wallet Name</label>
              <p className="text-sm mt-1">{wallet.name || 'Unnamed Wallet'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">State</label>
              <div className="mt-1">
                <Badge className="bg-green-100 text-green-800">{wallet.state}</Badge>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="text-sm mt-1">{formatDate(wallet.createdAt)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>Wallet owner details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {wallet.user ? (
              <>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-sm mt-1">
                    {wallet.user.firstName} {wallet.user.lastName}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm mt-1">{wallet.user.email}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">User ID</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                      {wallet.user.id}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(wallet.user!.id, 'User ID')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">View User</label>
                  <div className="mt-1">
                    <Link href={`/dashboard/users/${wallet.user.id}`}>
                      <Button variant="outline" size="sm">
                        View User Profile
                      </Button>
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No user information available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Passkey Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Passkey Credentials
          </CardTitle>
          <CardDescription>WebAuthn credentials used for wallet authentication</CardDescription>
        </CardHeader>
        <CardContent>
          {passkeys && passkeys.length > 0 ? (
            <div className="space-y-4">
              {passkeys.map((passkey) => (
                <Card key={passkey.id} className="bg-muted/50">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Credential ID
                        </label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs bg-background px-2 py-1 rounded font-mono">
                            {truncateAddress(passkey.credentialId)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(passkey.credentialId, 'Credential ID')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Active
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Username</label>
                        <p className="text-sm mt-1">{passkey.username || 'N/A'}</p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-muted-foreground">RP ID</label>
                        <p className="text-sm mt-1">{passkey.rpId || 'N/A'}</p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Created</label>
                        <p className="text-sm mt-1">{formatDate(passkey.createdAt)}</p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Last Used
                        </label>
                        <p className="text-sm mt-1">
                          {passkey.lastUsedAt ? formatDate(passkey.lastUsedAt) : 'Never'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Key className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No passkey credentials found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features Info */}
      <Card className="bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
            <Zap className="h-5 w-5" />
            Modular Wallet Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-purple-800 dark:text-purple-200">
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong>Gasless Transactions:</strong> Gas fees paid in USDC via Circle Paymaster
            </li>
            <li>
              <strong>Passkey Security:</strong> Biometric authentication (Face ID/Touch ID)
            </li>
            <li>
              <strong>ERC-4337 Compliant:</strong> Account abstraction standard
            </li>
            <li>
              <strong>No Seed Phrases:</strong> Easier and safer for users
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
