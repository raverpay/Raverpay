'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import Link from 'next/link';
import { Search, Eye, ArrowRight, Globe, ExternalLink, Clock } from 'lucide-react';

import { circleApi, CCTPTransferState } from '@/lib/api/circle';
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

const STATE_COLORS: Record<CCTPTransferState, string> = {
  INITIATED: 'bg-yellow-100 text-yellow-800',
  BURN_PENDING: 'bg-orange-100 text-orange-800',
  BURN_COMPLETE: 'bg-blue-100 text-blue-800',
  ATTESTATION_PENDING: 'bg-purple-100 text-purple-800',
  ATTESTATION_COMPLETE: 'bg-indigo-100 text-indigo-800',
  MINT_PENDING: 'bg-cyan-100 text-cyan-800',
  COMPLETE: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

const STATE_LABELS: Record<CCTPTransferState, string> = {
  INITIATED: 'Initiated',
  BURN_PENDING: 'Burning...',
  BURN_COMPLETE: 'Burned',
  ATTESTATION_PENDING: 'Getting Attestation...',
  ATTESTATION_COMPLETE: 'Attested',
  MINT_PENDING: 'Minting...',
  COMPLETE: 'Complete',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

const BLOCKCHAIN_EXPLORERS: Record<string, string> = {
  ETH: 'https://etherscan.io/tx/',
  'ETH-SEPOLIA': 'https://sepolia.etherscan.io/tx/',
  MATIC: 'https://polygonscan.com/tx/',
  'MATIC-AMOY': 'https://amoy.polygonscan.com/tx/',
  ARB: 'https://arbiscan.io/tx/',
  'ARB-SEPOLIA': 'https://sepolia.arbiscan.io/tx/',
  AVAX: 'https://snowtrace.io/tx/',
  'AVAX-FUJI': 'https://testnet.snowtrace.io/tx/',
};

export default function CCTPTransfersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300, 2);
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: transfersData, isLoading } = useQuery({
    queryKey: ['cctp-transfers', page, debouncedSearch, stateFilter, typeFilter],
    queryFn: () =>
      circleApi.getCCTPTransfers({
        page,
        limit: 20,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(stateFilter !== 'all' && { state: stateFilter }),
        ...(typeFilter !== 'all' && { transferType: typeFilter }),
      }),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cross-Chain Transfers</h2>
          <p className="text-muted-foreground">CCTP bridge transfers across blockchains</p>
        </div>
        <Link href="/dashboard/circle-wallets">
          <Button variant="outline">← Back to Wallets</Button>
        </Link>
      </div>

      {/* Info Banner */}
      <Card className="bg-purple-50 border-purple-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Globe className="h-6 w-6 text-purple-600 mt-1" />
            <div>
              <h3 className="font-semibold text-purple-900">
                Cross-Chain Transfer Protocol (CCTP)
              </h3>
              <p className="text-sm text-purple-700 mt-1">
                CCTP enables native USDC to be transferred across blockchains. The process involves
                burning USDC on the source chain, getting an attestation from Circle, and minting on
                the destination chain.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bridge Transfers</CardTitle>
          <CardDescription>All cross-chain USDC transfers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by user or address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="INITIATED">Initiated</SelectItem>
                <SelectItem value="BURN_PENDING">Burn Pending</SelectItem>
                <SelectItem value="BURN_COMPLETE">Burn Complete</SelectItem>
                <SelectItem value="ATTESTATION_PENDING">Attestation Pending</SelectItem>
                <SelectItem value="MINT_PENDING">Mint Pending</SelectItem>
                <SelectItem value="COMPLETE">Complete</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Speed" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="FAST">Fast</SelectItem>
                <SelectItem value="STANDARD">Standard</SelectItem>
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
          ) : transfersData?.data && transfersData.data.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfersData.data.map((transfer) => {
                      const burnExplorerUrl = transfer.burnTxHash
                        ? `${BLOCKCHAIN_EXPLORERS[transfer.sourceChain] || ''}${transfer.burnTxHash}`
                        : null;
                      const mintExplorerUrl = transfer.mintTxHash
                        ? `${BLOCKCHAIN_EXPLORERS[transfer.destinationChain] || ''}${transfer.mintTxHash}`
                        : null;

                      return (
                        <TableRow key={transfer.id}>
                          <TableCell>
                            {transfer.user ? (
                              <div>
                                <p className="text-sm font-medium">
                                  {transfer.user.firstName} {transfer.user.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {transfer.user.email}
                                </p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {transfer.sourceChain}
                              </Badge>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <Badge variant="outline" className="text-xs">
                                {transfer.destinationChain}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 font-mono">
                              To: {truncateAddress(transfer.destinationAddress)}
                            </p>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono font-medium">
                              ${parseFloat(transfer.amount).toFixed(2)}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">USDC</span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={transfer.transferType === 'FAST' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {transfer.transferType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={STATE_COLORS[transfer.state]}>
                              {STATE_LABELS[transfer.state]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {transfer.totalFee ? (
                              <span className="text-sm">${transfer.totalFee}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {formatDate(transfer.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {burnExplorerUrl && (
                                <a
                                  href={burnExplorerUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-orange-600 hover:text-orange-700"
                                  title="View Burn TX"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}
                              {mintExplorerUrl && (
                                <a
                                  href={mintExplorerUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-600 hover:text-green-700"
                                  title="View Mint TX"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}
                              <Link href={`/dashboard/users/${transfer.userId}`}>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {transfersData.meta && (
                <Pagination
                  currentPage={page}
                  totalPages={transfersData.meta.totalPages}
                  totalItems={transfersData.meta.total}
                  itemsPerPage={transfersData.meta.limit}
                  onPageChange={setPage}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Globe className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No cross-chain transfers found</p>
              <p className="text-sm text-muted-foreground mt-1">
                CCTP transfers will appear here when users bridge USDC
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
