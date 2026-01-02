'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, Wallet, Key, Zap } from 'lucide-react';

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
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, truncateAddress } from '@/lib/utils';
import { circleApi } from '@/lib/api/circle';

const BLOCKCHAIN_COLORS: Record<string, string> = {
  ETH: 'bg-blue-100 text-blue-800',
  'ETH-SEPOLIA': 'bg-blue-50 text-blue-600',
  MATIC: 'bg-purple-100 text-purple-800',
  'MATIC-AMOY': 'bg-purple-50 text-purple-600',
  ARB: 'bg-sky-100 text-sky-800',
  'ARB-SEPOLIA': 'bg-sky-50 text-sky-600',
};

export default function ModularWalletsPage() {
  const { data: modularWallets, isLoading } = useQuery({
    queryKey: ['modular-wallets'],
    queryFn: () => circleApi.getModularWallets(),
  });

  const { data: stats } = useQuery({
    queryKey: ['modular-stats'],
    queryFn: () => circleApi.getModularWalletStats(),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/circle-wallets">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Wallets
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              Modular Wallets
            </h2>
            <p className="text-muted-foreground">
              Gasless smart contract wallets with passkey authentication
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Modular Wallets
              </CardTitle>
              <Wallet className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalWallets?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Passkeys
              </CardTitle>
              <Key className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalPasskeys?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Gasless Transactions
              </CardTitle>
              <Zap className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalTransactions?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wallets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Modular Wallets</CardTitle>
          <CardDescription>
            Smart contract wallets with passkey authentication and gasless transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : modularWallets?.data && modularWallets.data.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Wallet Address</TableHead>
                    <TableHead>Blockchain</TableHead>
                    <TableHead>Passkey</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modularWallets.data.map((wallet) => (
                    <TableRow key={wallet.id}>
                      <TableCell>
                        {wallet.user ? (
                          <div>
                            <p className="text-sm font-medium">
                              {wallet.user.firstName} {wallet.user.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">{wallet.user.email}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {truncateAddress(wallet.address)}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={BLOCKCHAIN_COLORS[wallet.blockchain] || 'bg-gray-100'}
                        >
                          {wallet.blockchain}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <Key className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(wallet.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/dashboard/circle-wallets/modular/${wallet.id}`}>
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No modular wallets found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Users can create modular wallets from the mobile app
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
            <Zap className="h-5 w-5" />
            About Modular Wallets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-purple-800 dark:text-purple-200">
          <p>
            <strong>Modular Wallets</strong> are ERC-4337 compliant smart contract wallets that offer:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>
              <strong>Gasless Transactions:</strong> Users pay gas fees in USDC instead of native tokens
            </li>
            <li>
              <strong>Passkey Authentication:</strong> Secure biometric authentication (Face ID/Touch ID)
            </li>
            <li>
              <strong>Smart Contract Wallets:</strong> Advanced features like account recovery and batched transactions
            </li>
            <li>
              <strong>No Seed Phrases:</strong> Easier onboarding for non-crypto users
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
