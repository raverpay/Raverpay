'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Ban, CheckCircle, Shield } from 'lucide-react';
import { toast } from 'sonner';

import { usersApi } from '@/lib/api/users';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, KYCBadge, RoleBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, getApiErrorMessage } from '@/lib/utils';
import { Label } from '@/components/ui/label';

export default function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', resolvedParams.userId],
    queryFn: () => usersApi.getById(resolvedParams.userId),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: string; reason?: string }) =>
      usersApi.updateStatus(resolvedParams.userId, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', resolvedParams.userId] });
      toast.success('User status updated successfully');
    },
    onError: (error: unknown) => {
      toast.error('Failed to update status', {
        description: getApiErrorMessage(error, 'Unable to update status'),
      });
    },
  });

  const updateKYCMutation = useMutation({
    mutationFn: ({ tier, notes }: { tier: string; notes?: string }) =>
      usersApi.updateKYCTier(resolvedParams.userId, tier, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', resolvedParams.userId] });
      toast.success('KYC tier updated successfully');
    },
    onError: (error: unknown) => {
      toast.error('Failed to update KYC tier', {
        description: getApiErrorMessage(error, 'Unable to update KYC tier'),
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: (role: string) => usersApi.updateRole(resolvedParams.userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', resolvedParams.userId] });
      toast.success('User role updated successfully');
    },
    onError: (error: unknown) => {
      toast.error('Failed to update role', {
        description: getApiErrorMessage(error, 'Unable to update role'),
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <p className="text-muted-foreground">User not found</p>
        <Button onClick={() => router.back()} variant="outline" className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {user.firstName} {user.lastName}
          </h2>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>Personal and account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">User ID</p>
                <p className="text-sm font-mono">{user.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Role</p>
                <div className="mt-1">
                  <RoleBadge role={user.role} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-sm">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                  {user.emailVerified ? '✓ Verified' : '✗ Not verified'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <p className="text-sm">{user.phone}</p>
                <p className="text-xs text-muted-foreground">
                  {user.phoneVerified ? '✓ Verified' : '✗ Not verified'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="mt-1">
                  <StatusBadge status={user.status} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">KYC Tier</p>
                <div className="mt-1">
                  <KYCBadge tier={user.kycTier} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Joined</p>
                <p className="text-sm">{formatDate(user.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="text-sm">{formatDate(user.updatedAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KYC Information */}
        <Card>
          <CardHeader>
            <CardTitle>KYC Information</CardTitle>
            <CardDescription>Identity verification details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">BVN</p>
              <p className="text-sm font-mono">
                {user.bvn ? `****${user.bvn.slice(-4)}` : 'Not provided'}
              </p>
              <p className="text-xs text-muted-foreground">
                {user.bvnVerified ? '✓ Verified' : '✗ Not verified'}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">NIN</p>
              <p className="text-sm font-mono">
                {user.nin ? `****${user.nin.slice(-4)}` : 'Not provided'}
              </p>
              <p className="text-xs text-muted-foreground">
                {user.ninVerified ? '✓ Verified' : '✗ Not verified'}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Current KYC Tier</p>
              <div className="mt-1">
                <KYCBadge tier={user.kycTier} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {user.kycTier === 'TIER_0' && 'Basic - ₦50k limit'}
                {user.kycTier === 'TIER_1' && 'Email/Phone - ₦300k limit'}
                {user.kycTier === 'TIER_2' && 'BVN Verified - ₦5M limit'}
                {user.kycTier === 'TIER_3' && 'Full KYC - Unlimited'}
              </p>
            </div>

            {user.deletionRequested && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                <p className="text-sm font-medium text-destructive">Account Deletion Requested</p>
                {user.deletionRequestedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(user.deletionRequestedAt)}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage user account and permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Update Status */}
          <div className="space-y-2">
            <Label>Update Status</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  updateStatusMutation.mutate({
                    status: 'ACTIVE',
                    reason: 'Manually activated by admin',
                  })
                }
                disabled={updateStatusMutation.isPending || user.status === 'ACTIVE'}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Activate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  updateStatusMutation.mutate({
                    status: 'SUSPENDED',
                    reason: 'Manually suspended by admin',
                  })
                }
                disabled={updateStatusMutation.isPending || user.status === 'SUSPENDED'}
              >
                <Ban className="h-4 w-4 mr-2" />
                Suspend
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  updateStatusMutation.mutate({
                    status: 'BANNED',
                    reason: 'Manually banned by admin',
                  })
                }
                disabled={updateStatusMutation.isPending || user.status === 'BANNED'}
              >
                <Ban className="h-4 w-4 mr-2" />
                Ban
              </Button>
            </div>
          </div>

          {/* Update KYC Tier */}
          <div className="space-y-2">
            <Label>Update KYC Tier</Label>
            <div className="flex gap-2">
              {['TIER_0', 'TIER_1', 'TIER_2', 'TIER_3'].map((tier) => (
                <Button
                  key={tier}
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateKYCMutation.mutate({
                      tier,
                      notes: `Manually updated to ${tier} by admin`,
                    })
                  }
                  disabled={updateKYCMutation.isPending || user.kycTier === tier}
                >
                  {tier}
                </Button>
              ))}
            </div>
          </div>

          {/* Update Role */}
          <div className="space-y-2">
            <Label>Update Role</Label>
            <div className="flex gap-2">
              {['USER', 'SUPPORT', 'ADMIN'].map((role) => (
                <Button
                  key={role}
                  variant="outline"
                  size="sm"
                  onClick={() => updateRoleMutation.mutate(role)}
                  disabled={updateRoleMutation.isPending || user.role === role}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  {role}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
