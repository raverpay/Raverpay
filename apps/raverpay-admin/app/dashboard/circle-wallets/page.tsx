'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import Link from 'next/link';
import {
  Search,
  Eye,
  Wallet,
  Users,
  ArrowLeftRight,
  Activity,
  Globe,
  DollarSign,
} from 'lucide-react';

import { circleApi, CircleWalletState } from '@/lib/api/circle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { formatDate, truncateAddress } from '@/lib/utils';

const BLOCKCHAIN_COLORS: Record<string, string> = {
  ETH: 'bg-blue-100 text-blue-800',
  'ETH-SEPOLIA': 'bg-blue-50 text-blue-600',
  MATIC: 'bg-purple-100 text-purple-800',
  'MATIC-AMOY': 'bg-purple-50 text-purple-600',
  ARB: 'bg-sky-100 text-sky-800',
  'ARB-SEPOLIA': 'bg-sky-50 text-sky-600',
  SOL: 'bg-gradient-to-r from-purple-100 to-green-100 text-purple-800',
  'SOL-DEVNET': 'bg-purple-50 text-purple-600',
  AVAX: 'bg-red-100 text-red-800',
  'AVAX-FUJI': 'bg-red-50 text-red-600',
};

const STATE_COLORS: Record<CircleWalletState, string> = {
  LIVE: 'bg-green-100 text-green-800',
  FROZEN: 'bg-red-100 text-red-800',
};

export default function CircleWalletsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300, 2);
  const [blockchainFilter, setBlockchainFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [custodyFilter, setCustodyFilter] = useState<string>('all');

  const { data: walletsData, isLoading } = useQuery({
    queryKey: [
      'circle-wallets',
      page,
      debouncedSearch,
      blockchainFilter,
      stateFilter,
      custodyFilter,
    ],
    queryFn: () =>
      circleApi.getWallets({
        page,
        limit: 20,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(blockchainFilter !== 'all' && { blockchain: blockchainFilter }),
        ...(stateFilter !== 'all' && { state: stateFilter }),
        ...(custodyFilter !== 'all' && { custodyType: custodyFilter }),
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['circle-stats'],
    queryFn: () => circleApi.getStats(),
  });

  const { data: config } = useQuery({
    queryKey: ['circle-config'],
    queryFn: () => circleApi.getConfig(),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Circle USDC Wallets</h2>
          <p className="text-muted-foreground">Manage Circle wallets (custodial & non-custodial)</p>
        </div>
        <div className="flex items-center gap-2">
          {config && (
            <Badge variant={config.environment === 'testnet' ? 'secondary' : 'default'}>
              {config.environment === 'testnet' ? '🧪 Testnet' : '🔒 Mainnet'}
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Wallet Sets
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalWalletSets?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Wallets
              </CardTitle>
              <Wallet className="h-4 w-4 text-[#2775CA]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalWallets?.toLocaleString() || '0'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Transactions
              </CardTitle>
              <Activity className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalTransactions?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                CCTP Transfers
              </CardTitle>
              <ArrowLeftRight className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalCCTPTransfers?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wallets Table */}
      <Card>
        <CardHeader>
          <CardTitle>USDC Wallets</CardTitle>
          <CardDescription>View all Circle wallets and their status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by address, user email, or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={blockchainFilter} onValueChange={setBlockchainFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Blockchain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chains</SelectItem>
                {config?.supportedBlockchains?.map((chain) => (
                  <SelectItem key={chain} value={chain}>
                    {chain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="LIVE">Live</SelectItem>
                <SelectItem value="FROZEN">Frozen</SelectItem>
              </SelectContent>
            </Select>

            <Select value={custodyFilter} onValueChange={setCustodyFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Custody Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="DEVELOPER">Custodial</SelectItem>
                <SelectItem value="USER">Non-Custodial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : walletsData?.data && walletsData.data.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Wallet Address</TableHead>
                      <TableHead>Blockchain</TableHead>
                      <TableHead>Account Type</TableHead>
                      <TableHead>Custody</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {walletsData.data.map((wallet) => (
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
                          <span className="text-sm">{wallet.accountType}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              wallet.custodyType === 'USER'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-green-50 text-green-700 border-green-200'
                            }
                          >
                            {wallet.custodyType === 'USER' ? '🔑 Non-Custodial' : '🛡️ Custodial'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATE_COLORS[wallet.state]}>{wallet.state}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(wallet.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/dashboard/circle-wallets/${wallet.id}`}>
                            <Button variant="ghost" size="sm" className="gap-2">
                              <Eye className="h-4 w-4" />
                              View Details
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {walletsData.meta && (
                <Pagination
                  currentPage={page}
                  totalPages={walletsData.meta.totalPages}
                  totalItems={walletsData.meta.total}
                  itemsPerPage={walletsData.meta.limit}
                  onPageChange={setPage}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No wallets found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your filters or search query
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-4">
        <Link href="/dashboard/circle-wallets/users">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-[#3B82F6]" />
                Circle Users
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Manage user-controlled wallets
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/circle-wallets/transactions">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#2775CA]" />
                USDC Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Monitor all USDC transfers
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/circle-wallets/cctp-transfers">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-purple-600" />
                Cross-Chain Transfers
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Track CCTP bridge transfers
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/circle-wallets/webhooks">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Webhook Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              View Circle webhook events
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Blockchain Distribution */}
      {stats?.walletsByBlockchain && stats.walletsByBlockchain.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Wallets by Blockchain</CardTitle>
            <CardDescription>Distribution of wallets across supported chains</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {stats.walletsByBlockchain.map((item) => (
                <div key={item.blockchain} className="text-center p-4 rounded-lg bg-muted/50">
                  <Badge
                    variant="outline"
                    className={`${BLOCKCHAIN_COLORS[item.blockchain] || 'bg-gray-100'} mb-2`}
                  >
                    {item.blockchain}
                  </Badge>
                  <p className="text-2xl font-bold">{item.count}</p>
                  <p className="text-xs text-muted-foreground">wallets</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
