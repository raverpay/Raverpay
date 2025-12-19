'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Search, Webhook, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

import { circleApi } from '@/lib/api/circle';
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
import { formatDate } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function CircleWebhooksPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [processedFilter, setProcessedFilter] = useState<string>('all');

  const {
    data: logsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['circle-webhooks', page, search, processedFilter],
    queryFn: () =>
      circleApi.getWebhookLogs({
        page,
        limit: 20,
        ...(search && { search }),
        ...(processedFilter !== 'all' && { processed: processedFilter === 'true' }),
      }),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const getEventTypeColor = (eventType: string): string => {
    if (eventType.includes('transaction')) return 'bg-blue-100 text-blue-800';
    if (eventType.includes('wallet')) return 'bg-purple-100 text-purple-800';
    if (eventType.includes('cctp') || eventType.includes('transfer'))
      return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Webhook Logs</h2>
          <p className="text-muted-foreground">Circle webhook events and processing status</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Link href="/dashboard/circle-wallets">
            <Button variant="outline">← Back to Wallets</Button>
          </Link>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Webhook className="h-6 w-6 text-blue-600 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900">Webhook Processing</h3>
              <p className="text-sm text-blue-700 mt-1">
                Circle sends webhook notifications for transaction updates, wallet state changes,
                and CCTP transfer progress. These events are processed automatically to keep your
                data synchronized.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Event Logs</CardTitle>
          <CardDescription>All received webhook events from Circle</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by event type or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={processedFilter} onValueChange={setProcessedFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="true">Processed</SelectItem>
                <SelectItem value="false">Pending</SelectItem>
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
          ) : logsData?.data && logsData.data.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Event ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Processed At</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsData.data.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge className={getEventTypeColor(log.eventType)}>
                            {log.eventType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {log.eventId.substring(0, 12)}...
                          </code>
                        </TableCell>
                        <TableCell>
                          {log.processed ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-green-600">Processed</span>
                            </div>
                          ) : log.error ? (
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="text-sm text-red-600">Failed</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-yellow-600" />
                              <span className="text-sm text-yellow-600">Pending</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.processedAt ? formatDate(log.processedAt) : '—'}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(log.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                View Payload
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Webhook Payload</DialogTitle>
                                <DialogDescription>
                                  Event: {log.eventType} | ID: {log.eventId}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="max-h-[60vh] overflow-auto">
                                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                                  {JSON.stringify(log.payload, null, 2)}
                                </pre>
                              </div>
                              {log.error && (
                                <div className="mt-4 p-4 bg-red-50 rounded-lg">
                                  <p className="text-sm font-medium text-red-800">Error:</p>
                                  <p className="text-sm text-red-600 mt-1">{log.error}</p>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {logsData.meta && (
                <Pagination
                  currentPage={page}
                  totalPages={logsData.meta.totalPages}
                  totalItems={logsData.meta.total}
                  itemsPerPage={logsData.meta.limit}
                  onPageChange={setPage}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No webhook logs found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Webhook events will appear here when Circle sends notifications
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
