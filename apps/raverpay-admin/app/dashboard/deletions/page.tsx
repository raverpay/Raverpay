'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import Link from 'next/link';
import { Search, Eye, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

import { deletionsApi } from '@/lib/api/deletions';
import { usePermissions } from '@/lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'APPROVED':
      return 'success';
    case 'REJECTED':
      return 'destructive';
    case 'COMPLETED':
      return 'default';
    default:
      return 'secondary';
  }
};

export default function DeletionsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300, 2);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const queryClient = useQueryClient();
  const { canApproveDeletions } = usePermissions();

  const { data: deletionsData, isLoading } = useQuery({
    queryKey: ['deletions', page, debouncedSearch, statusFilter],
    queryFn: () =>
      deletionsApi.getAll({
        page,
        limit: 20,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      }),
  });

  const { data: pendingData } = useQuery({
    queryKey: ['deletions-pending'],
    queryFn: () => deletionsApi.getPending({ limit: 100 }),
  });

  console.log({ pendingData });

  const approveMutation = useMutation({
    mutationFn: (requestId: string) => deletionsApi.approve(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deletions'] });
      queryClient.invalidateQueries({ queryKey: ['deletions-pending'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason: string }) =>
      deletionsApi.reject(requestId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deletions'] });
      queryClient.invalidateQueries({ queryKey: ['deletions-pending'] });
    },
  });

  const handleApprove = async (requestId: string) => {
    if (
      confirm(
        'Are you sure you want to approve this deletion request? This action cannot be undone.',
      )
    ) {
      approveMutation.mutate(requestId);
    }
  };

  const handleReject = async (requestId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      rejectMutation.mutate({ requestId, reason });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Account Deletions</h2>
          <p className="text-muted-foreground">Manage account deletion requests</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingData?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deletionsData?.meta?.totalItems || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests Alert */}
      {pendingData && pendingData.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-5 w-5" />
              Pending Deletion Requests
            </CardTitle>
            <CardDescription className="text-yellow-700 dark:text-yellow-300">
              {pendingData.length} request(s) awaiting review
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Deletion Requests</CardTitle>
          <CardDescription>Review and manage account deletion requests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email or user ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
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
          ) : deletionsData?.data && deletionsData.data.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Reviewed By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletionsData.data.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {request.user?.firstName} {request.user?.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">{request.user?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="line-clamp-2">
                            {request.reason}
                            {request.customReason && ` - ${request.customReason}`}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              getStatusBadgeVariant(request.status) as
                                | 'default'
                                | 'secondary'
                                | 'destructive'
                                | 'outline'
                            }
                          >
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(request.createdAt)}</TableCell>
                        <TableCell>
                          {request.reviewedBy ? (
                            <span className="text-sm">{request.reviewedBy}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/dashboard/deletions/${request.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            {canApproveDeletions && request.status === 'PENDING' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => handleApprove(request.id)}
                                  disabled={approveMutation.isPending}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleReject(request.id)}
                                  disabled={rejectMutation.isPending}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {deletionsData.meta && (
                <Pagination
                  currentPage={page}
                  totalPages={deletionsData.meta.totalPages}
                  totalItems={deletionsData.meta.total}
                  itemsPerPage={deletionsData.meta.limit}
                  onPageChange={setPage}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No deletion requests found</p>
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
