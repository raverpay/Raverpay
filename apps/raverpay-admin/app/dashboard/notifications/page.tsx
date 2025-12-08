'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  Search,
  Trash2,
  Bell,
  Radio,
  Mail,
  Smartphone,
  MessageSquare,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Check,
} from 'lucide-react';
import { AxiosError } from 'axios';

import { notificationsApi, CreateBroadcastDto, NotificationChannel } from '@/lib/api/notifications';
import { usePermissions } from '@/lib/permissions';
import { NotificationType } from '@/types';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

// Notification types that can be selected for broadcast
const broadcastTypes: NotificationType[] = ['SYSTEM', 'PROMOTIONAL', 'SECURITY'];

// All notification types for filtering
const notificationTypes: NotificationType[] = [
  'SYSTEM',
  'TRANSACTION',
  'KYC',
  'SECURITY',
  'PROMOTIONAL',
];

// Available channels for broadcast
const availableChannels: {
  id: NotificationChannel;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    id: 'IN_APP',
    label: 'In-App',
    icon: <Bell className="h-4 w-4" />,
    description: 'Notification appears in the app',
  },
  {
    id: 'PUSH',
    label: 'Push Notification',
    icon: <Smartphone className="h-4 w-4" />,
    description: 'Mobile push notification via Expo',
  },
  {
    id: 'EMAIL',
    label: 'Email',
    icon: <Mail className="h-4 w-4" />,
    description: 'Send email to users',
  },
  {
    id: 'SMS',
    label: 'SMS',
    icon: <MessageSquare className="h-4 w-4" />,
    description: 'Send SMS (additional cost)',
  },
];

