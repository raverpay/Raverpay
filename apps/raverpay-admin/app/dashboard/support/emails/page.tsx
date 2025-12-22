'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Search, Mail, CheckCircle2, XCircle, Filter, PenSquare, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';

import { supportApi, GetEmailsParams } from '@/lib/api/support';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { formatRelativeTime, getApiErrorMessage } from '@/lib/utils';
import { UserRole } from '@/types/support';
import { useAuthStore } from '@/lib/auth-store';

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

export default function EmailsPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300, 2);
  const [targetEmailFilter, setTargetEmailFilter] = useState<string>('all');
  const [targetRoleFilter, setTargetRoleFilter] = useState<string>('all');
  const [processedFilter, setProcessedFilter] = useState<string>('all');

  // Get allowed emails based on user role
  const getAllowedEmails = () => {
    if (!currentUser) return ['support@raverpay.com'];
    
    switch (currentUser.role) {
      case 'SUPPORT':
        return ['support@raverpay.com'];
      case 'ADMIN':
        return ['support@raverpay.com', 'admin@raverpay.com'];
      case 'SUPER_ADMIN':
        return [
          'support@raverpay.com',
          'admin@raverpay.com',
          'promotions@raverpay.com',
          'security@raverpay.com',
          'compliance@raverpay.com',
          'partnerships@raverpay.com',
        ];
      default:
        return ['support@raverpay.com'];
    }
  };

  const allowedEmails = getAllowedEmails();

  const queryParams: GetEmailsParams = {
    page,
    limit: 20,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(targetEmailFilter !== 'all' && { targetEmail: targetEmailFilter }),
    ...(targetRoleFilter !== 'all' && {
      targetRole: targetRoleFilter as UserRole,
    }),
    ...(processedFilter !== 'all' && {
      isProcessed: processedFilter === 'processed',
    }),
  };

  const { data: emailsData, isLoading } = useQuery({
    queryKey: [
      'support-emails',
      page,
      debouncedSearch,
      targetEmailFilter,
      targetRoleFilter,
      processedFilter,
    ],
    queryFn: () => supportApi.getEmails(queryParams),
  });

  const { data: stats } = useQuery({
    queryKey: ['email-stats'],
    queryFn: supportApi.getEmailStats,
  });

  const markProcessedMutation = useMutation({
    mutationFn: (emailId: string) => supportApi.markEmailAsProcessed(emailId),
    onSuccess: () => {
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

  // Compose email state
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeContent, setComposeContent] = useState('');
  const [composeFromEmail, setComposeFromEmail] = useState(allowedEmails[0] || 'support@raverpay.com');
  const [composeCc, setComposeCc] = useState('');
  const [composeBcc, setComposeBcc] = useState('');
  const [composeAttachments, setComposeAttachments] = useState<File[]>([]);

  const composeMutation = useMutation({
    mutationFn: () =>
      supportApi.sendFreshEmail({
        to: composeTo,
        subject: composeSubject,
        content: composeContent,
        fromEmail: composeFromEmail,
        cc: composeCc ? composeCc.split(',').map((e) => e.trim()).filter(Boolean) : undefined,
        bcc: composeBcc ? composeBcc.split(',').map((e) => e.trim()).filter(Boolean) : undefined,
        attachments: composeAttachments.length > 0 ? composeAttachments : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-emails'] });
      toast.success('Email sent successfully');
      setComposeOpen(false);
      // Reset form
      setComposeTo('');
      setComposeSubject('');
      setComposeContent('');
      setComposeFromEmail(allowedEmails[0] || 'support@raverpay.com');
      setComposeCc('');
      setComposeBcc('');
      setComposeAttachments([]);
    },
    onError: (error: unknown) => {
      toast.error('Failed to send email', {
        description: getApiErrorMessage(error),
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Inbox</h1>
          <p className="text-muted-foreground">
            Manage and view inbound emails from various team addresses
          </p>
        </div>
        <Dialog
          open={composeOpen}
          onOpenChange={(open) => {
            setComposeOpen(open);
            if (!open) {
              // Reset form when dialog closes
              setComposeTo('');
              setComposeSubject('');
              setComposeContent('');
              setComposeFromEmail(allowedEmails[0] || 'support@raverpay.com');
              setComposeCc('');
              setComposeBcc('');
              setComposeAttachments([]);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <PenSquare className="mr-2 h-4 w-4" />
              Compose Email
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Compose New Email</DialogTitle>
              <DialogDescription>Send a fresh email from the admin dashboard</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="compose-from">From</Label>
                  <Select value={composeFromEmail} onValueChange={setComposeFromEmail}>
                    <SelectTrigger id="compose-from">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedEmails.map((email) => (
                        <SelectItem key={email} value={email}>
                          {email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {currentUser?.role === 'SUPPORT' && 'As a Support agent, you can only send from support@raverpay.com'}
                    {currentUser?.role === 'ADMIN' && 'As an Admin, you can send from support@ and admin@ emails'}
                    {currentUser?.role === 'SUPER_ADMIN' && 'As a Super Admin, you can send from all team emails'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="compose-to">To *</Label>
                  <Input
                    id="compose-to"
                    type="email"
                    placeholder="recipient@example.com"
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="compose-subject">Subject *</Label>
                <Input
                  id="compose-subject"
                  placeholder="Email subject"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="compose-cc">CC (comma-separated)</Label>
                  <Input
                    id="compose-cc"
                    placeholder="cc1@example.com, cc2@example.com"
                    value={composeCc}
                    onChange={(e) => setComposeCc(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="compose-bcc">BCC (comma-separated)</Label>
                  <Input
                    id="compose-bcc"
                    placeholder="bcc1@example.com, bcc2@example.com"
                    value={composeBcc}
                    onChange={(e) => setComposeBcc(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="compose-content">Message *</Label>
                <Textarea
                  id="compose-content"
                  placeholder="Type your message here..."
                  value={composeContent}
                  onChange={(e) => setComposeContent(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">HTML is supported</p>
              </div>

              {/* Attachments */}
              <div className="space-y-2">
                <Label>Attachments (optional)</Label>
                <input
                  type="file"
                  id="compose-attachments"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setComposeAttachments((prev) => [...prev, ...files]);
                    // Reset input so same file can be selected again
                    e.target.value = '';
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('compose-attachments')?.click()}
                  disabled={composeMutation.isPending}
                >
                  <Paperclip className="mr-2 h-4 w-4" />
                  Add Attachments
                </Button>

                {/* Selected files */}
                {composeAttachments.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {composeAttachments.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm bg-muted"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {file.name.length > 60 ? file.name.slice(0, 60) + '...' : file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {file.type.length > 60 ? file.type.slice(0, 60) + '...' : file.type}{' '}
                              · {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setComposeAttachments((prev) => prev.filter((_, i) => i !== index));
                          }}
                          disabled={composeMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setComposeOpen(false)}
                disabled={composeMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => composeMutation.mutate()}
                disabled={composeMutation.isPending || !composeTo.trim() || !composeSubject.trim() || !composeContent.trim()}
              >
                {composeMutation.isPending ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Email
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unprocessed</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unprocessed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total - stats.unprocessed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">By Role</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byRole.length}</div>
              <p className="text-xs text-muted-foreground">Different roles</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter emails by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search emails..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={targetEmailFilter} onValueChange={setTargetEmailFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Target Email" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Emails</SelectItem>
                <SelectItem value="support@raverpay.com">Support</SelectItem>
                <SelectItem value="admin@raverpay.com">Admin</SelectItem>
                <SelectItem value="promotions@raverpay.com">Promotions</SelectItem>
                <SelectItem value="security@raverpay.com">Security</SelectItem>
                <SelectItem value="compliance@raverpay.com">Compliance</SelectItem>
                <SelectItem value="partnerships@raverpay.com">Partnerships</SelectItem>
              </SelectContent>
            </Select>
            <Select value={targetRoleFilter} onValueChange={setTargetRoleFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Target Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value={UserRole.SUPPORT}>Support</SelectItem>
                <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                <SelectItem value={UserRole.SUPER_ADMIN}>Super Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={processedFilter} onValueChange={setProcessedFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="unprocessed">Unprocessed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Emails Table */}
      <Card>
        <CardHeader>
          <CardTitle>Emails</CardTitle>
          <CardDescription>{emailsData?.meta?.total || 0} total emails</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !emailsData?.data || emailsData.data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No emails found</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailsData.data.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{email.fromName || email.from}</div>
                          <div className="text-sm text-muted-foreground">{email.from}</div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">{email.subject}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {email.targetEmail}
                      </TableCell>
                      <TableCell>
                        {email.targetRole && (
                          <Badge variant={getRoleBadgeVariant(email.targetRole)}>
                            {email.targetRole.replace('_', ' ')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>{formatRelativeTime(email.receivedAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/dashboard/support/emails/${email.id}`}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                          {!email.isProcessed && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markProcessedMutation.mutate(email.id)}
                              disabled={markProcessedMutation.isPending}
                            >
                              Mark Processed
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {emailsData.meta && (
                <div className="mt-4">
                  <Pagination
                    currentPage={page}
                    totalPages={emailsData.meta.totalPages}
                    totalItems={emailsData.meta.total}
                    itemsPerPage={emailsData.meta.limit}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
