'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  MessageSquare,
  Ticket,
  Clock,
  Star,
  Users,
  AlertCircle,
  ArrowUpRight,
  TrendingUp,
  Mail,
} from 'lucide-react';

import { supportApi } from '@/lib/api/support';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatRelativeTime } from '@/lib/utils';
import { TicketStatus, TicketPriority, ConversationStatus } from '@/types/support';

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp
              className={`h-3 w-3 ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}
            />
            <span className={`text-xs ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {trend.isPositive ? '+' : ''}
              {trend.value}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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

function getConversationStatusBadge(status: ConversationStatus) {
  switch (status) {
    case ConversationStatus.BOT_HANDLING:
      return { label: 'Bot', variant: 'secondary' as const };
    case ConversationStatus.AWAITING_AGENT:
      return { label: 'Waiting', variant: 'warning' as const };
    case ConversationStatus.AGENT_ASSIGNED:
      return { label: 'Active', variant: 'success' as const };
    case ConversationStatus.AWAITING_RATING:
      return { label: 'Rating', variant: 'info' as const };
    case ConversationStatus.ENDED:
      return { label: 'Ended', variant: 'secondary' as const };
    default:
      return { label: status, variant: 'secondary' as const };
  }
}

export default function SupportDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['support-stats'],
    queryFn: supportApi.getStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: ticketsData, isLoading: loadingTickets } = useQuery({
    queryKey: ['support-tickets', { limit: 5, status: TicketStatus.OPEN }],
    queryFn: () => supportApi.getTickets({ limit: 5, status: TicketStatus.OPEN }),
  });

  const { data: conversationsData, isLoading: loadingConversations } = useQuery({
    queryKey: ['support-conversations', { limit: 5, status: ConversationStatus.AWAITING_AGENT }],
    queryFn: () =>
      supportApi.getConversations({
        limit: 5,
        status: ConversationStatus.AWAITING_AGENT,
      }),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Support Dashboard</h2>
          <p className="text-muted-foreground">Monitor and manage customer support operations</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/support/emails">
            <Button variant="outline" className="gap-2">
              <Mail className="h-4 w-4" />
              Emails
            </Button>
          </Link>
          <Link href="/dashboard/support/conversations">
            <Button variant="outline" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Live Chat
            </Button>
          </Link>
          <Link href="/dashboard/support/tickets">
            <Button className="gap-2">
              <Ticket className="h-4 w-4" />
              Ticket Queue
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loadingStats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)
        ) : (
          <>
            <StatCard
              title="Open Tickets"
              value={stats?.openTickets || 0}
              description={`${stats?.inProgressTickets || 0} in progress`}
              icon={Ticket}
            />
            <StatCard
              title="Waiting for Agent"
              value={stats?.waitingForAgent || 0}
              description={`${stats?.activeConversations || 0} active chats`}
              icon={Users}
              className={(stats?.waitingForAgent || 0) > 5 ? 'border-orange-500' : ''}
            />
            <StatCard
              title="Avg. Response Time"
              value={`${stats?.avgResponseTime || 0}m`}
              description="First response time"
              icon={Clock}
            />
            <StatCard
              title="CSAT Score"
              value={stats?.csatScore?.toFixed(1) || '0.0'}
              description="Customer satisfaction"
              icon={Star}
            />
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tickets">Recent Tickets</TabsTrigger>
          <TabsTrigger value="conversations">Live Chats</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Tickets by Priority */}
            <Card>
              <CardHeader>
                <CardTitle>Tickets by Priority</CardTitle>
                <CardDescription>Distribution of open tickets by priority level</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <Skeleton className="h-40" />
                ) : (
                  <div className="space-y-4">
                    {Object.entries(stats?.ticketsByPriority || {}).map(([priority, count]) => (
                      <div key={priority} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={getPriorityBadgeVariant(priority as TicketPriority)}>
                            {priority}
                          </Badge>
                        </div>
                        <span className="font-medium">{count as number}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Conversations by Status */}
            <Card>
              <CardHeader>
                <CardTitle>Conversations by Status</CardTitle>
                <CardDescription>Current state of all support conversations</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <Skeleton className="h-40" />
                ) : (
                  <div className="space-y-4">
                    {Object.entries(stats?.conversationsByStatus || {}).map(([status, count]) => {
                      const badgeInfo = getConversationStatusBadge(status as ConversationStatus);
                      return (
                        <div key={status} className="flex items-center justify-between">
                          <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
                          <span className="font-medium">{count as number}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <Link href="/dashboard/support/tickets">
                  <Button variant="outline" className="w-full h-20 flex-col gap-2">
                    <Ticket className="h-5 w-5" />
                    View All Tickets
                  </Button>
                </Link>
                <Link href="/dashboard/support/conversations">
                  <Button variant="outline" className="w-full h-20 flex-col gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Live Chat Queue
                  </Button>
                </Link>
                <Link href="/dashboard/support/canned-responses">
                  <Button variant="outline" className="w-full h-20 flex-col gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Canned Responses
                  </Button>
                </Link>
                <Link href="/dashboard/support/help-center">
                  <Button variant="outline" className="w-full h-20 flex-col gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Help Center
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Open Tickets</CardTitle>
                <CardDescription>Latest tickets requiring attention</CardDescription>
              </div>
              <Link href="/dashboard/support/tickets">
                <Button variant="ghost" size="sm" className="gap-1">
                  View All
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loadingTickets ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : ticketsData?.data && ticketsData.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ticketsData.data.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">#{ticket.ticketNumber}</TableCell>
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
                        <TableCell>{formatRelativeTime(ticket.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/dashboard/support/tickets/${ticket.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No open tickets</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Waiting for Agent</CardTitle>
                <CardDescription>Conversations waiting to be assigned</CardDescription>
              </div>
              <Link href="/dashboard/support/conversations">
                <Button variant="ghost" size="sm" className="gap-1">
                  View All
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loadingConversations ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : conversationsData?.data && conversationsData.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Last Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Waiting Since</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversationsData.data.map((conversation) => {
                      const statusBadge = getConversationStatusBadge(conversation.status);
                      return (
                        <TableRow key={conversation.id}>
                          <TableCell className="font-medium">
                            {conversation.user?.firstName} {conversation.user?.lastName}
                          </TableCell>
                          <TableCell>{conversation.category || 'General'}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {conversation.lastMessagePreview || 'No messages'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                          </TableCell>
                          <TableCell>{formatRelativeTime(conversation.updatedAt)}</TableCell>
                          <TableCell className="text-right">
                            <Link href={`/dashboard/support/conversations/${conversation.id}`}>
                              <Button variant="ghost" size="sm">
                                Join
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No conversations waiting</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
