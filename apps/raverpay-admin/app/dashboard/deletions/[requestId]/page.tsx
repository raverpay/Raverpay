'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, User, Calendar, FileText } from 'lucide-react';

import { deletionsApi } from '@/lib/api/deletions';
import { usePermissions } from '@/lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

export default function DeletionDetailPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canApproveDeletions } = usePermissions();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);

  const { data: request, isLoading } = useQuery({
    queryKey: ['deletion', requestId],
    queryFn: () => deletionsApi.getById(requestId),
  });

  const approveMutation = useMutation({
    mutationFn: () => deletionsApi.approve(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deletion', requestId] });
      queryClient.invalidateQueries({ queryKey: ['deletions'] });
      setApproveDialogOpen(false);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => deletionsApi.reject(requestId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deletion', requestId] });
      queryClient.invalidateQueries({ queryKey: ['deletions'] });
      setRejectDialogOpen(false);
      setRejectionReason('');
    },
  });

  const handleApprove = () => {
    setApproveDialogOpen(true);
  };

  const handleApproveConfirm = () => {
    approveMutation.mutate();
  };

  const handleReject = () => {
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (rejectionReason.trim()) {
      rejectMutation.mutate(rejectionReason.trim());
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Deletion request not found</p>
        <Button variant="link" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/deletions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Deletion Request</h2>
            <p className="text-muted-foreground">Request ID: {request.id}</p>
          </div>
        </div>
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
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-lg">
                {request.user?.firstName} {request.user?.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-lg">{request.user?.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Phone</p>
              <p className="text-lg">{request.user?.phone || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">User ID</p>
              <p className="text-sm font-mono">{request.userId}</p>
            </div>
            <Link href={`/dashboard/users/${request.userId}`}>
              <Button variant="outline" className="w-full mt-2">
                View User Profile
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Request Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Request Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Reason</p>
              <p className="text-lg">{request.reason}</p>
            </div>
            {request.customReason && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Additional Details</p>
                <p className="text-lg">{request.customReason}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Requested At</p>
              <p className="text-lg">{formatDate(request.createdAt)}</p>
            </div>
            {request.scheduledFor && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Scheduled For</p>
                <p className="text-lg">{formatDate(request.scheduledFor)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Information */}
        {(request.reviewedBy || request.rejectionReason) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Review Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {request.reviewedBy && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reviewed By</p>
                  <p className="text-lg">{request.reviewedBy}</p>
                </div>
              )}
              {request.reviewedAt && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reviewed At</p>
                  <p className="text-lg">{formatDate(request.reviewedAt)}</p>
                </div>
              )}
              {request.rejectionReason && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rejection Reason</p>
                  <p className="text-lg text-red-600">{request.rejectionReason}</p>
                </div>
              )}
              {request.completedAt && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed At</p>
                  <p className="text-lg">{formatDate(request.completedAt)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {canApproveDeletions && request.status === 'PENDING' && (
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Review and process this deletion request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full gap-2"
                variant="default"
                onClick={handleApprove}
                disabled={approveMutation.isPending}
              >
                <CheckCircle className="h-4 w-4" />
                Approve Deletion
              </Button>
              <Button
                className="w-full gap-2"
                variant="destructive"
                onClick={handleReject}
                disabled={rejectMutation.isPending}
              >
                <XCircle className="h-4 w-4" />
                Reject Request
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Approval Confirmation Dialog */}
      <ConfirmDialog
        open={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        title="Approve Deletion Request"
        description="Are you sure you want to approve this deletion request? This action cannot be undone."
        confirmText="Approve"
        cancelText="Cancel"
        onConfirm={handleApproveConfirm}
        variant="danger"
        icon="warning"
        isLoading={approveMutation.isPending}
      />

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Deletion Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this deletion request. This reason will be
              visible to the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason('');
              }}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
