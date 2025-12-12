'use client';

import { useState, use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Clock, Calendar, MessageSquare, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

import { supportApi } from '@/lib/api/support';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolution, setResolution] = useState('');

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', resolvedParams.id],
    queryFn: () => supportApi.getTicket(resolvedParams.id),
  });

  const assignMutation = useMutation({
    mutationFn: () => supportApi.assignTicket(resolvedParams.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', resolvedParams.id] });
      toast.success('Ticket assigned to you');
    },
    onError: (error: unknown) => {
      toast.error('Failed to assign ticket', {
        description: getApiErrorMessage(error),
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: TicketStatus) => supportApi.updateTicketStatus(resolvedParams.id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', resolvedParams.id] });
      toast.success('Ticket status updated');
    },
    onError: (error: unknown) => {
      toast.error('Failed to update status', {
        description: getApiErrorMessage(error),
      });
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: (priority: TicketPriority) =>
      supportApi.updateTicketPriority(resolvedParams.id, priority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', resolvedParams.id] });
      toast.success('Ticket priority updated');
    },
    onError: (error: unknown) => {
      toast.error('Failed to update priority', {
        description: getApiErrorMessage(error),
      });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (resolution: string) => supportApi.resolveTicket(resolvedParams.id, resolution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', resolvedParams.id] });
      setShowResolveDialog(false);
      toast.success('Ticket resolved');
    },
    onError: (error: unknown) => {
      toast.error('Failed to resolve ticket', {
        description: getApiErrorMessage(error),
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Ticket not found</p>
        <Button variant="link" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  const isResolved =
    ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Ticket #{ticket.ticketNumber}</h2>
            <p className="text-muted-foreground">{ticket.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!ticket.assignedAgentId && (
            <Button onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending}>
              Assign to Me
            </Button>
          )}
          {!isResolved && (
            <Button variant="outline" onClick={() => setShowResolveDialog(true)} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Resolve
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Ticket Details */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Description</div>
                <p className="whitespace-pre-wrap">{ticket.description}</p>
              </div>

              {ticket.resolution && (
                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                  <div className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                    Resolution
                  </div>
                  <p className="text-green-700 dark:text-green-300 whitespace-pre-wrap">
                    {ticket.resolution}
                  </p>
                  {ticket.resolvedAt && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                      Resolved {formatRelativeTime(ticket.resolvedAt)}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversation Link */}
          {ticket.conversationId && (
            <Card>
              <CardHeader>
                <CardTitle>Related Conversation</CardTitle>
                <CardDescription>View the chat history for this ticket</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={`/dashboard/support/conversations/${ticket.conversationId}`}>
                  <Button variant="outline" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    View Conversation
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Priority */}
          <Card>
            <CardHeader>
              <CardTitle>Status & Priority</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-2">Status</div>
                <Select
                  value={ticket.status}
                  onValueChange={(value) => updateStatusMutation.mutate(value as TicketStatus)}
                  disabled={updateStatusMutation.isPending || isResolved}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TicketStatus.OPEN}>Open</SelectItem>
                    <SelectItem value={TicketStatus.IN_PROGRESS}>In Progress</SelectItem>
                    <SelectItem value={TicketStatus.RESOLVED}>Resolved</SelectItem>
                    <SelectItem value={TicketStatus.CLOSED}>Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-2">Priority</div>
                <Select
                  value={ticket.priority}
                  onValueChange={(value) => updatePriorityMutation.mutate(value as TicketPriority)}
                  disabled={updatePriorityMutation.isPending || isResolved}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TicketPriority.LOW}>Low</SelectItem>
                    <SelectItem value={TicketPriority.MEDIUM}>Medium</SelectItem>
                    <SelectItem value={TicketPriority.HIGH}>High</SelectItem>
                    <SelectItem value={TicketPriority.URGENT}>Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-2">Category</div>
                <Badge variant="outline">{ticket.category}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                User Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground">Name</div>
                <div className="font-medium">
                  {ticket.user?.firstName} {ticket.user?.lastName}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="font-medium">{ticket.user?.email}</div>
              </div>
              {ticket.user?.phone && (
                <div>
                  <div className="text-xs text-muted-foreground">Phone</div>
                  <div className="font-medium">{ticket.user?.phone}</div>
                </div>
              )}
              <Link href={`/dashboard/users/${ticket.userId}`}>
                <Button variant="outline" size="sm" className="w-full mt-2">
                  View User Profile
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              {ticket.assignedAgent ? (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {ticket.assignedAgent.firstName} {ticket.assignedAgent.lastName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {ticket.assignedAgent.email}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Unassigned</p>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Created: {formatDate(ticket.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Updated: {formatRelativeTime(ticket.updatedAt)}</span>
              </div>
              {ticket.resolvedAt && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Resolved: {formatDate(ticket.resolvedAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Ticket</DialogTitle>
            <DialogDescription>Provide a resolution summary for this ticket.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Describe how the issue was resolved..."
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => resolveMutation.mutate(resolution)}
              disabled={!resolution.trim() || resolveMutation.isPending}
            >
              Resolve Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
