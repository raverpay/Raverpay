'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Calendar, User, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import apiClient from '@/lib/api-client';
import { formatRelativeTime } from '@/lib/utils';

interface OutboundEmail {
  id: string;
  resendEmailId: string | null;
  sentBy: string;
  fromEmail: string;
  to: string;
  cc: string[];
  bcc: string[];
  subject: string;
  content: string;
  attachments: Array<{ filename: string; size: number; contentType: string }> | null;
  inReplyTo: string | null;
  inboundEmailId: string | null;
  conversationId: string | null;
  userId: string | null;
  status: string;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  failureReason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  sender: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  inboundEmail: {
    id: string;
    subject: string;
    from: string;
  } | null;
  conversation: {
    id: string;
    status: string;
  } | null;
}

async function getOutboundEmailById(id: string): Promise<OutboundEmail> {
  const response = await apiClient.get<OutboundEmail>(`/admin/emails/outbound/${id}`);
  return response.data;
}

export default function SentEmailDetailPage() {
  const params = useParams();
  const router = useRouter();
  const emailId = params.id as string;

  const { data: email, isLoading } = useQuery({
    queryKey: ['outbound-email', emailId],
    queryFn: () => getOutboundEmailById(emailId),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Mail className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Email not found</h3>
        <p className="text-muted-foreground mb-4">
          The email you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button onClick={() => router.push('/dashboard/support/emails')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Emails
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sent Email Details</h1>
            <p className="text-muted-foreground">View details of sent email</p>
          </div>
        </div>
        <Badge
          variant={
            email.status === 'SENT'
              ? 'default'
              : email.status === 'DELIVERED'
                ? 'secondary'
                : email.status === 'FAILED'
                  ? 'destructive'
                  : 'outline'
          }
        >
          {email.status}
        </Badge>
      </div>

      {/* Email Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>{email.subject}</CardTitle>
          <CardDescription>
            Sent {formatRelativeTime(email.createdAt)}
            {email.deliveredAt && ` • Delivered ${formatRelativeTime(email.deliveredAt)}`}
            {email.openedAt && ` • Opened ${formatRelativeTime(email.openedAt)}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Metadata */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">From:</span>
                <Badge variant="outline">{email.fromEmail}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">To:</span>
                <span>{email.to}</span>
              </div>
              {email.cc && email.cc.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">CC:</span>
                  <span>{email.cc.join(', ')}</span>
                </div>
              )}
              {email.bcc && email.bcc.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">BCC:</span>
                  <span>{email.bcc.join(', ')}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Sent by:</span>
                <span>
                  {email.sender.firstName} {email.sender.lastName} ({email.sender.email})
                </span>
              </div>
              {email.user && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Recipient:</span>
                  <span>
                    {email.user.firstName} {email.user.lastName} ({email.user.email})
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Sent:</span>
                <span>{new Date(email.createdAt).toLocaleString()}</span>
              </div>
              {email.resendEmailId && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Resend ID:</span>
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {email.resendEmailId}
                  </code>
                </div>
              )}
            </div>
          </div>

          {/* Reply Context */}
          {email.inboundEmail && (
            <div className="rounded-lg border p-4 bg-muted/50">
              <p className="text-sm font-medium mb-2">In reply to:</p>
              <p className="text-sm text-muted-foreground">
                <strong>From:</strong> {email.inboundEmail.from}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Subject:</strong> {email.inboundEmail.subject}
              </p>
            </div>
          )}

          {/* Attachments */}
          {email.attachments &&
            Array.isArray(email.attachments) &&
            email.attachments.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attachments ({email.attachments.length})
                </h3>
                <div className="space-y-2">
                  {email.attachments.map(
                    (
                      attachment: { filename: string; size: number; contentType: string },
                      index: number,
                    ) => (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{attachment.filename}</p>
                            <p className="text-xs text-muted-foreground">
                              {attachment.contentType} • {(attachment.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

          {/* Email Content */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Message</h3>
            <div
              className="prose prose-sm max-w-none rounded-lg border p-4 bg-muted/30"
              dangerouslySetInnerHTML={{ __html: email.content }}
            />
          </div>

          {/* Delivery Status */}
          {email.failureReason && (
            <div className="rounded-lg border border-destructive/50 p-4 bg-destructive/10">
              <p className="text-sm font-medium text-destructive mb-2">Delivery Failed</p>
              <p className="text-sm text-muted-foreground">{email.failureReason}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
