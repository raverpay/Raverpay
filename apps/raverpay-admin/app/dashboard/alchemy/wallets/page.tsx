'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import Link from 'next/link';
import { Search, Eye, Wallet, Zap, Shield } from 'lucide-react';

import { alchemyApi } from '@/lib/api/alchemy';
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
  BASE: 'bg-blue-100 text-blue-800',
  POLYGON: 'bg-purple-100 text-purple-800',
  ARBITRUM: 'bg-sky-100 text-sky-800',
};

const STATE_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  COMPROMISED: 'bg-red-100 text-red-800',
  FROZEN: 'bg-gray-100 text-gray-800',
};

export default function AlchemyWalletsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300, 2);
  const [blockchainFilter, setBlockchainFilter] = useState<string>('all');
  const [networkFilter, setNetworkFilter] = useState<string>('all');
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');

  const { data: walletsData, isLoading } = useQuery({
    queryKey: [
      'alchemy-wallets',
      page,
      debouncedSearch,
      blockchainFilter,
      networkFilter,
      accountTypeFilter,
      stateFilter,
    ],
    queryFn: () =>
      alchemyApi.getWallets({
        page,
        limit: 20,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(blockchainFilter !== 'all' && { blockchain: blockchainFilter }),
        ...(networkFilter !== 'all' && { network: networkFilter }),
        ...(accountTypeFilter !== 'all' && { accountType: accountTypeFilter }),
        ...(stateFilter !== 'all' && { state: stateFilter }),
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['alchemy-stats'],
    queryFn: () => alchemyApi.getStats(),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Alchemy Wallets</h2>
          <p className="text-muted-foreground">Manage EOA and Smart Account wallets</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Wallets
              </CardTitle>
              <Wallet className="h-4 w-4 text-purple-600" />
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
                Active Wallets
              </CardTitle>
              <Shield className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.activeWallets?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Smart Accounts
              </CardTitle>
              <Zap className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {walletsData?.data.filter((w) => w.accountType === 'SMART_CONTRACT').length || '0'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                EOA Wallets
              </CardTitle>
              <Wallet className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {walletsData?.data.filter((w) => w.accountType === 'EOA').length || '0'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wallets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Wallets</CardTitle>
          <CardDescription>View all Alchemy wallets and their status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by address, user email, or wallet ID..."
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
                <SelectItem value="all">All Blockchains</SelectItem>
                <SelectItem value="BASE">Base</SelectItem>
                <SelectItem value="POLYGON">Polygon</SelectItem>
                <SelectItem value="ARBITRUM">Arbitrum</SelectItem>
              </SelectContent>
            </Select>

            <Select value={networkFilter} onValueChange={setNetworkFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Networks</SelectItem>
                <SelectItem value="mainnet">Mainnet</SelectItem>
                <SelectItem value="sepolia">Sepolia</SelectItem>
                <SelectItem value="amoy">Amoy</SelectItem>
              </SelectContent>
            </Select>

            <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Account Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="EOA">EOA</SelectItem>
                <SelectItem value="SMART_CONTRACT">Smart Contract</SelectItem>
              </SelectContent>
            </Select>

            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="COMPROMISED">Compromised</SelectItem>
                <SelectItem value="FROZEN">Frozen</SelectItem>
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
                      <TableHead>Network</TableHead>
                      <TableHead>Account Type</TableHead>
                      <TableHead>Gas Sponsored</TableHead>
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
                          <span className="text-sm">{wallet.network}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              wallet.accountType === 'SMART_CONTRACT'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }
                          >
                            {wallet.accountType === 'SMART_CONTRACT' ? (
                              <>
                                <Zap className="h-3 w-3 mr-1" />
                                Smart Contract
                              </>
                            ) : (
                              'EOA'
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {wallet.isGasSponsored ? (
                            <Badge className="bg-green-100 text-green-800">Yes</Badge>
                          ) : (
                            <Badge variant="outline">No</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATE_COLORS[wallet.state]}>{wallet.state}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(wallet.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/dashboard/alchemy/wallets/${wallet.id}`}>
                            <Button variant="ghost" size="sm" className="gap-2">
                              <Eye className="h-4 w-4" />
                              View Wallet
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
    </div>
  );
}
