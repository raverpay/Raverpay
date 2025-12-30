'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, RefreshCw, Search } from 'lucide-react';
import { paymasterApi, PaymasterUserOperation } from '@/lib/api/paymaster';

export default function PaymasterEventsPage() {
  const [userOps, setUserOps] = useState<PaymasterUserOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchUserOps();
  }, []);

  const fetchUserOps = async () => {
    setLoading(true);
    try {
      const response = await paymasterApi.getUserOperations();
      setUserOps(response.data || []);
    } catch (error) {
      console.error('Failed to fetch user ops:', error);
      setUserOps([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUserOps = userOps.filter((op) => {
    const matchesSearch =
      op.userOpHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (op.transactionHash?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesStatus = statusFilter === 'all' || op.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const exportToCSV = () => {
    const headers = [
      'UserOp Hash',
      'Sender',
      'Blockchain',
      'Status',
      'Estimated Gas (USDC)',
      'Actual Gas (USDC)',
      'Transaction Hash',
      'Created At',
    ];

    const rows = filteredUserOps.map((op) => [
      op.userOpHash,
      op.sender,
      op.blockchain,
      op.status,
      op.estimatedGasUsdc,
      op.actualGasUsdc || 'N/A',
      op.transactionHash || 'N/A',
      new Date(op.createdAt).toLocaleString(),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paymaster-events-${new Date().toISOString()}.csv`;
    a.click();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      PENDING: 'secondary',
      CONFIRMED: 'default',
      FAILED: 'destructive',
    };

    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const formatUsdc = (amount: string | null) => {
    if (!amount) return 'N/A';
    return `$${parseFloat(amount).toFixed(6)}`;
  };

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paymaster Events</h1>
          <p className="text-muted-foreground">Track UserOperations and gas fees paid in USDC</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchUserOps} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>UserOperations</CardTitle>
          <CardDescription>All UserOperations submitted via Circle Paymaster</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by hash, sender, or transaction..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">Loading UserOperations...</p>
            </div>
          ) : filteredUserOps.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No UserOperations found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UserOp Hash</TableHead>
                    <TableHead>Sender</TableHead>
                    <TableHead>Blockchain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Estimated Gas</TableHead>
                    <TableHead className="text-right">Actual Gas</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUserOps.map((op) => {
                    const estimated = parseFloat(op.estimatedGasUsdc);
                    const actual = op.actualGasUsdc ? parseFloat(op.actualGasUsdc) : null;
                    const difference = actual ? estimated - actual : null;

                    return (
                      <TableRow key={op.id}>
                        <TableCell className="font-mono text-sm">
                          <a
                            href={`/dashboard/circle-wallets/paymaster/${op.userOpHash}`}
                            className="text-blue-600 hover:underline"
                          >
                            {truncateHash(op.userOpHash)}
                          </a>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {truncateHash(op.sender)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{op.blockchain}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(op.status)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatUsdc(op.estimatedGasUsdc)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatUsdc(op.actualGasUsdc)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {difference !== null ? (
                            <span className={difference > 0 ? 'text-green-600' : 'text-red-600'}>
                              {difference > 0 ? '+' : ''}
                              {formatUsdc(difference.toString())}
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {op.transactionHash ? (
                            <a
                              href={`https://etherscan.io/tx/${op.transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {truncateHash(op.transactionHash)}
                            </a>
                          ) : (
                            'Pending'
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(op.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
