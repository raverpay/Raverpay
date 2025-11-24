'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Search, MessageSquare, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { supportApi } from '@/lib/api/support';
import { useAuthStore } from '@/lib/auth-store';
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
import { formatRelativeTime, getApiErrorMessage } from '@/lib/utils';
import { ConversationStatus } from '@/types/support';

function getStatusBadge(status: ConversationStatus) {
  switch (status) {
    case ConversationStatus.BOT_HANDLING:
      return { label: 'Bot Handling', variant: 'secondary' as const };
    case ConversationStatus.AWAITING_AGENT:
      return { label: 'Waiting', variant: 'warning' as const };
    case ConversationStatus.AGENT_ASSIGNED:
      return { label: 'Active', variant: 'success' as const };
    case ConversationStatus.AWAITING_RATING:
      return { label: 'Awaiting Rating', variant: 'info' as const };
    case ConversationStatus.ENDED:
      return { label: 'Ended', variant: 'secondary' as const };
    default:
      return { label: status, variant: 'secondary' as const };
  }
}

export default function ConversationsPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300, 2);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isSupportRole = currentUser?.role === 'SUPPORT';
  const isAdminOrSuperAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  const { data: conversationsData, isLoading } = useQuery({
    queryKey: ['support-conversations', page, debouncedSearch, statusFilter],
    queryFn: () =>
      supportApi.getConversations({
        page,
        limit: 20,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter !== 'all' && {
          status: statusFilter as ConversationStatus,
        }),
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['support-stats'],
    queryFn: supportApi.getStats,
  });

  const assignMutation = useMutation({
    mutationFn: (conversationId: string) => supportApi.assignConversation(conversationId),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ['support-conversations'] });
      toast.success('Conversation assigned to you');
      // Redirect to chat
      window.location.href = `/dashboard/support/conversations/${conversation.id}`;
    },
    onError: (error: unknown) => {
      toast.error('Failed to assign conversation', {
        description: getApiErrorMessage(error),
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {isSupportRole ? 'My Conversations' : 'Live Conversations'}
          </h2>
          <p className="text-muted-foreground">
            {isSupportRole
              ? 'Conversations assigned to you'
              : 'Manage real-time customer support chats'}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Chats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeConversations || 0}</div>
          </CardContent>
        </Card>
        <Card
          className={stats?.waitingForAgent && stats.waitingForAgent > 5 ? 'border-orange-500' : ''}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Waiting for Agent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.waitingForAgent || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgResponseTime || 0}m</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">CSAT Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.csatScore?.toFixed(1) || '0.0'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isSupportRole ? 'Your Assigned Conversations' : 'Conversations Queue'}
          </CardTitle>
          <CardDescription>
            {isSupportRole
              ? 'Manage your assigned customer conversations'
              : 'View and join customer conversations'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by user name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value={ConversationStatus.BOT_HANDLING}>Bot Handling</SelectItem>
                <SelectItem value={ConversationStatus.AWAITING_AGENT}>Waiting for Agent</SelectItem>
                <SelectItem value={ConversationStatus.AGENT_ASSIGNED}>Agent Assignedsss</SelectItem>
                <SelectItem value={ConversationStatus.AWAITING_RATING}>Awaiting Rating</SelectItem>
                <SelectItem value={ConversationStatus.ENDED}>Ended</SelectItem>
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
          ) : conversationsData?.data && conversationsData.data.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Last Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Unread</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversationsData.data.map((conversation) => {
                      const statusBadge = getStatusBadge(conversation.status);
                      return (
                        <TableRow key={conversation.id}>
                          <TableCell className="font-medium">
                            <div>
                              {conversation.user?.firstName} {conversation.user?.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {conversation.user?.email}
                            </div>
                          </TableCell>
                          <TableCell>{conversation.category || 'General'}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {conversation.lastMessagePreview || 'No messages'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                          </TableCell>
                          <TableCell>
                            {conversation.assignedAgent ? (
                              `${conversation.assignedAgent.firstName} ${conversation.assignedAgent.lastName}`
                            ) : (
                              <span className="text-muted-foreground">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="destructive">{conversation.unreadCount}</Badge>
                            )}
                          </TableCell>
                          <TableCell>{formatRelativeTime(conversation.updatedAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Join button - only for ADMIN/SUPER_ADMIN on unassigned conversations */}
                              {isAdminOrSuperAdmin &&
                                conversation.status === ConversationStatus.AWAITING_AGENT && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => assignMutation.mutate(conversation.id)}
                                    disabled={assignMutation.isPending}
                                    className="gap-1"
                                  >
                                    <UserPlus className="h-4 w-4" />
                                    Join
                                  </Button>
                                )}
                              {conversation.status === ConversationStatus.AGENT_ASSIGNED && (
                                <Link href={`/dashboard/support/conversations/${conversation.id}`}>
                                  <Button variant="outline" size="sm" className="gap-1">
                                    <MessageSquare className="h-4 w-4" />
                                    Open
                                  </Button>
                                </Link>
                              )}
                              {conversation.status !== ConversationStatus.AWAITING_AGENT &&
                                conversation.status !== ConversationStatus.AGENT_ASSIGNED && (
                                  <Link
                                    href={`/dashboard/support/conversations/${conversation.id}`}
                                  >
                                    <Button variant="ghost" size="sm">
                                      View
                                    </Button>
                                  </Link>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {conversationsData.meta && (
                <Pagination
                  currentPage={page}
                  totalPages={conversationsData.meta.totalPages}
                  totalItems={conversationsData.meta.total}
                  itemsPerPage={conversationsData.meta.limit}
                  onPageChange={setPage}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No conversations found</p>
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
