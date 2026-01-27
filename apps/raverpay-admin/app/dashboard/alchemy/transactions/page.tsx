'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import Link from 'next/link';
import {
  Search,
  Eye,
  ArrowLeftRight,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  LucideIcon,
} from 'lucide-react';

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

const STATE_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

const STATE_ICONS: Record<string, LucideIcon> = {
  PENDING: Clock,
  SUBMITTED: ArrowLeftRight,
  CONFIRMED: AlertCircle,
  COMPLETED: CheckCircle,
  FAILED: XCircle,
};

const BLOCKCHAIN_EXPLORERS: Record<string, string> = {
  'BASE-sepolia': 'https://sepolia.basescan.org/tx/',
  'BASE-mainnet': 'https://basescan.org/tx/',
  'POLYGON-amoy': 'https://amoy.polygonscan.com/tx/',
  'POLYGON-mainnet': 'https://polygonscan.com/tx/',
  'ARBITRUM-sepolia': 'https://sepolia.arbiscan.io/tx/',
  'ARBITRUM-mainnet': 'https://arbiscan.io/tx/',
};

export default function AlchemyTransactionsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300, 2);
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [blockchainFilter, setBlockchainFilter] = useState<string>('all');
  const [networkFilter, setNetworkFilter] = useState<string>('all');

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: [
      'alchemy-transactions',
      page,
      debouncedSearch,
      stateFilter,
      typeFilter,
      blockchainFilter,
      networkFilter,
    ],
    queryFn: () =>
      alchemyApi.getTransactions({
        page,
        limit: 20,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(stateFilter !== 'all' && { state: stateFilter }),
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(blockchainFilter !== 'all' && { blockchain: blockchainFilter }),
        ...(networkFilter !== 'all' && { network: networkFilter }),
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['alchemy-stats'],
    queryFn: () => alchemyApi.getStats(),
  });

  const getExplorerUrl = (blockchain: string, network: string, hash: string) => {
    const key = `${blockchain}-${network}`;
    const baseUrl = BLOCKCHAIN_EXPLORERS[key];
    return baseUrl ? `${baseUrl}${hash}` : null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Alchemy Transactions</h2>
          <p className="text-muted-foreground">Monitor all token transfers and states</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Transactions
              </CardTitle>
              <ArrowLeftRight className="h-4 w-4 text-blue-600" />
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.pendingTransactions?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.completedTransactions?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.failedTransactions?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>View all Alchemy transactions and their states</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by hash, reference, or user email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="SEND">Send</SelectItem>
                <SelectItem value="RECEIVE">Receive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={blockchainFilter} onValueChange={setBlockchainFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Blockchain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chains</SelectItem>
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
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : transactionsData?.data && transactionsData.data.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Blockchain</TableHead>
                      <TableHead>Transaction Hash</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionsData.data.map((tx) => {
                      const StateIcon = STATE_ICONS[tx.state] || ArrowLeftRight;
                      const explorerUrl = tx.transactionHash
                        ? getExplorerUrl(tx.blockchain, tx.network, tx.transactionHash)
                        : null;

                      return (
                        <TableRow key={tx.id}>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {tx.reference}
                            </code>
                          </TableCell>
                          <TableCell>
                            {tx.user ? (
                              <div>
                                <p className="text-sm font-medium">
                                  {tx.user.firstName} {tx.user.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">{tx.user.email}</p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{tx.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${STATE_COLORS[tx.state]} gap-1`}>
                              <StateIcon className="h-3 w-3" />
                              {tx.state}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {tx.amount && tx.tokenSymbol ? (
                              <div>
                                <p className="text-sm font-medium">
                                  {parseFloat(tx.amount).toFixed(4)}
                                </p>
                                <p className="text-xs text-muted-foreground">{tx.tokenSymbol}</p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{tx.blockchain}</p>
                              <p className="text-xs text-muted-foreground">{tx.network}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {tx.transactionHash ? (
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {truncateAddress(tx.transactionHash)}
                                </code>
                                {explorerUrl && (
                                  <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
                                    <Button variant="ghost" size="sm">
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(tx.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <Link href={`/dashboard/alchemy/transactions/${tx.id}`}>
                              <Button variant="ghost" size="sm" className="gap-2">
                                <Eye className="h-4 w-4" />
                                View Details
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {transactionsData.meta && (
                <Pagination
                  currentPage={page}
                  totalPages={transactionsData.meta.totalPages}
                  totalItems={transactionsData.meta.total}
                  itemsPerPage={transactionsData.meta.limit}
                  onPageChange={setPage}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ArrowLeftRight className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No transactions found</p>
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
