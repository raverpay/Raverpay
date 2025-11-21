'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, User, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

import { kycApi } from '@/lib/api/kyc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, getApiErrorMessage } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function KYCDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [bvnRejectReason, setBvnRejectReason] = useState('');
  const [ninRejectReason, setNinRejectReason] = useState('');

  const { data: kyc, isLoading } = useQuery({
    queryKey: ['kyc', resolvedParams.userId],
    queryFn: () => kycApi.getById(resolvedParams.userId),
  });

  const approveBvnMutation = useMutation({
    mutationFn: () => kycApi.approveBVN(resolvedParams.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc', resolvedParams.userId] });
      queryClient.invalidateQueries({ queryKey: ['kyc'] });
      toast.success('BVN verification approved successfully');
    },
    onError: (error: unknown) => {
      toast.error('Failed to approve BVN', {
        description: getApiErrorMessage(error, 'Unable to approve BVN'),
      });
    },
  });

  const rejectBvnMutation = useMutation({
    mutationFn: (reason: string) => kycApi.rejectBVN(resolvedParams.userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc', resolvedParams.userId] });
      queryClient.invalidateQueries({ queryKey: ['kyc'] });
      toast.success('BVN verification rejected');
      setBvnRejectReason('');
    },
    onError: (error: unknown) => {
      toast.error('Failed to reject BVN', {
        description: getApiErrorMessage(error, 'Unable to reject BVN'),
      });
    },
  });

  const approveNinMutation = useMutation({
    mutationFn: () => kycApi.approveNIN(resolvedParams.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc', resolvedParams.userId] });
      queryClient.invalidateQueries({ queryKey: ['kyc'] });
      toast.success('NIN verification approved successfully');
    },
    onError: (error: unknown) => {
      toast.error('Failed to approve NIN', {
        description: getApiErrorMessage(error, 'Unable to approve NIN'),
      });
    },
  });

  const rejectNinMutation = useMutation({
    mutationFn: (reason: string) => kycApi.rejectNIN(resolvedParams.userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc', resolvedParams.userId] });
      queryClient.invalidateQueries({ queryKey: ['kyc'] });
      toast.success('NIN verification rejected');
      setNinRejectReason('');
    },
    onError: (error: unknown) => {
      toast.error('Failed to reject NIN', {
        description: getApiErrorMessage(error, 'Unable to reject NIN'),
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (!kyc) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <p className="text-muted-foreground">KYC data not found</p>
        <Button onClick={() => router.back()} variant="outline" className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const getKYCStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="warning" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Pending Review
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">Not Submitted</Badge>;
    }
  };

  const canApproveBVN = kyc.bvnVerificationStatus === 'PENDING';
  const canApproveNIN = kyc.ninVerificationStatus === 'PENDING';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">KYC Review</h2>
          <p className="text-muted-foreground">
            {kyc.user?.firstName} {kyc.user?.lastName}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>Basic user details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {kyc.user && (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                  <p className="text-sm font-medium">
                    {kyc.user.firstName} {kyc.user.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm">{kyc.user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-sm">{kyc.user.phone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Account Status</p>
                  <div className="mt-1">
                    <Badge variant={kyc.user.status === 'ACTIVE' ? 'success' : 'destructive'}>
                      {kyc.user.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current KYC Tier</p>
                  <p className="text-lg font-bold">Tier {kyc.kycTier || 1}</p>
                </div>
                <Link href={`/dashboard/users/${kyc.userId}`}>
                  <Button variant="outline" size="sm" className="gap-2 w-full">
                    <User className="h-4 w-4" />
                    View User Profile
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        {/* KYC Overview */}
        <Card>
          <CardHeader>
            <CardTitle>KYC Status Overview</CardTitle>
            <CardDescription>Current verification status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">BVN Verification</p>
              <div>{getKYCStatusBadge(kyc.bvnVerificationStatus || 'NOT_SUBMITTED')}</div>
              {kyc.bvnVerifiedAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Verified: {formatDate(kyc.bvnVerifiedAt)}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">NIN Verification</p>
              <div>{getKYCStatusBadge(kyc.ninVerificationStatus || 'NOT_SUBMITTED')}</div>
              {kyc.ninVerifiedAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Verified: {formatDate(kyc.ninVerifiedAt)}
                </p>
              )}
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground">Submitted</p>
              <p className="text-sm">{kyc.createdAt ? formatDate(kyc.createdAt) : 'N/A'}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
              <p className="text-sm">{kyc.updatedAt ? formatDate(kyc.updatedAt) : 'N/A'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BVN Details */}
      {kyc.bvn && (
        <Card>
          <CardHeader>
            <CardTitle>BVN Information</CardTitle>
            <CardDescription>Bank Verification Number details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">BVN</p>
                <p className="text-sm font-mono">{kyc.bvn}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="mt-1">
                  {getKYCStatusBadge(kyc.bvnVerificationStatus || 'NOT_SUBMITTED')}
                </div>
              </div>
            </div>

            {kyc.bvnData && Object.keys(kyc.bvnData).length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">BVN Data</p>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">
                  {JSON.stringify(kyc.bvnData, null, 2)}
                </pre>
              </div>
            )}

            {canApproveBVN && (
              <div className="pt-4 border-t space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    onClick={() => approveBvnMutation.mutate()}
                    disabled={approveBvnMutation.isPending}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve BVN
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Reject BVN</Label>
                  <p className="text-sm text-muted-foreground">
                    Provide a reason for rejecting this BVN verification
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Reason for rejection..."
                      value={bvnRejectReason}
                      onChange={(e) => setBvnRejectReason(e.target.value)}
                    />
                    <Button
                      variant="destructive"
                      onClick={() => bvnRejectReason && rejectBvnMutation.mutate(bvnRejectReason)}
                      disabled={!bvnRejectReason || rejectBvnMutation.isPending}
                      className="gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* NIN Details */}
      {kyc.nin && (
        <Card>
          <CardHeader>
            <CardTitle>NIN Information</CardTitle>
            <CardDescription>National Identification Number details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">NIN</p>
                <p className="text-sm font-mono">{kyc.nin}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="mt-1">
                  {getKYCStatusBadge(kyc.ninVerificationStatus || 'NOT_SUBMITTED')}
                </div>
              </div>
            </div>

            {kyc.ninData && Object.keys(kyc.ninData).length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">NIN Data</p>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">
                  {JSON.stringify(kyc.ninData, null, 2)}
                </pre>
              </div>
            )}

            {canApproveNIN && (
              <div className="pt-4 border-t space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    onClick={() => approveNinMutation.mutate()}
                    disabled={approveNinMutation.isPending}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve NIN
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Reject NIN</Label>
                  <p className="text-sm text-muted-foreground">
                    Provide a reason for rejecting this NIN verification
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Reason for rejection..."
                      value={ninRejectReason}
                      onChange={(e) => setNinRejectReason(e.target.value)}
                    />
                    <Button
                      variant="destructive"
                      onClick={() => ninRejectReason && rejectNinMutation.mutate(ninRejectReason)}
                      disabled={!ninRejectReason || rejectNinMutation.isPending}
                      className="gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
