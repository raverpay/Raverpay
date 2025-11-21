'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Search, Eye, FileCheck, Clock, XCircle } from 'lucide-react';

import { kycApi } from '@/lib/api/kyc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { KycPendingResponse, KycRejectedResponse, KycQueueEntry } from '@/types';

type KycResponse = KycPendingResponse | KycRejectedResponse;
type VerificationGroup = keyof KycPendingResponse | keyof KycRejectedResponse;
type KycListItem = KycQueueEntry & { verificationType: VerificationGroup };

export default function KYCPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'rejected'>('pending');

  const { data: pendingData, isLoading: pendingLoading } = useQuery<KycPendingResponse>({
    queryKey: ['kyc-pending'],
    queryFn: () => kycApi.getPending(),
  });

  const { data: rejectedData, isLoading: rejectedLoading } = useQuery<KycRejectedResponse>({
    queryKey: ['kyc-rejected'],
    queryFn: () => kycApi.getRejected(),
  });

  const { data: stats } = useQuery({
    queryKey: ['kyc-stats'],
    queryFn: () => kycApi.getStatistics(),
  });

  console.log({ stats });

  const isLoading = activeTab === 'pending' ? pendingLoading : rejectedLoading;
  const currentData: KycResponse | undefined = activeTab === 'pending' ? pendingData : rejectedData;

  const groupedEntries: Array<[VerificationGroup, KycQueueEntry[]]> = currentData
    ? (Object.entries(currentData) as Array<[VerificationGroup, KycQueueEntry[]]>)
    : [];

  const filteredData: KycListItem[] = groupedEntries.flatMap(([type, users]) =>
    (users ?? [])
      .filter((user) => {
        if (!search) {
          return true;
        }

        const normalizedSearch = search.toLowerCase();
        return (
          user.email?.toLowerCase().includes(normalizedSearch) ||
          user.firstName?.toLowerCase().includes(normalizedSearch) ||
          user.lastName?.toLowerCase().includes(normalizedSearch)
        );
      })
      .map((user) => ({ ...user, verificationType: type })),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">KYC Verification</h2>
        <p className="text-muted-foreground">Review and manage user identity verifications</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats?.pendingCount?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.approvedCount?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.rejectedCount?.toLocaleString() || '0'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approval Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.approvalRate ? parseFloat(stats?.approvalRate)?.toFixed(1) : '0'}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle>KYC Submissions</CardTitle>
          <CardDescription>Review user identity verification submissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-2 border-b">
            <Button
              variant={activeTab === 'pending' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('pending')}
              className="rounded-b-none"
            >
              <Clock className="h-4 w-4 mr-2" />
              Pending
            </Button>
            <Button
              variant={activeTab === 'rejected' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('rejected')}
              className="rounded-b-none"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rejected
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by user name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredData.length > 0 ? (
            <div className="grid gap-4">
              {filteredData.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant="outline">
                        {user.verificationType === 'pendingBVN' ||
                        user.verificationType === 'rejectedBVN'
                          ? 'BVN'
                          : 'NIN'}
                      </Badge>
                      <Badge variant="outline">Tier {user.kycTier || 0}</Badge>
                      {user.daysPending && (
                        <span className="text-xs text-muted-foreground">
                          {user.daysPending} days pending
                        </span>
                      )}
                      {user.bvn && (
                        <span className="text-xs text-muted-foreground font-mono">
                          BVN: {user.bvn}
                        </span>
                      )}
                      {user.nin && (
                        <span className="text-xs text-muted-foreground font-mono">
                          NIN: {user.nin}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link href={`/dashboard/kyc/${user.id}`}>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Eye className="h-4 w-4" />
                      Review
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No {activeTab} KYC submissions found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search ? 'Try adjusting your search query' : 'All caught up!'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
