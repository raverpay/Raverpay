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

  const { data: kyc, isPending: isLoading } = useQuery({
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

  // Determine status from boolean flags and existence of BVN/NIN
  const getBVNStatus = () => {
    if (!kyc.user?.bvn) return 'NOT_SUBMITTED';
    if (kyc.user.bvnVerified) return 'APPROVED';
    return 'PENDING'; // BVN exists but not verified yet
  };

  const getNINStatus = () => {
    if (!kyc.user?.nin) return 'NOT_SUBMITTED';
    if (kyc.user.ninVerified) return 'APPROVED';
    return 'PENDING'; // NIN exists but not verified yet
  };

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

  const bvnStatus = getBVNStatus();
  const ninStatus = getNINStatus();
  const canApproveBVN = bvnStatus === 'PENDING';
  const canApproveNIN = ninStatus === 'PENDING';

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
                  <p className="text-lg font-bold">
                    {kyc.user?.kycTier?.replace('TIER_', 'TIER ') || 'TIER 0'}
                  </p>
                </div>
                {kyc.user?.dateOfBirth && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                    <p className="text-sm">{formatDate(kyc.user.dateOfBirth)}</p>
                  </div>
                )}
                {kyc.user?.gender && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Gender</p>
                    <p className="text-sm">{kyc.user.gender}</p>
                  </div>
                )}
                {kyc.user?.address && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <p className="text-sm">
                      {kyc.user.address}
                      {kyc.user.city && `, ${kyc.user.city}`}
                      {kyc.user.state && `, ${kyc.user.state}`}
                    </p>
                  </div>
                )}
                <Link href={`/dashboard/users/${kyc.user?.id || resolvedParams.userId}`}>
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
              <div>{getKYCStatusBadge(bvnStatus)}</div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">NIN Verification</p>
              <div>{getKYCStatusBadge(ninStatus)}</div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground">Account Created</p>
              <p className="text-sm">
                {kyc.user?.createdAt ? formatDate(kyc.user.createdAt) : 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BVN Details */}
      {kyc.user?.bvn && (
        <Card>
          <CardHeader>
            <CardTitle>BVN Information</CardTitle>
            <CardDescription>Bank Verification Number details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">BVN</p>
                <p className="text-sm font-mono text-muted-foreground">
                  {kyc.user.bvn && kyc.user.bvn.length > 20
                    ? `${kyc.user.bvn.substring(0, 20)}...`
                    : kyc.user.bvn || 'N/A'}
                  <span className="block text-xs mt-1">(Encrypted)</span>
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="mt-1">{getKYCStatusBadge(bvnStatus)}</div>
              </div>
            </div>

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
      {kyc.user?.nin && (
        <Card>
          <CardHeader>
            <CardTitle>NIN Information</CardTitle>
            <CardDescription>National Identification Number details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">NIN</p>
                <p className="text-sm font-mono text-muted-foreground">
                  {kyc.user.nin && kyc.user.nin.length > 20
                    ? `${kyc.user.nin.substring(0, 20)}...`
                    : kyc.user.nin || 'N/A'}
                  <span className="block text-xs mt-1">(Encrypted)</span>
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="mt-1">{getKYCStatusBadge(ninStatus)}</div>
              </div>
            </div>

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