const getTypeBadgeVariant = (type: NotificationType) => {
  switch (type) {
    case 'SYSTEM':
      return 'default';
    case 'TRANSACTION':
      return 'secondary';
    case 'SECURITY':
      return 'destructive';
    case 'PROMOTIONAL':
      return 'outline';
    default:
      return 'secondary';
  }
};

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300, 2);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  const [broadcastStep, setBroadcastStep] = useState<1 | 2>(1);
  const [broadcastForm, setBroadcastForm] = useState<CreateBroadcastDto>({
    type: 'SYSTEM',
    title: '',
    message: '',
    channels: ['IN_APP', 'PUSH'],
  });
  const [broadcastResult, setBroadcastResult] = useState<{
    success: boolean;
    message: string;
    eligibleUsers?: number;
    totalQueued?: number;
    details?: {
      totalUsers?: number;
      channels?: string[];
      notificationType?: string;
      rejectionReasons?: Record<string, number>;
    };
  } | null>(null);
  const queryClient = useQueryClient();
  const { canBroadcastNotifications, canDeleteNotifications } = usePermissions();

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', page, debouncedSearch, typeFilter],
    queryFn: () =>
      notificationsApi.getAll({
        page,
        limit: 20,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(typeFilter !== 'all' && { type: typeFilter }),
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['notification-stats'],
    queryFn: () => notificationsApi.getStats(),
  });

  const broadcastMutation = useMutation({
    mutationFn: (data: CreateBroadcastDto) => notificationsApi.broadcast(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
      setBroadcastResult({
        success: true,
        message: response.message,
        eligibleUsers: response.eligibleUsers,
        totalQueued: response.totalQueued,
      });
    },
    onError: (
      error: AxiosError<{ message: string; code?: string; details?: Record<string, unknown> }>,
    ) => {
      const errorData = error.response?.data;
      setBroadcastResult({
        success: false,
        message: errorData?.message || 'Failed to send broadcast. Please try again.',
        details: errorData?.details as {
          totalUsers?: number;
          channels?: string[];
          notificationType?: string;
          rejectionReasons?: Record<string, number>;
        },
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (notificationId: string) => notificationsApi.delete(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
    },
  });

  const handleChannelToggle = (channelId: NotificationChannel) => {
    const currentChannels = broadcastForm.channels || [];
    const isSelected = currentChannels.includes(channelId);

    if (isSelected) {
      // Don't allow removing the last channel
      if (currentChannels.length === 1) return;
      setBroadcastForm({
        ...broadcastForm,
        channels: currentChannels.filter((c) => c !== channelId),
      });
    } else {
      setBroadcastForm({
        ...broadcastForm,
        channels: [...currentChannels, channelId],
      });
    }
  };

  const handleBroadcast = () => {
    if (!broadcastForm.title || !broadcastForm.message) {
      toast.error('Please fill in all fields');

      return;
    }
    if (!broadcastForm.channels || broadcastForm.channels.length === 0) {
      toast.error('Please select at least one channel');
      return;
    }
    setBroadcastResult(null);
    broadcastMutation.mutate(broadcastForm);
  };

  const handleCloseDialog = () => {
    setBroadcastDialogOpen(false);
    setBroadcastResult(null);
    setBroadcastStep(1);
    setBroadcastForm({
      type: 'SYSTEM',
      title: '',
      message: '',
      channels: ['IN_APP', 'PUSH'],
    });
  };

  const canProceedToStep2 = broadcastForm.channels && broadcastForm.channels.length > 0;

  const handleDelete = (notificationId: string) => {
    if (confirm('Are you sure you want to delete this notification?')) {
      deleteMutation.mutate(notificationId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
          <p className="text-muted-foreground">Manage platform notifications</p>
        </div>
        {canBroadcastNotifications && (
          <Dialog
            open={broadcastDialogOpen}
            onOpenChange={(open) => {
              if (!open) handleCloseDialog();
              else setBroadcastDialogOpen(true);
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Radio className="h-4 w-4" />
                Broadcast
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              {/* Step indicator */}
              {!broadcastResult && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                      broadcastStep === 1
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-primary/20 text-primary'
                    }`}
                  >
                    {broadcastStep > 1 ? <Check className="h-4 w-4" /> : '1'}
                  </div>
                  <div className={`w-12 h-0.5 ${broadcastStep > 1 ? 'bg-primary' : 'bg-muted'}`} />
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                      broadcastStep === 2
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    2
                  </div>
                </div>
              )}

              <DialogHeader>
                <DialogTitle>
                  {broadcastResult
                    ? broadcastResult.success
                      ? 'Broadcast Sent'
                      : 'Broadcast Status'
                    : broadcastStep === 1
                      ? 'Choose Delivery Options'
                      : 'Compose Message'}
                </DialogTitle>
                <DialogDescription>
                  {broadcastResult
                    ? ''
                    : broadcastStep === 1
                      ? 'Select the notification type and how you want to reach users.'
                      : 'Write your notification message.'}
                </DialogDescription>
              </DialogHeader>

              {/* Result View */}
              {broadcastResult ? (
                <div className="py-4">
                  <div
                    className={`p-4 rounded-lg ${
                      broadcastResult.success
                        ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'
                        : 'bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {broadcastResult.success ? (
                        <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <h4
                          className={`font-medium ${
                            broadcastResult.success
                              ? 'text-green-800 dark:text-green-200'
                              : 'text-amber-800 dark:text-amber-200'
                          }`}
                        >
                          {broadcastResult.success
                            ? 'Broadcast Sent Successfully!'
                            : 'Unable to Send Broadcast'}
                        </h4>
                        <p
                          className={`text-sm mt-1 ${
                            broadcastResult.success
                              ? 'text-green-700 dark:text-green-300'
                              : 'text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {broadcastResult.message}
                        </p>

                        {broadcastResult.success && (
                          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Eligible Users:</span>{' '}
                              <span className="font-medium">{broadcastResult.eligibleUsers}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Queued:</span>{' '}
                              <span className="font-medium">{broadcastResult.totalQueued}</span>
                            </div>
                          </div>
                        )}

                        {!broadcastResult.success && broadcastResult.details && (
                          <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
                            <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">
                              What you can do:
                            </p>
                            <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1 list-disc list-inside">
                              {broadcastResult.details.rejectionReasons?.optedOutOfCategory ? (
                                <li>
                                  Try a different notification type (users may have opted out of{' '}
                                  {broadcastResult.details.notificationType?.toLowerCase()}{' '}
                                  notifications)
                                </li>
                              ) : null}
                              {broadcastResult.details.rejectionReasons?.noPushToken ? (
                                <li>Include &quot;In-App&quot; channel to reach more users</li>
                              ) : null}
                              <li>Total active users: {broadcastResult.details.totalUsers || 0}</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    {!broadcastResult.success && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setBroadcastResult(null);
                          setBroadcastStep(1);
                        }}
                      >
                        Try Again
                      </Button>
                    )}
                    <Button onClick={handleCloseDialog}>
                      {broadcastResult.success ? 'Done' : 'Close'}
                    </Button>
                  </div>
                </div>
              ) : broadcastStep === 1 ? (
                /* Step 1: Type and Channels */
                <>
                  <div className="space-y-4 py-2">
                    {/* Notification Type */}
                    <div className="space-y-2">
                      <Label htmlFor="type">Notification Type</Label>
                      <Select
                        value={broadcastForm.type}
                        onValueChange={(value) =>
                          setBroadcastForm({ ...broadcastForm, type: value as NotificationType })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {broadcastTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Users must have opted in to receive this type of notification.
                      </p>
                    </div>

                    {/* Channels Selection */}
                    <div className="space-y-2">
                      <Label>Delivery Channels</Label>
                      <div className="grid gap-2">
                        {availableChannels.map((channel) => (
                          <div
                            key={channel.id}
                            className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              broadcastForm.channels?.includes(channel.id)
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => handleChannelToggle(channel.id)}
                          >
                            <Checkbox
                              checked={broadcastForm.channels?.includes(channel.id)}
                              onCheckedChange={() => handleChannelToggle(channel.id)}
                            />
                            <div className="flex items-center gap-2 flex-1">
                              {channel.icon}
                              <span className="font-medium text-sm">{channel.label}</span>
                              {channel.id === 'SMS' && (
                                <Badge variant="outline" className="text-xs">
                                  Paid
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={handleCloseDialog}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => setBroadcastStep(2)}
                      disabled={!canProceedToStep2}
                      className="gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                /* Step 2: Compose Message */
                <>
                  <div className="space-y-4 py-2">
                    {/* Summary of selections */}
                    <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
                      <Badge variant="secondary">{broadcastForm.type}</Badge>
                      {broadcastForm.channels?.map((ch) => (
                        <Badge key={ch} variant="outline">
                          {ch.replace('_', '-')}
                        </Badge>
                      ))}
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={broadcastForm.title}
                        onChange={(e) =>
                          setBroadcastForm({ ...broadcastForm, title: e.target.value })
                        }
                        placeholder="e.g., Important Update"
                      />
                    </div>

                    {/* Message */}
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <textarea
                        id="message"
                        className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={broadcastForm.message}
                        onChange={(e) =>
                          setBroadcastForm({ ...broadcastForm, message: e.target.value })
                        }
                        placeholder="Write your message here..."
                      />
                      <p className="text-xs text-muted-foreground">
                        {broadcastForm.message.length}/500 characters
                      </p>
                    </div>
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setBroadcastStep(1)} className="gap-1">
                      <ChevronLeft className="h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      onClick={handleBroadcast}
                      disabled={
                        broadcastMutation.isPending ||
                        !broadcastForm.title ||
                        !broadcastForm.message
                      }
                    >
                      {broadcastMutation.isPending ? 'Sending...' : 'Send Broadcast'}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unread</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.unreadCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Read Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.readRate || '0'}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Notifications</CardTitle>
          <CardDescription>View and manage all platform notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {notificationTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
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
          ) : notificationsData?.data && notificationsData.data.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      {canDeleteNotifications && (
                        <TableHead className="text-right">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notificationsData.data.map((notification) => (
                      <TableRow key={notification.id}>
                        <TableCell>
                          <Badge
                            variant={
                              getTypeBadgeVariant(notification.type) as
                                | 'default'
                                | 'secondary'
                                | 'destructive'
                                | 'outline'
                            }
                          >
                            {notification.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{notification.title}</TableCell>
                        <TableCell>
                          <span className="line-clamp-2 max-w-[200px]">{notification.message}</span>
                        </TableCell>
                        <TableCell>
                          {notification.user ? (
                            <span className="text-sm">
                              {notification.user.firstName} {notification.user.lastName}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {notification.isRead ? (
                            <Badge variant="secondary">Read</Badge>
                          ) : (
                            <Badge variant="default">Unread</Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(notification.createdAt)}</TableCell>
                        {canDeleteNotifications && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(notification.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {notificationsData.meta && (
                <Pagination
                  currentPage={page}
                  totalPages={notificationsData.meta.totalPages}
                  totalItems={notificationsData.meta.total}
                  itemsPerPage={notificationsData.meta.limit}
                  onPageChange={setPage}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No notifications found</p>
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
