'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  Ticket,
  MessageSquare,
  Paperclip,
  Send,
  Reply,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { supportApi } from '@/lib/api/support';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
// Separator component - using hr instead if not available
import { formatDate, getApiErrorMessage } from '@/lib/utils';
import { UserRole, Message } from '@/types/support';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function getRoleBadgeVariant(role?: UserRole) {
  switch (role) {
    case UserRole.SUPPORT:
      return 'info';
    case UserRole.ADMIN:
      return 'warning';
    case UserRole.SUPER_ADMIN:
      return 'destructive';
    default:
      return 'secondary';
  }
}

export default function EmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const { data: email, isLoading } = useQuery({
    queryKey: ['email', resolvedParams.id],
    queryFn: () => supportApi.getEmail(resolvedParams.id),
  });

  const markProcessedMutation = useMutation({
    mutationFn: () => supportApi.markEmailAsProcessed(resolvedParams.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email', resolvedParams.id] });
      queryClient.invalidateQueries({ queryKey: ['support-emails'] });
      queryClient.invalidateQueries({ queryKey: ['email-stats'] });
      toast.success('Email marked as processed');
    },
    onError: (error: unknown) => {
      toast.error('Failed to mark email as processed', {
        description: getApiErrorMessage(error),
      });
    },
  });

  const replyMutation = useMutation({
    mutationFn: () =>
      supportApi.replyToEmail(
        resolvedParams.id,
        replyContent,
        undefined, // Subject is always Re: {originalSubject} - locked on backend
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email', resolvedParams.id] });
      queryClient.invalidateQueries({ queryKey: ['support-emails'] });
      if (email?.conversationId) {
        queryClient.invalidateQueries({
          queryKey: ['conversation', email.conversationId],
        });
      }
      toast.success('Reply sent successfully');
      setReplyOpen(false);
      setReplyContent('');
    },
    onError: (error: unknown) => {
      toast.error('Failed to send reply', {
        description: getApiErrorMessage(error),
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="space-y-6">
        <div>
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Email not found
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Email Details</h1>
            <p className="text-muted-foreground">
              View and manage inbound email
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {email.conversationId && (
            <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
              <DialogTrigger asChild>
                <Button variant="default">
                  <Reply className="mr-2 h-4 w-4" />
                  Reply
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Reply to Email</DialogTitle>
                  <DialogDescription>
                    Send a reply to {email.fromName || email.from}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="reply-subject">Subject</Label>
                    <Input
                      id="reply-subject"
                      value={`Re: ${email.subject || 'No Subject'}`}
                      disabled
                      className="bg-muted cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground">
                      Subject is locked to maintain email threading
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reply-content">Message</Label>
                    <Textarea
                      id="reply-content"
                      placeholder="Type your reply here..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={10}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      HTML is supported. The reply will be sent from{' '}
                      {email.targetEmail || 'support@raverpay.com'}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setReplyOpen(false)}
                    disabled={replyMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => replyMutation.mutate()}
                    disabled={replyMutation.isPending || !replyContent.trim()}
                  >
                    {replyMutation.isPending ? (
                      <>Sending...</>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Reply
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {!email.isProcessed && (
            <Button
              onClick={() => markProcessedMutation.mutate()}
              disabled={markProcessedMutation.isPending}
              variant="outline"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark as Processed
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Email Content */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl">{email.subject}</CardTitle>
                  <CardDescription>
                    From: {email.fromName || email.from} &lt;{email.from}&gt;
                  </CardDescription>
                </div>
                {email.isProcessed ? (
                  <Badge variant="success">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Processed
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <XCircle className="mr-1 h-3 w-3" />
                    Unprocessed
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email Metadata */}
              <div className="grid gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">To:</span>
                  <span className="font-medium">{email.to}</span>
                </div>
                {email.cc && email.cc.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">CC:</span>
                    <span className="font-medium">{email.cc.join(', ')}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Received:</span>
                  <span className="font-medium">
                    {new Intl.DateTimeFormat('en-US', {
                      dateStyle: 'full',
                      timeStyle: 'long',
                    }).format(new Date(email.receivedAt))}
                  </span>
                </div>
              </div>

              <hr className="my-4" />

              {/* Email Body */}
              <div className="space-y-2">
                <h3 className="font-semibold">Message</h3>
                {email.htmlBody ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: email.htmlBody }}
                  />
                ) : email.textBody ? (
                  <div className="whitespace-pre-wrap text-sm">
                    {email.textBody}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No message content available
                  </p>
                )}
              </div>

              {/* Attachments */}
              {email.attachments && email.attachments.length > 0 && (
                <>
                  <hr className="my-4" />
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      Attachments ({email.attachments.length})
                    </h3>
                    <div className="space-y-2">
                      {email.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-2 rounded-md border p-2 text-sm"
                        >
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{attachment.filename}</span>
                          <span className="text-muted-foreground">
                            ({attachment.content_type})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Replies Section */}
          {email.conversation && email.conversation.messages && email.conversation.messages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Reply className="h-4 w-4" />
                  Replies ({email.conversation.messages.length})
                </CardTitle>
                <CardDescription>
                  Email replies sent to {email.from}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {email.conversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className="rounded-lg border p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {message.sender?.firstName} {message.sender?.lastName}
                        </span>
                        {message.sender?.email && (
                          <span className="text-sm text-muted-foreground">
                            ({message.sender.email})
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat('en-US', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        }).format(new Date(message.createdAt))}
                      </span>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      {message.content}
                    </div>
                    {message.metadata?.emailSent && (
                      <Badge variant="success" className="text-xs">
                        <Mail className="mr-1 h-3 w-3" />
                        Email sent
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Processing Error */}
          {email.processingError && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Processing Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-destructive">{email.processingError}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Email Info */}
          <Card>
            <CardHeader>
              <CardTitle>Email Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Target Email</p>
                <p className="font-medium">{email.targetEmail}</p>
              </div>
              {email.targetRole && (
                <div>
                  <p className="text-sm text-muted-foreground">Target Role</p>
                  <Badge variant={getRoleBadgeVariant(email.targetRole)}>
                    {email.targetRole.replace('_', ' ')}
                  </Badge>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Email ID</p>
                <p className="font-mono text-xs">{email.emailId}</p>
              </div>
              {email.messageId && (
                <div>
                  <p className="text-sm text-muted-foreground">Message ID</p>
                  <p className="font-mono text-xs break-all">{email.messageId}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Received At</p>
                <p className="text-sm">
                  {new Intl.DateTimeFormat('en-US', {
                    dateStyle: 'full',
                    timeStyle: 'long',
                  }).format(new Date(email.receivedAt))}
                </p>
              </div>
              {email.processedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Processed At</p>
                  <p className="text-sm">
                    {new Intl.DateTimeFormat('en-US', {
                      dateStyle: 'full',
                      timeStyle: 'long',
                    }).format(new Date(email.processedAt))}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Info */}
          {email.user && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Sender Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">
                    {email.user.firstName} {email.user.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{email.user.email}</p>
                </div>
                {email.user.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{email.user.phone}</p>
                  </div>
                )}
                <Link href={`/dashboard/users/${email.user.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    View User Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Linked Ticket */}
          {email.ticket && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-4 w-4" />
                  Linked Ticket
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Ticket Number</p>
                  <p className="font-medium">#{email.ticket.ticketNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="info">
                    {email.ticket.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Priority</p>
                  <Badge variant="warning">
                    {email.ticket.priority}
                  </Badge>
                </div>
                <Link href={`/dashboard/support/tickets/${email.ticket.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    View Ticket
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Linked Conversation */}
          {email.conversation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Linked Conversation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="info">
                    {email.conversation.status.replace('_', ' ')}
                  </Badge>
                </div>
                <Link
                  href={`/dashboard/support/conversations/${email.conversation.id}`}
                  className="mt-4 block"
                >
                  <Button variant="outline" size="sm" className="w-full">
                    View Conversation
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

