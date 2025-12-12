'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Search, Download, Eye, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { supportApi } from '@/lib/api/support';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
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
import { formatDate, formatRelativeTime, getApiErrorMessage } from '@/lib/utils';
import { TicketStatus, TicketPriority } from '@/types/support';

function getStatusBadgeVariant(status: TicketStatus) {
  switch (status) {
    case TicketStatus.OPEN:
      return 'info';
    case TicketStatus.IN_PROGRESS:
      return 'warning';
    case TicketStatus.RESOLVED:
      return 'success';
    case TicketStatus.CLOSED:
      return 'secondary';
    default:
      return 'secondary';
  }
}

function getPriorityBadgeVariant(priority: TicketPriority) {
  switch (priority) {
    case TicketPriority.URGENT:
      return 'destructive';
    case TicketPriority.HIGH:
      return 'warning';
    case TicketPriority.MEDIUM:
      return 'info';
    case TicketPriority.LOW:
      return 'secondary';
    default:
      return 'secondary';
  }
}

export default function TicketsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300, 2);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['support-tickets', page, debouncedSearch, statusFilter, priorityFilter],
    queryFn: () =>
      supportApi.getTickets({
        page,
        limit: 20,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter !== 'all' && { status: statusFilter as TicketStatus }),
        ...(priorityFilter !== 'all' && {
          priority: priorityFilter as TicketPriority,
        }),
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['support-stats'],
    queryFn: supportApi.getStats,
  });

  const assignMutation = useMutation({
    mutationFn: (ticketId: string) => supportApi.assignTicket(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('Ticket assigned to you');
    },
    onError: (error: unknown) => {
      toast.error('Failed to assign ticket', {
        description: getApiErrorMessage(error),
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Support Tickets</h2>
          <p className="text-muted-foreground">Manage and resolve customer support tickets</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.openTickets || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.inProgressTickets || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resolved Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.resolvedToday || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Resolution Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgResolutionTime || 0}h</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Tickets Queue</CardTitle>
          <CardDescription>View and manage all support tickets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by ticket number, user, or title..."
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
                <SelectItem value={TicketStatus.OPEN}>Open</SelectItem>
                <SelectItem value={TicketStatus.IN_PROGRESS}>In Progress</SelectItem>
                <SelectItem value={TicketStatus.RESOLVED}>Resolved</SelectItem>
                <SelectItem value={TicketStatus.CLOSED}>Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value={TicketPriority.URGENT}>Urgent</SelectItem>
                <SelectItem value={TicketPriority.HIGH}>High</SelectItem>
                <SelectItem value={TicketPriority.MEDIUM}>Medium</SelectItem>
                <SelectItem value={TicketPriority.LOW}>Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : ticketsData?.data && ticketsData.data.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ticketsData.data.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">#{ticket.ticketNumber}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{ticket.title}</TableCell>
                        <TableCell>
                          {ticket.user?.firstName} {ticket.user?.lastName}
                        </TableCell>
                        <TableCell>{ticket.category}</TableCell>
                        <TableCell>
                          <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(ticket.status)}>
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {ticket.assignedAgent ? (
                            `${ticket.assignedAgent.firstName} ${ticket.assignedAgent.lastName}`
                          ) : (
                            <span className="text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>{formatRelativeTime(ticket.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!ticket.assignedAgentId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => assignMutation.mutate(ticket.id)}
                                disabled={assignMutation.isPending}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            )}
                            <Link href={`/dashboard/support/tickets/${ticket.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {ticketsData.meta && (
                <Pagination
                  currentPage={page}
                  totalPages={ticketsData.meta.totalPages}
                  totalItems={ticketsData.meta.total}
                  itemsPerPage={ticketsData.meta.limit}
                  onPageChange={setPage}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No tickets found</p>
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
